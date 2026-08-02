"""Export field metadata registry — single source of truth for exportable fields."""
from dataclasses import dataclass


@dataclass(frozen=True)
class ExportField:
    name: str
    label: str
    source: str  # "qualification" | "port" | "image_qualification" | "image_port"
    group: str
    description: str = ""


REGISTRY: list[ExportField] = [
    # ── 端口信息（来源 port） ──
    ExportField("carrier", "运营商", "port", "端口信息"),
    ExportField("operation_type", "操作类型", "port", "端口信息"),
    ExportField("main_port_number", "主端口号", "port", "端口信息"),
    ExportField("sub_port_number", "子端口号", "port", "端口信息"),
    ExportField("port_range", "码号使用范围", "port", "端口信息"),
    ExportField("province", "接入省", "port", "端口信息"),
    ExportField("city", "接入地市", "port", "端口信息"),
    ExportField("port_type", "端口类型", "port", "端口信息"),
    ExportField("port_activation_date", "端口入网时间", "port", "端口信息"),
    ExportField("allow_self_extension", "是否允许自行扩展", "port", "端口信息"),
    ExportField("carrier_room", "运营商接入机房及设备", "port", "端口信息"),
    ExportField("enterprise_room", "企业接入机房及设备", "port", "端口信息"),
    ExportField("has_authorization", "是否具有授权书", "port", "端口信息"),
    ExportField("auth_start_date", "授权开始日期", "port", "端口信息"),
    ExportField("auth_end_date", "授权结束日期", "port", "端口信息"),
    ExportField("authorization_letter", "授权书", "port", "端口信息"),
    ExportField("group_code", "集团编码", "port", "端口信息"),
    ExportField("region", "所属地区", "port", "端口信息"),
    ExportField("other_room_description", "其他接入机房说明", "port", "端口信息"),
    ExportField("is_green_channel", "是否绿色通道", "port", "端口信息"),
    ExportField("blacklist_whitelist_type", "黑白名单类型", "port", "端口信息"),
    ExportField("audit_form", "端口审核表", "port", "端口信息"),
    ExportField("customer_type", "客户类型", "port", "端口信息"),
    ExportField("port_enterprise_name", "主端口备案公司", "port", "端口信息"),

    # ── 业务信息（来源 qualification：这些字段实际在 qualification_info 模型上） ──
    ExportField("business_attribute", "业务属性", "qualification", "业务信息"),
    ExportField("business_type", "业务类型", "qualification", "业务信息"),
    ExportField("business_subtype", "业务细类", "qualification", "业务信息"),
    ExportField("specific_usage", "具体用途", "qualification", "业务信息"),

    # ── 签名与模板（来源 qualification） ──
    ExportField("sms_signature", "短信签名", "qualification", "签名与模板"),
    ExportField("signature_type", "签名类型/来源", "qualification", "签名与模板"),
    ExportField("signature_verified", "是否签名校验", "qualification", "签名与模板"),
    ExportField("is_gateway_signature", "是否网关签名", "qualification", "签名与模板"),
    ExportField("sms_template_content", "短信模板内容", "qualification", "签名与模板"),
    ExportField("template_has_variable", "模板是否包含变量", "qualification", "签名与模板"),
    ExportField("template_param_type", "模板参数类型", "qualification", "签名与模板"),
    ExportField("template_param_length", "模板参数长度", "qualification", "签名与模板"),

    # ── 资质信息（来源 qualification） ──
    ExportField("enterprise_name", "企业名称", "qualification", "资质信息"),
    ExportField("cert_type", "单位证件类型", "qualification", "资质信息"),
    ExportField("cert_number", "单位证件号码", "qualification", "资质信息"),
    ExportField("app_platform_name", "APP/平台名称", "qualification", "资质信息"),
    ExportField("legal_representative_name", "法人姓名", "qualification", "资质信息"),
    ExportField("legal_representative_cert_type", "法人证件类型", "qualification", "资质信息"),
    ExportField("legal_representative_cert_number", "法人证件号码", "qualification", "资质信息"),
    ExportField("legal_representative_cert_address", "法人证件地址", "qualification", "资质信息"),
    ExportField("responsible_name", "责任人姓名", "qualification", "资质信息"),
    ExportField("responsible_cert_type", "责任人证件类型", "qualification", "资质信息"),
    ExportField("responsible_cert_number", "责任人证件号码", "qualification", "资质信息"),
    ExportField("responsible_address", "责任人证件地址", "qualification", "资质信息"),
    ExportField("responsible_phone", "责任人手机号", "qualification", "资质信息"),
    ExportField("handler_name", "经办人姓名", "qualification", "资质信息"),
    ExportField("handler_cert_type", "经办人证件类型", "qualification", "资质信息"),
    ExportField("handler_cert_number", "经办人证件号码", "qualification", "资质信息"),
    ExportField("handler_address", "经办人证件地址", "qualification", "资质信息"),
    ExportField("handler_phone", "经办人手机号", "qualification", "资质信息"),

    # ── 引流信息（来源 qualification） ──
    ExportField("diversion_number", "引流号码", "qualification", "引流信息"),
    ExportField("diversion_number_type", "引流号码类型", "qualification", "引流信息"),
    ExportField("diversion_number_usage", "引流号码用途", "qualification", "引流信息"),
    ExportField("diversion_content", "引流内容", "qualification", "引流信息"),
    ExportField("link_address", "引流链接", "qualification", "引流信息"),
    ExportField("link_type", "链接类型", "qualification", "引流信息"),

    # ── 图片材料 ──
    ExportField("cert_image", "单位证件图片", "image_qualification", "图片材料"),
    ExportField("responsible_id_front", "责任人身份证正面", "image_qualification", "图片材料"),
    ExportField("responsible_id_back", "责任人身份证反面", "image_qualification", "图片材料"),
    ExportField("handler_id_front", "法人身份证正面", "image_qualification", "图片材料"),
    ExportField("handler_id_back", "法人身份证反面", "image_qualification", "图片材料"),
    ExportField("auth_image", "授权书图片", "image_port", "图片材料"),
    ExportField("signature_proof", "签名举证附件", "image_qualification", "图片材料"),
    ExportField("diversion_number_proof", "引流号码举证附件", "image_qualification", "图片材料"),
    ExportField("diversion_link_proof", "引流链接举证", "image_qualification", "图片材料"),
    ExportField("handler_scene_photo", "经办人现场照片", "image_qualification", "图片材料"),
]


def get_field(name: str) -> ExportField | None:
    return next((f for f in REGISTRY if f.name == name), None)


def all_fields() -> list[ExportField]:
    return REGISTRY


def field_map() -> dict[str, str]:
    return {f.name: f.label for f in REGISTRY}


def field_source(name: str) -> str | None:
    f = get_field(name)
    return f.source if f else None
