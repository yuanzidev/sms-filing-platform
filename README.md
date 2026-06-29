# SMS Filing Management Platform

> 中文名:**SMS 报备管理平台**
> 英文名:**SMS Filing Management Platform**
> 仓库名:`sms-filing-platform`

前后端分离的脚手架项目,基于 FastAPI + React 19,提供完整的认证、用户、角色、登录/操作日志等基础设施,可作为 SMS 报备类业务系统的起点。

## 技术栈

| 模块 | 技术 |
|---|---|
| 后端 | Python 3.10+, FastAPI, SQLModel, PostgreSQL 17, Alembic, uv |
| 前端 | React 19, TypeScript, TanStack Router/Query, ShadcnUI, Tailwind v4, Vite 7, pnpm |
| 部署 | Docker Compose, Nginx 反向代理 |

## 项目结构

```
sms-filing-platform/
├── backend/                # FastAPI 后端
│   ├── app/
│   │   ├── api/routes/     # 路由:login, users, roles, login_logs, operation_logs, utils
│   │   ├── core/           # config, db, security, timezone
│   │   ├── crud/           # user, role
│   │   ├── models/         # user, role, auth, login_log, operation_log
│   │   ├── alembic/        # 数据库迁移
│   │   └── tests/
│   ├── scripts/            # prestart, lint, test, format
│   └── Dockerfile
├── frontend/               # React 前端
│   └── src/
│       ├── components/     # 布局 + ShadcnUI
│       ├── features/       # auth, users, roles, settings, login-logs, errors
│       ├── routes/         # TanStack Router 文件路由
│       ├── hooks/, lib/, stores/, context/
│       └── main.tsx
├── scripts/                # 镜像构建脚本
├── docker-compose.yml          # 本地开发
├── docker-compose-deploy.yml   # 生产部署
├── .env, .env.deploy, .env.deploy.local
├── copier.yml              # Copier 模板配置
├── CLAUDE.md               # Claude Code 协作指引
└── README.md
```

## 快速开始

### 本地开发

```bash
# 1. 后端
cd backend
uv sync
cp ../backend/.env.example .env  # 如有
./scripts/prestart.sh           # 数据库迁移
fastapi dev app/main.py

# 2. 前端(新终端)
cd frontend
pnpm install
pnpm run dev
```

访问:
- 前端: http://localhost:5173
- 后端 API 文档: http://localhost:8000/docs

### Docker Compose 部署

```bash
# 本地构建启动
docker compose up -d

# 前端访问
open http://localhost:30100

# 构建并推送镜像
./scripts/build.sh
```

## 环境变量

关键变量(详见各 `.env` 文件):

| 变量 | 说明 |
|---|---|
| `PROJECT_NAME` | 项目名 |
| `STACK_NAME` | Docker Compose 标签 |
| `POSTGRES_*` | 数据库连接 |
| `SECRET_KEY` | JWT 签名密钥(生产必改) |
| `FIRST_SUPERUSER` | 初始超管邮箱 |
| `FIRST_SUPERUSER_PASSWORD` | 初始超管密码 |
| `VITE_API_URL` | 前端 API 地址(留空走相对路径) |

## 内置功能

- 用户/角色管理(基于角色的权限控制)
- JWT 登录认证
- 登录日志、操作日志审计
- 个人设置(账户/外观/显示/通知)
- 中英文本地化基础

## 扩展指南

新增业务模块(如 SMS 报备工单)的推荐路径:

**后端**:
1. `app/models/<feature>.py` - 数据模型
2. `app/crud/<feature>.py` - CRUD 层
3. `app/api/routes/<feature>.py` - API 路由
4. 在 `app/api/main.py` 注册路由
5. 在 `app/models/__init__.py` 导出模型
6. `alembic revision --autogenerate -m "<msg>"` 生成迁移

**前端**:
1. `src/lib/api/<feature>.ts` - API 调用
2. `src/hooks/use-<feature>.ts` - 数据 Hook
3. `src/features/<feature>/` - 业务组件
4. `src/routes/_authenticated/<feature>/` - 页面路由
5. 在 `src/components/layout/data/sidebar-data.ts` 添加菜单

## 许可证

私有项目。
