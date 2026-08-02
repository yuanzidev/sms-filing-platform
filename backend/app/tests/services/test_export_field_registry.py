"""Tests for export field registry."""
from app.services.export_field_registry import (
    REGISTRY, all_fields, get_field, field_map, field_source,
)


def test_registry_non_empty():
    assert len(REGISTRY) > 30


def test_field_map_contains_signature_type():
    """用户问题 10 重点字段必须存在"""
    fm = field_map()
    assert fm.get("signature_type") == "签名类型/来源"
    assert fm.get("sms_signature") == "短信签名"
    assert fm.get("specific_usage") == "具体用途"
    assert fm.get("diversion_number") == "引流号码"
    assert fm.get("link_address") == "引流链接"


def test_field_source_dispatch():
    assert field_source("carrier") == "port"
    assert field_source("enterprise_name") == "qualification"
    assert field_source("cert_image") == "image_qualification"
    assert field_source("auth_image") == "image_port"
    assert field_source("nonexistent_field") is None


def test_get_field_returns_object():
    f = get_field("sms_signature")
    assert f is not None
    assert f.name == "sms_signature"
    assert f.label == "短信签名"
    assert f.group == "签名与模板"


def test_no_duplicate_names():
    names = [f.name for f in REGISTRY]
    assert len(names) == len(set(names)), "registry 字段名重复"


def test_proof_image_fields_in_registry():
    """举证图片字段必须在注册表中"""
    fm = field_map()
    assert fm.get("signature_proof") == "签名举证附件"
    assert fm.get("diversion_number_proof") == "引流号码举证附件"
    assert fm.get("diversion_link_proof") == "引流链接举证"
    assert fm.get("handler_scene_photo") == "经办人现场照片"


def test_business_fields_source_is_qualification():
    """business_* 字段实际在 qualification_info 模型上，source 必须是 qualification"""
    for name in ("business_attribute", "business_type", "business_subtype", "specific_usage"):
        assert field_source(name) == "qualification", f"{name} 应来自 qualification"


def test_port_enterprise_name_in_registry():
    fm = field_map()
    assert fm.get("port_enterprise_name") == "主端口备案公司"
    source = field_source("port_enterprise_name")
    assert source == "port"


def test_qualification_enterprise_name_unchanged():
    f = get_field("enterprise_name")
    assert f is not None
    assert f.label == "企业名称"
    assert f.source == "qualification"
