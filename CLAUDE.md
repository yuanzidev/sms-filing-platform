# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在本仓库工作时提供指引。

## 项目概述

**SMS 报备管理平台** (SMS Filing Management Platform) 是一个前后端分离的脚手架项目,提供完整的认证、用户、角色、登录/操作日志等基础设施,作为 SMS 报备类业务系统的起点。

技术栈组成:
- **后端** (FastAPI): REST API,处理用户/角色/认证/日志
- **前端** (React + TypeScript): Web UI,基于 ShadcnUI

> 注意:本仓库是从一个流量调度平台脚手架改造而来,所有流量调度/SNMP 业务代码已被移除。

## 常用开发命令

### 后端开发

```bash
cd backend

# 安装依赖(需要 uv)
uv sync

# 数据库初始化
./scripts/prestart.sh

# 启动开发服务器
fastapi dev app/main.py
# 或
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 测试
uv run pytest

# 代码质量
uv run ruff check .
uv run mypy .
```

### 前端开发

```bash
cd frontend

# 安装依赖
pnpm install

# 启动开发服务器(会自动生成 routeTree.gen.ts)
pnpm run dev

# 生产构建
pnpm run build

# 代码检查
pnpm run lint
```

### Docker 部署

```bash
# 构建并启动所有服务
docker compose up -d

# 构建并推送镜像
./scripts/build.sh

# 停止服务
docker compose down
```

## 架构

### 后端结构 (`backend/`)

- `app/main.py` - FastAPI 应用入口
- `app/api/` - API 路由处理(按模块组织)
  - `routes/login.py` - 登录认证
  - `routes/users.py` - 用户管理
  - `routes/roles.py` - 角色管理
  - `routes/login_logs.py` - 登录日志
  - `routes/operation_logs.py` - 操作日志
  - `routes/utils.py` - 健康检查等
- `app/core/` - 配置、安全、数据库连接、时区
- `app/crud/` - 数据库操作层 (Create/Read/Update/Delete)
- `app/models/` - SQLModel 数据库模型
- `app/tests/` - 后端测试

**关键约定**: 后端使用 SQLModel (SQLAlchemy + Pydantic)。所有数据库访问通过 `app/crud/` 层,不要在路由里直接写 SQL。

### 前端结构 (`frontend/`)

- `src/routes/` - TanStack Router 文件路由(自动生成 `routeTree.gen.ts`)
- `src/features/` - 按功能域组织的业务模块
- `src/components/` - 可复用组件
  - `layout/` - 布局组件 (sidebar, header, nav)
  - `ui/` - ShadcnUI 基础组件
- `src/lib/` - 工具库
  - `api.ts` - Axios 实例 + 拦截器
  - `api/` - 各 API 模块
  - `auth.ts` - 认证工具
- `src/hooks/` - 自定义 React Hooks
- `src/stores/` - Zustand 状态管理

**关键约定**: 
- 使用 TanStack Router 文件路由,新增页面在 `src/routes/` 下创建文件即可
- 使用 TanStack Query 管理服务端状态
- `routeTree.gen.ts` 自动生成,**不要手动编辑**

### 数据库 Schema

**基础设施表**:
- `user` - 用户
- `role` - 角色
- `login_log` - 登录日志
- `operation_log` - 操作日志

**关键关系**:
- User → Role (N:1)
- User → LoginLog (1:N)

## 环境配置

### 后端环境 (`.env`)

```bash
# 项目
PROJECT_NAME="SMS Filing Management Platform"
STACK_NAME=sms-filing-platform

# 数据库
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432
POSTGRES_USER=sms_filing
POSTGRES_PASSWORD=changethis
POSTGRES_DB=sms_filing

# 安全
SECRET_KEY=changethis-insecure-secret-key  # 生产环境必改
FIRST_SUPERUSER=admin@sms-filing.local
FIRST_SUPERUSER_PASSWORD=changethis
```

### 前端构建时环境

- `VITE_API_URL` - 后端 API URL (留空表示通过 Nginx 代理走相对路径)

## 扩展业务模块

新增一个业务模块(如 SMS 报备工单)的推荐路径:

**后端**:
1. 在 `app/models/<feature>.py` 定义 SQLModel 模型
2. 在 `app/crud/<feature>.py` 实现 CRUD
3. 在 `app/api/routes/<feature>.py` 实现 API 路由
4. 在 `app/api/main.py` 注册路由
5. 在 `app/models/__init__.py` 导出模型
6. 运行 `alembic revision --autogenerate -m "add xxx"` 生成迁移

**前端**:
1. 在 `src/lib/api/<feature>.ts` 实现 API 调用
2. 在 `src/hooks/use-<feature>.ts` 封装数据 Hook
3. 在 `src/features/<feature>/` 实现业务组件
4. 在 `src/routes/_authenticated/<feature>/` 添加页面路由
5. 在 `src/components/layout/data/sidebar-data.ts` 添加菜单项

## 测试

### 后端测试
```bash
cd backend
uv run pytest
```

## 重要约定

1. **数据库迁移**: 使用 Alembic,位于 `app/alembic/`,修改模型后必须生成迁移
2. **API 文档**: 自动生成于 `/docs` (Swagger UI) 和 `/redoc` (ReDoc)
3. **前端构建**: 生产构建由 frontend 容器内的 Nginx 提供服务,反代 API 请求到后端
4. **认证**: 使用 JWT,通过 `Authorization: Bearer <token>` 头传递
5. **权限**: 通过 `get_current_active_superuser` 等依赖注入控制访问
6. **多语言**: 项目使用中文为主,代码注释和文档保持中文
