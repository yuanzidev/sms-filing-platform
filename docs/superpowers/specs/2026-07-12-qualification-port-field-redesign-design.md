# 资质与端口字段重设计 — 设计文档

日期：2026-07-12

## 概述

按最新业务需求，对「资质管理（qualification_info）」和「端口管理（port_info）」两个模型的字段进行全面调整：业务字段从端口模型迁回资质模型，补齐法人/证件地址/引流等新字段，删除废弃字段。报备任务创建流程不做变更。

## 需求要点

1. 资质管理字段按最新分类扩充，报备相关业务字段从端口模型迁入
2. 新增法人姓名，与责任人拆分为两个独立字段
3. 新增责任人/经办人证件地址、引流号码/链接等新字段
4. 端口管理精简为端口自身属性字段，删除迁出的业务字段
5. 删除 submit_unit、carrier_enterprise_id、operation_type 废弃字段
6. 资质表单按信息类别折叠分组
7. 导入导出模板和字段组同步更新

## 一、qualification_info 字段变更

### 删除字段

- `submit_unit`（提交单位）
- `carrier_enterprise_id`（运营商企业ID）
- `group_code`（集团编码）→ 迁到 port_info

### 从 port_info 迁入的字段

- `business_attribute`（业务属性）
- `business_type`（业务类型）
- `business_subtype`（业务细类）
- `specific_usage`（具体用途）
- `sms_signature`（短信签名）
- `is_gateway_signature`（是否网关签名）
- `sms_template_content`（短信模板内容）

### 新增人员字段

- `legal_representative_name`（法人姓名）：string，非必填
- `responsible_address`（责任人证件地址）：string，非必填
- `handler_address`（经办人证件地址）：string，非必填

### 新增业务字段

- `signature_type`（签名类型/来源）：string，非必填
- `diversion_number`（引流号码）：string，非必填
- `link_address`（链接地址）：string，非必填
- `template_has_variable`（模板是否包含变量）：bool，非必填
- `template_param_type`（模板参数类型）：string，非必填
- `template_param_length`（模板参数长度）：string，非必填
- `diversion_content`（引流内容）：string，非必填
- `diversion_number_type`（引流号码类型）：string，非必填
- `diversion_number_usage`（引流号码用途）：string，非必填
- `link_type`（链接类型）：string，非必填
- `signature_verified`（是否签名校验）：bool，非必填

### 附件字段（继续走 file_attachment 表管理，不在 qualification_info 加列）

- 责任人身份证正面、责任人身份证反面
- 经办人身份证正面、经办人身份证反面
- 经办人现场照片
- 引流举证附件
- 单位证件附件
- 签名举证附件

### qualification_info 变更后完整字段清单

```
企业名称 *        enterprise_name
单位证件类型       cert_type
单位证件号码       cert_number
APP/平台名称       app_platform_name

法人姓名           legal_representative_name     

责任人姓名         responsible_name              
责任人证件类型     responsible_cert_type         
责任人证件号码     responsible_cert_number       
责任人证件地址     responsible_address           NEW
责任人手机号       responsible_phone             

经办人姓名         handler_name                  
经办人证件类型     handler_cert_type             
经办人证件号码     handler_cert_number           
经办人证件地址     handler_address               NEW
经办人手机号       handler_phone                 

短信签名           sms_signature                 从 port_info 迁入
签名类型/来源      signature_type                NEW
是否签名校验       signature_verified            NEW
是否网关签名       is_gateway_signature          从 port_info 迁入
短信模板内容       sms_template_content          从 port_info 迁入
模板是否包含变量   template_has_variable         NEW
模板参数类型       template_param_type           NEW
模板参数长度       template_param_length         NEW

业务属性           business_attribute            从 port_info 迁入
业务类型           business_type                 从 port_info 迁入
业务细类           business_subtype              从 port_info 迁入
具体用途           specific_usage                从 port_info 迁入

引流号码           diversion_number              NEW
引流号码类型       diversion_number_type         NEW
引流号码用途       diversion_number_usage        NEW
引流内容           diversion_content             NEW
链接地址           link_address                  NEW
链接类型           link_type                     NEW

签名               signature                     
```

* 标记为必填，其余非必填

## 二、port_info 字段变更

