# SMS 报备管理平台 — 技术架构文档

> 版本: 2026-07-03 | 分支: `feat/backend-business-modules` (commit `7ad6a40`)

## 1. 系统概述

SMS 报备管理平台是一个前后端分离的 Web 应用，用于管理短信端口报备业务。系统围绕四大业务模块构建：工作台（Dashboard）、资质管理（报备记录）、端口管理（主端口/子端口）、三方 API 接入管理。

```
┌─────────────────────────────────────────────────────────────┐
│                      用户浏览器                              │
│                  http://39.105.3.36:30100                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                 Nginx (frontend 容器 :3000)                  │
│  - 静态文件服务 (React SPA)                                  │
│  - /api/* 反代 → backend:8000                               │
│  - /docs /redoc 反代 → backend:8000                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              FastAPI (backend 容器 :8000, 4 workers)         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Auth     │ │ Records  │ │ Ports    │ │ API Data │       │
│  │ (JWT)    │ │ (CRUD)   │ │ (CRUD)   │ │ (展示)    │       │
│  ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤       │
│  │ Users    │ │ Export   │ │ MainPort │ │ Config   │       │
│  │ Roles    │ │ Import   │ │ SubPort  │ │          │       │
│  ├──────────┤ ├──────────┤ └──────────┘ └──────────┘       │
│  │ Logs     │ │ Dashboard│                                  │
│  └──────────┘ └──────────┘                                  │
└────────┬───────────────────────────────┬─────────────────────┘
         │                               │
         ▼                               ▼
┌──────────────────┐     ┌──────────────────────────────┐
│  PostgreSQL 17   │     │   MinIO / Local Storage       │
│  (sms-filing-db) │     │   (文件附件 & Excel 导入)       │
└──────────────────┘     └──────────────────────────────┘
```

## 2. 技术栈

| 层 | 技术 | 版本 |
|---|---|---|
| 后端框架 | FastAPI + SQLModel | Python 3.12 |
| ORM | SQLAlchemy (via SQLModel) | — |
| 数据库 | PostgreSQL | 17 |
| 迁移 | Alembic | — |
| 对象存储 | MinIO (S3 兼容) / LocalFileStorage | — |
| Excel 处理 | openpyxl | — |
| 认证 | JWT (python-jose) | — |
| 前端框架 | React + TypeScript | 19 |
| 路由 | TanStack Router | — |
| 服务端状态 | TanStack Query | — |
| UI 组件 | ShadcnUI + Tailwind CSS | v4 |
| 构建工具 | Vite | 7 |
| 包管理 | pnpm (前端) / uv (后端) | — |
| 容器化 | Docker + Docker Compose | — |
| 镜像仓库 | 阿里云 ACR (个人版) | — |

## 3. 后端架构

### 3.1 分层结构

```
backend/app/
├── main.py                  # FastAPI 应用入口
├── api/
│   ├── main.py              # 路由注册 (api_router)
│   ├── deps.py              # 依赖注入 (SessionDep, CurrentUser 等)
│   └── routes/              # 按模块划分的路由文件
│       ├── login.py         # POST /login/access-token
│       ├── users.py         # CRUD /users
│       ├── roles.py         # CRUD /roles
│       ├── login_logs.py    # GET /login-logs
│       ├── operation_logs.py
│       ├── files.py         # 文件上传/下载 (/files)
│       ├── ports.py         # 主端口 + 子端口 CRUD
│       ├── records.py       # 报备记录 CRUD + 导入
│       ├── dashboard.py     # 工作台统计/趋势/分布
│       ├── export_groups.py # 导出分组配置 CRUD
│       ├── api_access.py    # 三方 API 接入配置 + 数据展示
│       └── utils.py         # 健康检查
├── crud/                    # 数据库操作层
│   ├── user.py, role.py     # 基础设施
│   ├── port.py              # main_port + sub_port
│   ├── record.py            # filing_record (三表 JOIN)
│   ├── dashboard.py         # 统计聚合查询
│   ├── export_group.py      # 导出分组 CRUD
│   ├── file_attachment.py   # 文件附件 CRUD
│   └── api_access.py        # API 接入配置 + 数据
├── models/                  # SQLModel 数据库模型
│   ├── auth.py              # JWT token 相关
│   ├── user.py, role.py     # 用户/角色
│   ├── login_log.py, operation_log.py
│   ├── main_port.py         # 主端口号
│   ├── sub_port.py          # 子端口号
│   ├── port_info.py         # 端口信息 (详细字段)
│   ├── qualification_info.py # 资质信息 (详细字段)
│   ├── filing_record.py     # 报备记录 (核心聚合模型)
│   ├── file_attachment.py   # 文件附件
│   ├── export_group.py      # 导出分组
│   └── api_access_config.py # API 接入配置
├── services/                # 业务服务层
│   ├── __init__.py          # 共享工具 (record_to_public 等)
│   ├── import_service.py    # Excel 带图导入 (预览+确认两步)
│   └── export.py            # Excel 导出 (按分组字段)
├── core/                    # 基础设施
│   ├── config.py            # Settings (pydantic-settings)
│   ├── db.py                # 数据库引擎 + session
│   ├── security.py          # JWT 创建/验证
│   ├── storage.py           # StorageBackend 抽象 + MinIO/Local 实现
│   └── timezone.py          # 时区处理
└── alembic/                 # 数据库迁移脚本
```

