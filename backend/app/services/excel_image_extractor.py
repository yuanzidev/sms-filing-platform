"""Extract cell-embedded images from .xlsx files and upload to object storage."""
import hashlib
import io
import re
import uuid
import xml.etree.ElementTree as ET
import zipfile
from dataclasses import dataclass
from datetime import date
from io import BytesIO

from openpyxl import load_workbook

from app.core.storage import get_storage

_MIME_MAP = {
    "png": "image/png", "jpeg": "image/jpeg", "jpg": "image/jpeg",
    "gif": "image/gif", "bmp": "image/bmp", "webp": "image/webp", "tiff": "image/tiff",
}
_EXT_MAP = {
    "png": ".png", "jpeg": ".jpg", "jpg": ".jpg",
    "gif": ".gif", "bmp": ".bmp", "webp": ".webp", "tiff": ".tiff",
}
_DISPIMG_RE = re.compile(
    r'(?:_xlfn\.)?DISPIMG\s*\(\s*(?:&quot;|["\'])([^"\'&]+)(?:&quot;|["\'])', re.IGNORECASE
)


@dataclass
class ExtractedImage:
    data: bytes
    mime_type: str
    original_name: str
    row_index: int
    col_index: int
    field_name: str | None = None


def _col_letter_to_index(letters: str) -> int:
    idx = 0
    for ch in letters.upper():
        idx = idx * 26 + (ord(ch) - ord("A") + 1)
    return idx - 1


def _cell_ref_to_rc(ref: str) -> tuple[int, int]:
    m = re.match(r"^([A-Z]+)(\d+)$", ref)
    if not m:
        return -1, -1
    return int(m.group(2)) - 1, _col_letter_to_index(m.group(1))


