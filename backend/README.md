# SMS Filing Management Platform - Backend

SMS 报备管理平台后端服务,基于 FastAPI + SQLModel + PostgreSQL。

## 环境要求

### 必需环境
* **Python**: >=3.12
* **[uv](https://docs.astral.sh/uv/)**: Python 包和环境管理工具
* **PostgreSQL**: 数据库服务

### 可选环境
* **Docker**: 用于容器化部署

### 安装 uv
```bash
# Linux/macOS
curl -LsSf https://astral.sh/uv/install.sh | sh

# 或使用 pip
pip install uv
```

## 开发部署

### 1. 克隆项目
```bash
git clone <repo-url>
cd sms-filing-platform/backend
```

### 2. 安装依赖
```bash
uv sync
```

### 3. 环境配置

在 `backend/` 目录内创建 `.env` 文件,配置以下环境变量:

```env
# 项目配置
PROJECT_NAME="SMS Filing Management Platform"

# 数据库配置
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432
POSTGRES_USER=sms_filing
POSTGRES_PASSWORD=changethis
POSTGRES_DB=sms_filing

# 安全配置
SECRET_KEY=changethis  # 生产环境请使用强随机密钥
FIRST_SUPERUSER=admin@sms-filing.example.com
FIRST_SUPERUSER_PASSWORD=changethis

ENVIRONMENT=local
```

### 4. 数据库初始化
```bash
./scripts/prestart.sh
```

该脚本会:
- 检查数据库连接
- 运行 Alembic 数据库迁移
- 创建初始数据(包括超级用户)

### 5. 启动开发服务器
```bash
fastapi dev app/main.py

# 或
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

服务启动后访问:
- API 文档: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 目录结构

```
backend/
├── app/
│   ├── api/           # API 路由
│   │   ├── routes/    # 路由模块(login, users, roles, login_logs, operation_logs, utils)
│   │   ├── deps.py    # 依赖注入
│   │   └── main.py    # 路由聚合
│   ├── core/          # 核心(config, db, security, timezone)
│   ├── crud/          # 数据库操作层(user, role)
│   ├── models/        # SQLModel 模型(user, role, auth, login_log, operation_log)
│   ├── alembic/       # 数据库迁移
│   ├── tests/         # 测试
│   ├── utils.py
│   ├── initial_data.py
│   └── backend_pre_start.py
├── scripts/           # 辅助脚本(prestart, lint, test, format)
├── Dockerfile
├── pyproject.toml
└── README.md
```

## 代码规范

```bash
uv run ruff check .   # 代码检查
uv run mypy .         # 类型检查
uv run pytest         # 单元测试
```
