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

## 部署到生产服务器

项目提供 **本地 SSH 一键部署** 闭环(基于阿里云 ACR 中转镜像),覆盖初次部署与后续代码更新发布两个场景。

### 一次性准备

1. **本地依赖**:
   - Docker / Docker Compose
   - 能 `ssh sms` 连到服务器的 SSH 配置(`~/.ssh/config` 中定义 `Host sms`)

2. **服务器侧**:
   - Docker / Docker Compose 已安装
   - 已登录阿里云 ACR(只需一次):
     ```bash
     ssh sms
     docker login crpi-nnm7kvwebfzqh8so.cn-hangzhou.personal.cr.aliyuncs.com/feixinyun
     ```

3. **本地配置**:
   - `.env.deploy`:生产环境变量(DOMAIN、SECRET_KEY、POSTGRES_PASSWORD 等),从 `.env.deploy.local`(本地验证用)派生
   - `docker-compose-deploy.yml`:部署用的 compose 描述(由 deploy.sh 自动同步到服务器)

### 发布流程(每次代码更新)

```bash
# 1. 构建 amd64 镜像 + 本地验证 + 推送到 ACR(打 latest 与 git short sha 两个 tag)
./scripts/build.sh

# 2. SSH 到服务器:同步 compose/env、拉镜像、滚动重启、健康检查
./scripts/deploy.sh
```

`deploy.sh` 默认部署当前 git short sha 版本,可通过 `IMAGE_TAG` 覆盖:

```bash
IMAGE_TAG=<某个历史tag> ./scripts/deploy.sh   # 回滚到指定版本
SSH_HOST=other-host ./scripts/deploy.sh       # 部署到其他服务器
```

### 部署目录约定

服务器侧目录:`/opt/sms-filing-platform/`,与已有项目(如 `/opt/sms/`)完全隔离,使用独立的 docker network `sms-filing-network` 与 volume `postgres-data`,不影响服务器上其他项目。

### 健康检查

`deploy.sh` 会轮询 `http://<server>:30100/api/v1/utils/health-check/`,收到 HTTP 200 才算成功;失败时会打印 `docker compose ps` 与最近日志便于定位。

### 常用运维命令

```bash
# 查看日志
ssh sms 'cd /opt/sms-filing-platform && docker compose -f docker-compose-deploy.yml logs -f'

# 重启服务
ssh sms 'cd /opt/sms-filing-platform && docker compose -f docker-compose-deploy.yml restart'

# 进入容器
ssh sms 'docker exec -it sms-filing-backend bash'
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