def extract_cell_images_from_xlsx(
    content: bytes,
    headers: list[str] | None = None,
    header_row_count: int = 1,
    data_row_indices: list[int] | None = None,
) -> list[ExtractedImage]:
    """Extract images embedded in cells via DISPIMG() (Place in Cell feature)."""
    zf = zipfile.ZipFile(BytesIO(content))

    # Parse cellimages.xml → {name: rId}
    name_to_rid: dict[str, str] = {}
    if "xl/cellimages.xml" in zf.namelist():
        ns_s = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
        ns_a = "http://schemas.openxmlformats.org/drawingml/2006/main"
        ns_r = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
        try:
            tree = ET.parse(zf.open("xl/cellimages.xml"))
            for ci in tree.iter():
                if not ci.tag.endswith("}cellImage"):
                    continue
                nv_name = None
                blip_embed = None
                for el in ci.iter():
                    if el.tag.endswith("}cNvPr"):
                        nv_name = el.get("name", "")
                    elif el.tag == f"{{{ns_a}}}blip":
                        blip_embed = el.get(f"{{{ns_r}}}embed", "")
                if nv_name and blip_embed:
                    name_to_rid[nv_name] = blip_embed
        except Exception:
            pass

    # Parse cellimages.xml.rels → {rId: media_path}
    rid_to_media: dict[str, str] = {}
    rels_path = "xl/_rels/cellimages.xml.rels"
    if rels_path in zf.namelist():
        try:
            tree = ET.parse(zf.open(rels_path))
            rel_ns = ""
            rt = tree.getroot().tag
            if rt.startswith("{"):
                rel_ns = rt[:rt.index("}")+1]
            for rel in tree.iter(f"{rel_ns}Relationship"):
                rid = rel.get("Id", "")
                target = rel.get("Target", "")
                if rid and target:
                    if target.startswith("../"):
                        target = "xl/" + target[3:]
                    elif not target.startswith("xl/"):
                        target = "xl/" + target
                    rid_to_media[rid] = target
        except Exception:
            pass

    # Find sheet XML and parse DISPIMG formulas
    sheet_files = [n for n in zf.namelist() if re.match(r"xl/worksheets/sheet\d+\.xml", n)]
    if not sheet_files:
        zf.close()
        return []

    sheet_xml = zf.read(sheet_files[0])
    try:
        sheet_root = ET.fromstring(sheet_xml)
    except Exception:
        zf.close()
        return []

    s_ns = ""
    root_tag = sheet_root.tag
    if root_tag.startswith("{"):
        s_ns = root_tag[:root_tag.index("}")+1]

    row_elements = list(sheet_root.iter(f"{s_ns}row"))
    if not row_elements:
        row_elements = [sheet_root]

    extracted: list[ExtractedImage] = []
    for row_el in row_elements:
        for cell_el in row_el.iter(f"{s_ns}c"):
            cell_ref = cell_el.get("r", "")
            if not cell_ref:
                continue
            f_el = cell_el.find(f"{s_ns}f")
            if f_el is None or not f_el.text:
                continue
            m = _DISPIMG_RE.search(f_el.text)
            if not m:
                continue
            image_name = m.group(1)
            rid = name_to_rid.get(image_name) or image_name
            media_path = rid_to_media.get(rid, "")
            if not media_path or media_path not in zf.namelist():
                continue

            row_0based, col_0based = _cell_ref_to_rc(cell_ref)
            data_row = row_0based - header_row_count
            if data_row < 0:
                continue

            try:
                raw_bytes = zf.read(media_path)
            except Exception:
                continue

            suffix = (media_path.rsplit(".", 1)[-1] if "." in media_path else "png").lower()
            mime_type = _MIME_MAP.get(suffix, "image/png")
            ext = _EXT_MAP.get(suffix, ".png")
            name = f"image_row{data_row+1}_col{col_0based+1}{ext}"

            field_name = None
            if headers and col_0based < len(headers):
                field_name = headers[col_0based]

            extracted.append(ExtractedImage(
                data=raw_bytes, mime_type=mime_type, original_name=name,
                row_index=data_row, col_index=col_0based, field_name=field_name,
            ))

    zf.close()

    # Remap Excel row numbers to data list indices (empty rows are skipped in the data list)
    if data_row_indices:
        excel_row_to_data_idx = {
            excel_row: data_idx for data_idx, excel_row in enumerate(data_row_indices)
        }
        for img in extracted:
            # img.row_index 是 0-based 数据行号，先还原为 Excel 行号（1-based）再查映射
            excel_row = img.row_index + header_row_count + 1
            if excel_row in excel_row_to_data_idx:
                img.row_index = excel_row_to_data_idx[excel_row]
            else:
                img.row_index = -1  # mark for removal
        extracted = [img for img in extracted if img.row_index >= 0]

    return extracted


def extract_images_from_xlsx(
    content: bytes, header_row_count: int = 1, data_row_indices: list[int] | None = None
) -> list[ExtractedImage]:
    """Extract floating images anchored to cells (legacy compatibility)."""
    wb = load_workbook(BytesIO(content), read_only=False)
    ws = wb.active
    extracted: list[ExtractedImage] = []

    for img in getattr(ws, "_images", []):
        try:
            anchor = img.anchor
            col_0based = anchor._from.col
            row_0based = anchor._from.row

            data_row = row_0based - header_row_count
            if data_row < 0:
                continue

            raw_bytes = img._data()
            fmt = (img.format or "png").lower()
            mime_type = _MIME_MAP.get(fmt, "image/png")
            ext = _EXT_MAP.get(fmt, ".png")
            name = f"image_row{data_row+1}_col{col_0based+1}{ext}"

            extracted.append(ExtractedImage(
                data=raw_bytes, mime_type=mime_type, original_name=name,
                row_index=data_row, col_index=col_0based,
            ))
        except Exception:
            continue

    wb.close()

    # Remap Excel row numbers to data list indices (empty rows are skipped in the data list)
    if data_row_indices:
        excel_row_to_data_idx = {
            excel_row: data_idx for data_idx, excel_row in enumerate(data_row_indices)
        }
        for img in extracted:
            # img.row_index 是 0-based 数据行号，先还原为 Excel 行号（1-based）再查映射
            excel_row = img.row_index + header_row_count + 1
            if excel_row in excel_row_to_data_idx:
                img.row_index = excel_row_to_data_idx[excel_row]
            else:
                img.row_index = -1  # mark for removal
        extracted = [img for img in extracted if img.row_index >= 0]

    return extracted


