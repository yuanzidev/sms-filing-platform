"""Tests for Excel image extraction row-index remapping (empty rows skipped in data list)."""

import io
import xml.etree.ElementTree as ET
import zipfile

from openpyxl import Workbook
from openpyxl.drawing.image import Image as XLImage
from PIL import Image as PILImage

from app.services.excel_image_extractor import (
    extract_cell_images_from_xlsx,
    extract_images_from_xlsx,
    inject_cell_images,
)


def _png_bytes() -> bytes:
    pil = PILImage.new("RGB", (10, 10), color="red")
    buf = io.BytesIO()
    pil.save(buf, format="PNG")
    return buf.getvalue()


def _make_shared_formula(
    xlsx: bytes, master_ref: str, follower_refs: list[str], shared_index: str = "0"
) -> bytes:
    """Convert DISPIMG cells into one shared-formula group like Excel/WPS."""
    source = io.BytesIO(xlsx)
    output = io.BytesIO()
    refs = [master_ref, *follower_refs]

    with (
        zipfile.ZipFile(source, "r") as input_archive,
        zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as output_archive,
    ):
        for item in input_archive.infolist():
            data = input_archive.read(item)
            if item.filename == "xl/worksheets/sheet1.xml":
                root = ET.fromstring(data)
                ns = root.tag[: root.tag.index("}") + 1] if "}" in root.tag else ""
                cells = {
                    cell.get("r", ""): cell
                    for cell in root.iter(f"{ns}c")
                    if cell.get("r") in refs
                }
                master_formula = cells[master_ref].find(f"{ns}f")
                assert master_formula is not None
                master_formula.set("t", "shared")
                master_formula.set("si", shared_index)
                master_formula.set("ref", f"{master_ref}:{follower_refs[-1]}")

                for cell_ref in follower_refs:
                    cell = cells[cell_ref]
                    for child in list(cell):
                        cell.remove(child)
                    formula = ET.SubElement(
                        cell,
                        f"{ns}f",
                        {"t": "shared", "si": shared_index},
                    )
                    assert formula.text is None
                    ET.SubElement(cell, f"{ns}v").text = "0"
                data = ET.tostring(root, encoding="utf-8", xml_declaration=True)
            output_archive.writestr(item, data)

    return output.getvalue()


def test_extract_images_from_xlsx_remaps_row_indices() -> None:
    """浮动图片：Excel 行 2/4 有数据（行 3 为空），图片应映射到数据列表索引 0/1。"""
    png = _png_bytes()
    wb = Workbook()
    ws = wb.active
    ws["A1"] = "运营商"
    ws["B1"] = "授权书图片"
    ws["A2"] = "中国移动"
    ws["B2"] = "img"
    # 行 3 为空（数据列表中跳过）
    ws["A4"] = "中国联通"
    ws["B4"] = "img"

    ws.add_image(XLImage(io.BytesIO(png)), "B2")
    ws.add_image(XLImage(io.BytesIO(png)), "B4")

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    images = extract_images_from_xlsx(buf.getvalue(), data_row_indices=[2, 4])
    assert sorted(img.row_index for img in images) == [0, 1]


def test_extract_images_from_xlsx_sets_field_name_from_headers() -> None:
    """浮动图片：按锚点列匹配表头，保存附件时能知道图片字段。"""
    png = _png_bytes()
    wb = Workbook()
    ws = wb.active
    ws["A1"] = "运营商"
    ws["B1"] = "授权书图片"
    ws["A2"] = "中国移动"
    ws["B2"] = "img"
    ws.add_image(XLImage(io.BytesIO(png)), "B2")

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    images = extract_images_from_xlsx(
        buf.getvalue(),
        headers=["运营商", "授权书图片"],
        data_row_indices=[2],
    )
    assert [img.field_name for img in images] == ["授权书图片"]


def test_extract_images_from_xlsx_drops_images_on_empty_rows() -> None:
    """浮动图片：位于空行（不在 data_row_indices 中）的图片应被移除。"""
    png = _png_bytes()
    wb = Workbook()
    ws = wb.active
    ws["A1"] = "运营商"
    ws["B1"] = "授权书图片"
    ws["A2"] = "中国移动"
    ws["B2"] = "img"
    # 行 3 为空（数据列表中跳过），但其上挂了一张浮动图
    ws["B3"] = "img"

    ws.add_image(XLImage(io.BytesIO(png)), "B2")
    ws.add_image(XLImage(io.BytesIO(png)), "B3")

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    images = extract_images_from_xlsx(buf.getvalue(), data_row_indices=[2])
    assert [img.row_index for img in images] == [0]


def test_extract_cell_images_from_xlsx_remaps_row_indices() -> None:
    """单元格内嵌图片：Excel 行 2/4 有数据（行 3 为空），图片应映射到数据列表索引 0/1。"""
    png = _png_bytes()
    wb = Workbook()
    ws = wb.active
    ws["A1"] = "运营商"
    ws["B1"] = "授权书图片"
    ws["A2"] = "中国移动"
    ws["B2"] = "img"
    # 行 3 为空（数据列表中跳过）
    ws["A4"] = "中国联通"
    ws["B4"] = "img"

    buf = io.BytesIO()
    wb.save(buf)
    xlsx = inject_cell_images(buf.getvalue(), {"B2": png, "B4": png})

    images = extract_cell_images_from_xlsx(
        xlsx, headers=["运营商", "授权书图片"], data_row_indices=[2, 4]
    )
    assert sorted(img.row_index for img in images) == [0, 1]
    assert {img.field_name for img in images} == {"授权书图片"}


def test_extract_cell_images_resolves_reused_shared_formula_with_multiple_columns() -> (
    None
):
    """复用图片的共享公式及同行其他图片列都应逐单元格建立附件关联。"""
    png = _png_bytes()
    wb = Workbook()
    ws = wb.active
    ws.append(["子端口号", "签名举证附件", "引流链接举证"])
    ws.append(["2200001", "img", "img"])
    ws.append(["2200002", "img", "img"])

    buf = io.BytesIO()
    wb.save(buf)
    xlsx = inject_cell_images(
        buf.getvalue(),
        {"B2": png, "B3": png, "C2": png, "C3": png},
    )
    xlsx = _make_shared_formula(xlsx, "B2", ["B3"])

    images = extract_cell_images_from_xlsx(
        xlsx,
        headers=["子端口号", "签名举证附件", "引流链接举证"],
        data_row_indices=[2, 3],
    )

    assert [(img.row_index, img.field_name) for img in images] == [
        (0, "签名举证附件"),
        (0, "引流链接举证"),
        (1, "签名举证附件"),
        (1, "引流链接举证"),
    ]
