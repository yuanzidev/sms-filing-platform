# SMS Filing Management Platform - Frontend

SMS 报备管理平台前端,基于 React 19 + TanStack Router + ShadcnUI + Vite。

![alt text](public/images/shadcn-admin.png)

## 功能特性

- 明亮/暗黑模式
- 响应式设计
- 可访问性
- 内置侧边栏布局
- 全局搜索命令
- 用户/角色管理
- 登录日志/操作日志
- 个人设置

## 技术栈

**UI 界面**: [ShadcnUI](https://ui.shadcn.com) (TailwindCSS + RadixUI)

**构建工具**: [Vite](https://vitejs.dev/)

**路由**: [TanStack Router](https://tanstack.com/router/latest) (文件路由)

**数据请求**: [TanStack Query](https://tanstack.com/query/latest)

**状态管理**: [Zustand](https://github.com/pmndrs/zustand)

**类型检查**: [TypeScript](https://www.typescriptlang.org/)

**代码检查/格式化**: [Eslint](https://eslint.org/)

**图标**: [Tabler Icons](https://tabler.io/icons)

## 开发

```bash
pnpm install
pnpm run dev       # 启动开发服务器
pnpm run build     # 生产构建
pnpm run lint      # 代码检查
```

## 目录结构

```
frontend/src/
├── components/      # 通用组件 + 布局 + ShadcnUI
├── features/        # 业务模块(auth, errors, settings, users, roles, login-logs)
├── routes/          # TanStack Router 文件路由
│   ├── (auth)/      # 认证页(登录/注册)
│   ├── (errors)/    # 错误页
│   └── _authenticated/  # 已认证路由(system, settings, users)
├── hooks/           # 自定义 Hooks
├── lib/             # 工具库 + API 模块
├── stores/          # Zustand 状态
├── context/         # Theme/Font/Search 上下文
└── main.tsx
```

## 业务扩展

新增业务模块的推荐路径:
1. `src/lib/api/<feature>.ts` - API 调用层
2. `src/hooks/use-<feature>.ts` - 数据 Hook
3. `src/features/<feature>/` - 业务组件
4. `src/routes/_authenticated/<feature>/` - 页面路由
5. 在 `src/components/layout/data/sidebar-data.ts` 添加菜单项