def upload_import_images(
    images: list[ExtractedImage],
    objects: list,
    entity_type: str,
    session,
) -> tuple[int, list[str]]:
    from app.models import FileAttachment

    storage = get_storage()
    uploaded = 0
    warnings: list[str] = []

    for img in images:
        if img.row_index >= len(objects):
            warnings.append(f"第{img.row_index+1}行的图片无法匹配到数据记录，已跳过")
            continue

        entity_id = objects[img.row_index].id
        storage_key = (
            f"{entity_type}_images/"
            f"{date.today().isoformat()}/"
            f"{uuid.uuid4().hex}_{img.original_name}"
        )

        storage.upload(storage_key, img.data, img.mime_type)

        fa = FileAttachment(
            original_name=img.original_name,
            stored_path=storage_key,
            file_size=len(img.data),
            mime_type=img.mime_type,
            md5_hash=hashlib.md5(img.data).hexdigest(),
            entity_type=entity_type,
            entity_id=entity_id,
            field_name=img.field_name,
        )
        session.add(fa)
        uploaded += 1

    return uploaded, warnings


def inject_cell_images(xlsx_bytes: bytes, cell_images: dict[str, bytes]) -> bytes:
    """Inject cell-embedded images (DISPIMG) into an existing xlsx file.

    Args:
        xlsx_bytes: The original xlsx file as bytes
        cell_images: Dict mapping {cell_ref: image_bytes}, e.g. {"B2": <bytes>}

    Returns:
        Modified xlsx bytes with cellimages injected
    """
    in_zf = zipfile.ZipFile(BytesIO(xlsx_bytes), "r")
    out_buf = BytesIO()
    out_zf = zipfile.ZipFile(out_buf, "w", zipfile.ZIP_DEFLATED)

    image_ids: dict[str, str] = {}
    media_files: dict[str, tuple[bytes, str]] = {}

    for i, (cell_ref, img_bytes) in enumerate(cell_images.items()):
        image_id = f"ID_SAMPLE_{i+1}"
        image_ids[cell_ref] = image_id
        ext = _detect_image_ext(img_bytes)
        media_path = f"media/sample_{i+1}.{ext}"
        media_files[media_path] = (img_bytes, _MIME_MAP.get(ext, "image/png"))

    # Build cellimages.xml
    ci_xml = _build_cellimages_xml(image_ids)
    ci_rels_xml = _build_cellimages_rels(image_ids)

    sheet1_path = None
    sheet1_content = None

    for item in in_zf.infolist():
        if item.filename == "xl/cellimages.xml":
            continue
        if item.filename == "xl/_rels/cellimages.xml.rels":
            continue
        if item.filename == "[Content_Types].xml":
            ct_xml = in_zf.read(item).decode("utf-8")
            if "cellimage" not in ct_xml.lower():
                ct_xml = _inject_content_type(ct_xml)
            out_zf.writestr(item, ct_xml)
            continue
        if re.match(r"xl/worksheets/sheet\d+\.xml", item.filename):
            sheet1_path = item.filename
            sheet1_content = in_zf.read(item).decode("utf-8")
            out_zf.writestr(item, _inject_dispimg_formulas(sheet1_content, image_ids))
            continue
        if re.match(r"xl/_rels/sheet\d+\.xml\.rels", item.filename):
            continue
        out_zf.writestr(item, in_zf.read(item))

    out_zf.writestr("xl/cellimages.xml", ci_xml)
    out_zf.writestr("xl/_rels/cellimages.xml.rels", ci_rels_xml)
    for media_path, (img_bytes, _) in media_files.items():
        out_zf.writestr(f"xl/{media_path}", img_bytes)

    # Add relationship from sheet to cellimages if needed
    if sheet1_path:
        sheet_name = sheet1_path.rsplit("/", 1)[-1].replace(".xml", "")
        rels_path = f"xl/worksheets/_rels/{sheet_name}.xml.rels"
        rels_xml = _build_sheet_cellimage_rels(image_ids)
        out_zf.writestr(rels_path, rels_xml)

    in_zf.close()
    out_zf.close()
    return out_buf.getvalue()