### 3.2 核心设计模式

**Sync Session 模式**: 项目使用同步 SQLAlchemy session (`SessionDep`)，所有数据库操作均为同步调用。相比于 async，简化了 SQLModel 的使用且更容易调试。

**CRUD 模式**: 路由层只负责参数解析和 HTTP 响应，所有数据库操作封装在 `crud/` 层。CRUD 函数接收 `Session` 作为第一个参数，返回 SQLModel 对象或 dict。

**StorageBackend 抽象**: `core/storage.py` 定义了 `StorageBackend` ABC，提供 `LocalFileStorage` 和 `MinioStorage` 两种实现。通过 `STORAGE_BACKEND` 环境变量切换（默认 `local`）。`get_storage()` 使用 double-checked locking 保证线程安全。

### 3.3 API 路由一览

| 路由前缀 | 模块 | 主要端点 |
|---|---|---|
| `/api/v1/login` | 认证 | POST `/access-token` |
| `/api/v1/users` | 用户管理 | CRUD |
| `/api/v1/roles` | 角色管理 | CRUD |
| `/api/v1/login-logs` | 登录日志 | GET list |
| `/api/v1/operation-logs` | 操作日志 | GET list |
| `/api/v1/files` | 文件管理 | POST upload, GET download |
| `/api/v1/ports/main` | 主端口 | CRUD |
| `/api/v1/ports/sub` | 子端口 | CRUD |
| `/api/v1/records` | 报备记录 | CRUD + 筛选 + POST import |
| `/api/v1/dashboard` | 工作台 | stats, trends, carrier-dist, status-dist, recent-changes |
| `/api/v1/export-groups` | 导出分组 | CRUD |
| `/api/v1/export` | Excel 导出 | POST (按分组导出字段) |
| `/api/v1/api-access` | 三方 API | configs CRUD, data list + update |
| `/api/v1/utils` | 工具 | GET health-check |

### 3.4 数据模型关系

```
MainPort (主端口)          SubPort (子端口)
    │                          │
    │ 1:N                      │ N:1
    ▼                          ▼
PortInfo (端口信息) ◄──── FilingRecord (报备记录) ────► QualificationInfo (资质信息)
                              │
                              │ N:1
                              ▼
                       ExportGroup (导出分组)
```

`FilingRecord` 是核心聚合模型，通过 `port_info_id` 和 `qualification_info_id` 外键关联端口信息和资质信息。查询时使用 `selectinload` 预加载关联数据以避免 N+1 问题。

### 3.5 Excel 导入导出

**导入（两步式）**:
1. `POST /records/import/upload` — 上传 Excel 文件，解析预览数据并提取嵌入图片，存入临时目录，返回预览 JSON
2. `POST /records/import/confirm` — 确认导入，逐行创建 PortInfo + QualificationInfo + FilingRecord，使用 savepoint 实现单行失败不回滚整批

**导出**:
- `POST /export` — 指定 `export_group_id`，按分组配置的字段列表导出 Excel
- `ExportGroup` 支持按运营商（移动/电信）等维度定义不同的导出字段集合

## 4. 前端架构

### 4.1 目录结构

```
frontend/src/
├── routes/                  # TanStack Router 文件路由
│   ├── __root.tsx           # 根路由 (providers)
│   ├── _authenticated/      # 需登录的路由
│   │   ├── route.tsx        # 认证布局 (sidebar + header)
│   │   ├── index.tsx        # → Dashboard
│   │   ├── records/         # 报备记录
│   │   │   ├── index.tsx    #   列表页
│   │   │   ├── create.tsx   #   新增
│   │   │   └── $recordId/   #   详情/编辑
│   │   ├── ports/main/      # 主端口
│   │   ├── ports/sub/       # 子端口
│   │   ├── api-data/        # 三方 API 数据展示
│   │   ├── users/           # 用户/角色/日志管理
│   │   └── settings/        # 个人设置
│   ├── (auth)/              # 登录/注册/忘记密码
│   └── (errors)/            # 401/403/404/500/503
├── features/                # 业务组件 (按功能域组织)
│   ├── dashboard/           # StatCards, TrendChart, CarrierPieChart, RecentChanges
│   ├── records/             # RecordsTable, RecordSearchForm, RecordForm, RecordDetail
│   ├── ports/               # 端口列表/详情
│   ├── api-data/            # API 数据表格
│   ├── auth/                # 登录/注册表单
│   ├── users/               # 用户管理 (data-table 系列)
│   ├── roles/               # 角色管理
│   ├── login-logs/          # 登录日志
│   └── settings/            # 设置表单
├── components/              # 通用组件
│   ├── ui/                  # ShadcnUI 基础组件 (50+)
│   └── layout/              # 布局 (sidebar, header, nav)
├── lib/
│   ├── api.ts               # Axios 实例 + 拦截器
│   └── api/                 # API 模块 (dashboard.ts, records.ts, ports.ts, ...)
├── hooks/                   # 自定义 Hook (use-dashboard, use-records, use-ports, ...)
├── stores/                  # Zustand (authStore)
└── context/                 # React Context (theme, font, search)
```

