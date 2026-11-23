# 报备平台建议 8.0 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现客户建议第 1 至 12 项；第 1 项沿用现有去重键，重复上传时刷新导入时间。

**Architecture:** 沿用资质、报备任务和子端口库现有模型及 API。备用库在资质记录上标记库别，所有列表、匹配、创建任务按库别隔离；签名系列通过可维护映射表归类，并回填历史记录。

**Tech Stack:** FastAPI、SQLModel、Alembic、React、TypeScript、TanStack Query。

**Spec:** `/tmp/报备平台建议8.0.docx`；用户确认备用库在创建报备任务时明确选择。

## Global Constraints

- 保留现有资质去重键；命中现有记录时刷新导入时间，同文件内重复行仍跳过。
- 不修改 `routeTree.gen.ts`。
- 数据库结构变化必须有 Alembic 迁移。

## Review Focus

- 同一签名重复输入时，匹配记录按资质 ID 去重。
- 时间上界为开区间，跨月和跨年正确。
- 备用库记录不能从主库报备入口被选中或通过提交 ID 越过隔离。
- 删除系列规则后，历史资质的系列属性同步更新。
- 老子端口记录缺少运营商时仍可命名并归类。

---

### Task 1: 批量签名匹配与时间范围

**Files:** `backend/app/models/qualification_info.py`、`backend/app/crud/qualification.py`、`backend/app/api/routes/qualifications.py`、`frontend/src/features/filing-management/components/signature-import-dialog.tsx`、相关 API 类型和测试。

- [ ] 先写重复签名、月/日/秒范围的失败测试并运行。
- [ ] 实现去重和按选择的时间精度求半开区间。
- [ ] 运行相关测试。

### Task 2: 报备填充和子端口库体验

**Files:** `frontend/src/features/filing-management/create.tsx`、`backend/app/api/routes/filing_tasks.py`、`frontend/src/features/sub-port-library/index.tsx`、`backend/app/crud/sub_port_record.py`、相关测试。

- [ ] 先写填充字段、旧记录命名归类的失败测试并运行。
- [ ] 增加端口类型关联的用途类别、具体用途和短信模板填充；调整字段组可选逻辑。
- [ ] 增加显式搜索按钮，将命名展示前移，并处理历史子端口归类。
- [ ] 运行相关测试与前端构建。

### Task 3: 签名系列

**Files:** 新模型和迁移、`backend/app/crud/qualification.py`、`backend/app/api/routes/qualifications.py`、`frontend/src/features/qualifications/index.tsx`、相关测试。

- [ ] 先写系列规则增删改、自动匹配、历史回填和筛选的失败测试并运行。
- [ ] 实现映射维护与资质系列筛选，并开放业务类型、业务属性筛选。
- [ ] 在批量导入签名时增加业务类型、业务属性过滤。
- [ ] 运行测试与构建。

### Task 4: 备用资质库

**Files:** 资质模型和迁移、资质及报备 API、资质及报备页面、相关测试。

- [ ] 先写主/备用库数据隔离、报备提交校验、按条件清理的失败测试并运行。
- [ ] 实现库别标记和历史记录默认为主库，贯通录入、查询、导入、附件、报备。
- [ ] 添加备用库入口和按时间、报备状态清理。
- [ ] 运行后端测试、代码检查和前端构建，核对第 2 至 12 项。

### Task 5: 重复资质刷新导入时间

**Files:** `backend/app/api/routes/qualifications.py`、`frontend/src/components/shared/import-dialog.tsx`、相关 API 类型和测试。

- [x] 写测试证明相同资质重复上传后保留 ID、刷新 `created_at`，并能按本次日期筛选。
- [x] 沿用现有去重键，只更新命中记录的导入时间与更新时间。
- [x] 在导入结果中区分新增、更新和同文件跳过的行。