def _detect_image_ext(data: bytes) -> str:
    if data[:4] == b"\x89PNG":
        return "png"
    if data[:2] == b"\xff\xd8":
        return "jpeg"
    if data[:4] == b"GIF8":
        return "gif"
    if data[:2] == b"BM":
        return "bmp"
    if data[:4] == b"RIFF":
        return "webp"
    return "png"


def _build_cellimages_xml(image_ids: dict[str, str]) -> str:
    ci_ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
    a_ns = "http://schemas.openxmlformats.org/drawingml/2006/main"
    r_ns = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"

    lines = [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        f'<cellImages xmlns="{ci_ns}" xmlns:a="{a_ns}" xmlns:r="{r_ns}">',
    ]
    for cell_ref, image_id in image_ids.items():
        lines.extend([
            f"<cellImage>",
            f"<pic>",
            f'<nvPicPr><cNvPr name="{image_id}"/></nvPicPr>',
            f"<blipFill><a:blip r:embed=\"rId_{image_id}\"/>",
            f"<a:stretch><a:fillRect/></a:stretch></blipFill>",
            f"</pic>",
            f"</cellImage>",
        ])
    lines.append("</cellImages>")
    return "\n".join(lines)


def _build_cellimages_rels(image_ids: dict[str, str]) -> str:
    lines = [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    ]
    for i, (cell_ref, image_id) in enumerate(image_ids.items(), 1):
        ext = "png"
        lines.append(
            f'<Relationship Id="rId_{image_id}" '
            f'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" '
            f'Target="../media/sample_{i}.{ext}"/>'
        )
    lines.append("</Relationships>")
    return "\n".join(lines)


def _build_sheet_cellimage_rels(image_ids: dict[str, str]) -> str:
    lines = [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    ]
    for i in range(len(image_ids)):
        lines.append(
            f'<Relationship Id="rId{100+i}" '
            f'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/cellImage" '
            f'Target="../cellimages.xml"/>'
        )
    lines.append("</Relationships>")
    return "\n".join(lines)


def _inject_content_type(ct_xml: str) -> str:
    if "<Override PartName=\"/xl/cellimages.xml\"" not in ct_xml:
        ct_xml = ct_xml.replace(
            "</Types>",
            '<Override PartName="/xl/cellimages.xml" '
            'ContentType="application/vnd.ms-excel.cellimage+xml"/>\n</Types>',
        )
    return ct_xml


def _inject_dispimg_formulas(sheet_xml: str, image_ids: dict[str, str]) -> str:
    root = ET.fromstring(sheet_xml)
    ns = root.tag[:root.tag.index("}")+1] if "}" in root.tag else ""
    sheet_data = root.find(f"{ns}sheetData")

    if sheet_data is None:
        return sheet_xml

    for cell_ref, image_id in image_ids.items():
        dispimg = f'_xlfn.DISPIMG("{image_id}",1)'
        m = re.match(r"^([A-Z]+)(\d+)$", cell_ref)
        if not m:
            continue
        col_letter, row_num = m.group(1), m.group(2)

        # Find or create the row
        row_el = None
        for r in sheet_data.findall(f"{ns}row"):
            if r.get("r") == row_num:
                row_el = r
                break
        if row_el is None:
            row_el = ET.SubElement(sheet_data, f"{ns}row", {"r": row_num})

        # Check if cell already exists
        existing = None
        for c in row_el.findall(f"{ns}c"):
            if c.get("r") == cell_ref:
                existing = c
                break

        if existing is not None:
            el = existing
            for child in list(el):
                el.remove(child)
        else:
            el = ET.SubElement(row_el, f"{ns}c", {"r": cell_ref})

        f_el = ET.SubElement(el, f"{ns}f")
        f_el.text = dispimg
        v_el = ET.SubElement(el, f"{ns}v")
        v_el.text = "0"

    result = ET.tostring(root, encoding="unicode")
    return result
