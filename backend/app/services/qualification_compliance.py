"""备用资质自动划入主库的保守判定规则。"""


def auto_compliance_reason(
    signature: str | None, enterprise_name: str | None, signature_type: str | None
) -> str | None:
    """仅自动认可企业全称或完整去掉“有限公司”的规范简称。"""
    if not signature or not enterprise_name or "商标" in (signature_type or ""):
        return None

    name = enterprise_name.strip()
    value = signature.strip()
    if value.startswith("【") and value.endswith("】"):
        value = value[1:-1].strip()
    if not value or not name:
        return None
    if value == name:
        return "企业全称"
    if name.endswith("有限公司") and value == name[: -len("有限公司")]:
        return "规范简称"
    return None
