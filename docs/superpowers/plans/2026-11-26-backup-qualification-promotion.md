# 备用资质合规划入实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 将备用库中可由企业名称和签名精确确认的资质自动划入主库，其余记录由人工确认后划入。

**Architecture:** 用独立纯函数判定自动合规，规则仅覆盖企业全称和剔除法定尾缀后的完整企业名称。备用库新增或导入时自动判定；存量记录提供预览与批量执行；人工选择指定记录转入主库。保持原资质 ID 和附件、历史报备关系。

**Tech Stack:** FastAPI、SQLModel、React、TypeScript、pytest。

**Spec:** `/tmp/报备平台建议9.0.docx`、`/tmp/签名合规性标准.xlsx`，以及用户确认的自动/人工边界。

## Global Constraints

- 商标唯一性、ICP、短字号、70%–80% 的模糊合规由人工确认。
- 只允许备用库未归档记录划入；历史报备和附件引用不变。
- 不修改 `routeTree.gen.ts`，不新增无必要数据库字段。

## Review Focus

- “上海富友”对“上海富友电子商务有限公司”不能自动划入。
- “上海富友电子商务”对同公司可自动划入。
- 商标类即使有材料，也不能单凭材料字段自动划入。
- 批量执行必须只划入预览并明确提交的记录，不能受并发修改影响误划入。
- 重复导入已在主库的资质不能在备用库产生重复记录。

---

### Task 1: 纯规则与测试

**Files:** `backend/app/services/qualification_compliance.py`、`backend/app/tests/services/test_qualification_compliance.py`

- [x] 写表格六个样例和缺失值、空格、括号的失败测试。
- [x] 跑测试确认缺少判定实现。
- [x] 实现 `auto_compliance_reason(signature, enterprise_name, signature_type) -> str | None`。
- [x] 跑测试确认通过。

### Task 2: 自动划入与人工划入 API

**Files:** `backend/app/api/routes/qualifications.py`、`backend/app/crud/qualification.py`、`backend/app/tests/api/routes/test_qualifications.py`

- [x] 写备用库创建、导入、存量预览/执行、人工确认、隔离及重复检查的失败测试。
- [x] 跑测试确认缺少行为。
- [x] 在备用库写入链路接入纯规则；新增预览/执行与人工确认 API，执行时重新校验所选 ID。
- [x] 跑相关测试确认通过。

### Task 3: 备用库操作入口

**Files:** `frontend/src/lib/api/qualifications.ts`、`frontend/src/features/qualifications/index.tsx`

- [x] 增加自动划入预览/确认按钮及人工选中划入按钮，显示数量和审核提示。
- [x] 跑前端构建和针对性检查。

### Task 4: 完整验证

- [x] 跑后端全量测试、前端构建、差异检查。
- [x] 记录未覆盖的商标核验限制；交付代码但不自动发布生产。