### 4.2 数据流

```
TanStack Router → Feature Component → useQuery Hook → API Module → Axios → Backend
                                                         │
                                                    TanStack Query
                                                    (缓存/重取/乐观更新)
```

- **TanStack Query** 管理所有服务端状态，提供缓存、加载状态、错误处理
- **Zustand** 管理客户端状态（认证 token、用户信息）
- **Axios 拦截器** 自动附加 JWT token，处理 401 跳转登录页

## 5. 数据库设计

### 5.1 业务表

| 表名 | 说明 | 关键字段 |
|---|---|---|
| `main_port` | 主端口号 | carrier, port_number, port_type, province, city |
| `sub_port` | 子端口号 | main_port_id(FK), sub_port_number, usage_scope |
| `port_info` | 端口详细信息 | 30+ 字段（见下文） |
| `qualification_info` | 资质信息 | 20+ 字段（见下文） |
| `filing_record` | 报备记录（聚合） | port_info_id(FK), qualification_info_id(FK), status, record_number |
| `file_attachment` | 文件附件 | entity_type, entity_id, file_name, storage_path, file_size |
| `export_group` | 导出分组配置 | group_name, carrier, fields(JSON) |
| `api_access_config` | API 接入配置 | api_name, endpoint, auth_type, headers(JSON) |

### 5.2 核心字段

**port_info（端口信息）**:
运营商、操作类型、主端口号、子端口号、码号使用范围、接入省、接入地市、端口类型、端口入网时间、是否允许自行扩展、业务属性、业务类型、业务细类、具体用途、短信签名、是否网关签名、运营商接入机房及设备、企业接入机房及设备、是否具有授权书、授权开始/结束日期、短信模板内容

**qualification_info（资质信息）**:
报送单位、运营商企业ID、企业名称、单位证件类型/号码、APP/平台名称、集团编码、责任人/经办人姓名/证件类型/证件号码/手机号

### 5.3 基础设施表

`user`, `role`, `login_log`, `operation_log` — 来自脚手架，提供认证、授权、审计功能。

## 6. 部署架构

### 6.1 容器拓扑

```
docker compose (sms-filing-network, bridge)
├── sms-filing-db       postgres:17             :5432 (host)
├── sms-filing-backend  ACR image :8000         (内部)
└── sms-filing-frontend ACR image :3000 → :30100 (host)
```

### 6.2 镜像流水线

```
本地源码 → Docker Build (linux/amd64, multi-stage)
         → 本地 docker compose up 验证
         → docker push 阿里云 ACR (latest + git-sha)
         → ./scripts/deploy.sh
              ├── rsync compose/env 到服务器
              ├── ssh docker compose pull
              ├── ssh docker compose up -d --wait
              └── 健康检查 (curl /api/v1/utils/health-check/)
```

### 6.3 环境配置

| 文件 | 用途 |
|---|---|
| `.env` | 后端本地开发 |
| `.env.deploy` | 生产环境变量（DOMAIN, SECRET_KEY, DB 密码等） |
| `.env.deploy.local` | build 验证用（密码与开发环境一致） |
| `docker-compose.yml` | 本地 Docker 开发 |
| `docker-compose-deploy.yml` | 生产部署（拉取 ACR 镜像，不构建） |

## 7. 关键设计决策

1. **同步 ORM 而非异步**: SQLModel 对同步支持更成熟，4 个 uvicorn worker 提供足够并发能力，且调试更直观。

2. **两步式 Excel 导入**: 上传预览 → 确认导入，让用户在实际写入数据库前校验数据，图片提取在预览阶段完成，避免导入阶段处理大文件。

3. **Savepoint 逐行回滚**: 导入时每行使用独立的 `session.begin_nested()` savepoint，单行失败只回滚该行，不影响同批次其他数据。

4. **按运营商分组导出**: `ExportGroup` 允许为移动/电信定义不同的导出字段集，解决不同运营商对报备信息字段要求不一致的问题。

5. **LocalFileStorage 为默认**: 生产环境目前使用本地文件存储，MinIO 作为可选后端通过 `STORAGE_BACKEND=minio` 启用，降低小规模部署的运维复杂度。

6. **前端静态 Mock 数据**: 为 Demo 部署场景保留静态 Mock 数据能力，`frontend/src/lib/mock/` 目录下的数据文件可在无后端时独立展示 UI。
