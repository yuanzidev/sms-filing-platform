FROM docker.m.daocloud.io/library/python:3.14

ENV PYTHONUNBUFFERED=1

WORKDIR /app/

# Install uv using pip (more reliable than multi-stage build)
RUN pip install --no-cache-dir uv==0.5.11

# Place executables in the environment at the front of the path
# Ref: https://docs.astral.sh/uv/guides/integration/docker/#using-the-environment
ENV PATH="/app/.venv/bin:$PATH"

# Compile bytecode
# Ref: https://docs.astral.sh/uv/guides/integration/docker/#compiling-bytecode
ENV UV_COMPILE_BYTECODE=1

# uv Cache
# Ref: https://docs.astral.sh/uv/guides/integration/docker/#caching
ENV UV_LINK_MODE=copy

# 增加网络超时时间和重试次数，解决网络问题
ENV UV_HTTP_TIMEOUT=1200
ENV UV_CONCURRENT_DOWNLOADS=2
ENV UV_NO_CACHE=0
ENV UV_REQUEST_TIMEOUT=60

# 配置使用国内镜像源，默认清华源，阿里云作备用
ARG PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple
ENV UV_INDEX_URL=${PIP_INDEX_URL}
ENV PIP_INDEX_URL=${PIP_INDEX_URL}

# 备选镜像源配置
ENV UV_EXTRA_INDEX_URL="https://mirrors.aliyun.com/pypi/simple/"

# 创建虚拟环境并安装依赖
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    sh -c "set -e && echo '=== 开始创建虚拟环境...' && uv venv .venv && echo '=== 虚拟环境创建完成' && echo '=== 开始安装依赖...' && uv sync --frozen --no-install-project"

ENV PYTHONPATH=/app

COPY ./scripts /app/scripts

COPY ./pyproject.toml ./uv.lock ./alembic.ini ./.env /app/

COPY ./app /app/app

# Sync the project
# Ref: https://docs.astral.sh/uv/guides/integration/docker/#intermediate-layers
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync

CMD ["fastapi", "run", "--workers", "4", "app/main.py"]
