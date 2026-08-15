# 报备任务与字段组解耦设计（组名快照 + SET NULL）

日期：2026-08-15
状态：已与用户确认

## 背景

`filing_task.export_group_id` 是 NOT NULL 外键且无 ondelete 规则，导致字段组一旦被历史报备任务引用就永远无法删除（生产环境曾出现 DELETE /export-groups/{id} 返回 500，根因为 `filing_task_export_group_id_fkey` 外键违反）。

任务创建后，该外键的全部用途仅为：列表显示组名、按组名搜索、regenerate 取当前组。三者均可被「创建时组名快照」替代。

## 目标

删除字段组不受报备任务限制，且历史任务的列表展示/搜索不受影响。

## 非目标

- 不快照资质/端口数据（regenerate 仍按 id 取当前数据）
- 不快照字段列表（regenerate 仍使用当前字段组；组已删除则 regenerate 返回 400，与现状一致）
- 前端零改动

## 设计

### 数据模型（filing_task 表）

1. `export_group_id` 改为可空，外键加 `ondelete="SET NULL"`：
   - 删除字段组时数据库自动将历史任务的引用置空
   - 沿用 `filing_sub_port_usage.py` 的写法：`sa_column=Column(..., ForeignKey(..., ondelete="SET NULL"), nullable=True)`
2. 新增 `export_group_name: str | None`（max_length=100）快照列：
   - 任务**创建时**写入当时的组名
   - 字段组改名后，历史任务列表仍显示创建时的旧名（已与用户确认此行为变化）

### 数据流

| 场景 | 行为 |
|---|---|
| 删除字段组 | 直接成功（删除 409 检查），DB 级 SET NULL 清空任务引用 |
| 任务列表/搜索 | 读快照列，不再 JOIN 字段组表 |
| 下载历史文件 | 不变（返回创建时生成的静态文件） |
| 重新生成 | 组在 → 用当前组；组已删 → 400「导出字段组已被删除，无法重新生成」（现状已有） |
| 仪表盘 recent-changes | 改读快照列 |

### 改动清单

| 文件 | 改动 |
|---|---|
| 新增 alembic revision（head: a1c2d3e4f5b6） | export_group_id 改可空；删旧外键、重建带 SET NULL；新增 export_group_name 列；UPDATE 回填存量任务的当前组名 |
| `models/filing_task.py` | FilingTaskBase.export_group_id 可空 + ondelete；新增 export_group_name 列 |
| `crud/filing_task.py` | create 增加 export_group_name 参数；list 去掉 ExportGroup join，搜索用快照列 |
| `routes/filing_tasks.py` | 创建时传快照组名；删除 `_get_export_group_name`，`_task_to_public` 读快照列 |
| `routes/export_groups.py` | DELETE 去掉 409 检查（连同 FilingTask/select import） |
| `routes/dashboard.py` | 读快照列，移除 ExportGroup lookup 与 import |
| 测试 | 原「引用则 409」测试改为「删除成功 + 任务详情仍显示组名快照」；补「组删除后 regenerate 返回 400」 |

### 错误处理

- 创建任务时字段组必须存在（`FilingTaskCreate.export_group_id` 仍必填，创建接口 404 校验）——不变
- regenerate 组已删 → 400 提示（现状代码已覆盖）

### 迁移回填

存量任务用 `UPDATE filing_task SET export_group_name = export_group.name FROM export_group WHERE export_group.id = filing_task.export_group_id` 回填当前组名（历史组名无法追溯，尽力而为）。downgrade 反向删除快照列并恢复 NOT NULL 外键。

### 验证

- export-groups 与 filing-tasks 测试模块全绿
- 全量后端测试无新增失败（基线有 24 个存量失败，与本次无关）
- ruff / mypy 无新增问题