### 删除字段

- `operation_type`（操作类型）
- `business_attribute`（业务属性）→ 迁到 qualification_info
- `business_type`（业务类型）→ 迁到 qualification_info
- `business_subtype`（业务细类）→ 迁到 qualification_info
- `specific_usage`（具体用途）→ 迁到 qualification_info
- `sms_signature`（短信签名）→ 迁到 qualification_info
- `is_gateway_signature`（是否网关签名）→ 迁到 qualification_info
- `sms_template_content`（短信模板内容）→ 迁到 qualification_info

### 新增字段

- `region`（所属地区）：string，非必填
- `other_room_description`（其他接入机房说明）：string，非必填
- `is_green_channel`（是否绿色通道）：bool，非必填
- `blacklist_whitelist_type`（黑白名单类型）：string，非必填
- `audit_form`（端口审核表）：string，非必填
- `customer_type`（客户类型）：string，非必填

### port_info 变更后完整字段清单

```
主端口号 *         main_port_number
运营商 *           carrier
接入省             province
接入地市           city
集团编码           group_code                    从 qualification_info 迁入
是否具有授权书     has_authorization
授权开始日期       auth_start_date
授权结束日期       auth_end_date
所属地区           region                        NEW
运营商接入机房     carrier_room
企业接入机房       enterprise_room
其他接入机房说明   other_room_description        NEW
是否绿色通道       is_green_channel              NEW
黑白名单类型       blacklist_whitelist_type      NEW
端口审核表         audit_form                    NEW
是否允许自行扩展   allow_self_extension
端口入网时间       port_activation_date
子端口号           sub_port_number
码号使用范围       port_range
端口类型           port_type
客户类型           customer_type                 NEW
```

## 三、前端表单分组

资质新建/编辑表单按折叠面板分组：

| 分组 | 包含字段 |
|------|---------|
| 企业信息 | 企业名称、单位证件类型、单位证件号码、APP/平台名称 |
| 法人信息 | 法人姓名 |
| 责任人信息 | 责任人姓名、证件类型、证件号码、证件地址、手机号 + 身份证正/反面图片 |
| 经办人信息 | 经办人姓名、证件类型、证件号码、证件地址、手机号 + 身份证正/反面图片、现场照片 |
| 签名与模板 | 短信签名、签名类型、签名校验、网关签名、模板内容、模板变量、参数类型、参数长度 + 签名举证附件 |
| 业务信息 | 业务属性、业务类型、业务细类、具体用途 |
| 引流信息 | 引流号码、号码类型、号码用途、引流内容、链接地址、链接类型 + 引流举证附件 |

## 四、数据迁移策略

开发/测试环境，数据不重要。直接改模型，不写迁移脚本。`port_info` 中迁出的业务字段数据丢弃。

对应表变更通过 Alembic 自动生成迁移（`--autogenerate`），迁移中包含：删除列、新增列。

## 五、导入导出模板更新

- 导入模板表头按 qualification_info 新字段完整列表更新，图片列放在末尾
- 导出字段组 `AVAILABLE_FIELDS` 同步更新，字段按归属分类重组

## 六、涉及文件清单

**后端：**
- `backend/app/models/qualification_info.py` — 模型 + Schema
- `backend/app/models/port_info.py` — 模型 + Schema
- `backend/app/models/__init__.py` — 导出更新
- `backend/app/crud/qualification.py` — 列表查询适配新字段
- `backend/app/crud/port_info.py` — 同上
- `backend/app/api/routes/qualifications.py` — 导入模板 header + 导入解析
- `backend/app/api/routes/port_info.py` — 同上
- Alembic 迁移文件（自动生成）

**前端：**
- `frontend/src/lib/api/types.ts` — 类型定义
- `frontend/src/features/qualifications/components/qualification-dialog.tsx` — 表单重组
- `frontend/src/features/qualifications/components/qualification-detail-dialog.tsx` — 详情重组
- `frontend/src/features/qualifications/index.tsx` — 列表列调整
- `frontend/src/features/export-groups/components/export-group-dialog.tsx` — 字段列表
- `frontend/src/features/port-info/` — 端口管理页面的表单/详情/列表
- `frontend/src/features/filing-management/create.tsx` — 资质表格列调整
