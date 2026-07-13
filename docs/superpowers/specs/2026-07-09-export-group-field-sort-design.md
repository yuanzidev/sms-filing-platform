# 导出字段组字段排序设计

- 日期：2026-07-09
- 范围：`export-group-dialog.tsx` 增加已选字段的上下移排序能力

## 背景

`ExportGroupField` 已有 `sort_order` 字段，后端 CRUD 已正确存储和更新，`generate_excel` 已按 `sort_order` 排序导出。前端对话框用 `Set<string>` 存储已选字段，无顺序保证，缺少可视化排序 UI。

## 改动范围

仅修改 `frontend/src/features/export-groups/components/export-group-dialog.tsx`，后端零改动。

## 设计

- `selectedFields` 从 `Set<string>` 改为 `string[]`
- 编辑模式按 `group.fields` 的 `sort_order` 升序初始化
- 左右两栏布局：左栏 checkbox 可选字段列表，右栏已选字段排序列表
- 右栏每项：序号 + 字段名 + 上移/下移/删除按钮（首项隐藏上移、末项隐藏下移）
- 提交时按数组位置赋值 `sort_order: idx`
