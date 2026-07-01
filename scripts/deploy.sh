#!/bin/bash

# ====================================
# SMS Filing Platform 远程部署脚本
# 通过 SSH 到目标服务器,完成镜像拉取与服务重启
# 支持初次部署与后续更新(基于镜像 tag)
# ====================================

set -e

# ------------------------------------
# 配置
# ------------------------------------
SSH_HOST="${SSH_HOST:-sms}"                              # SSH 别名(IP/端口由 ~/.ssh/config 解析)
REMOTE_DIR="${REMOTE_DIR:-/opt/sms-filing-platform}"    # 服务器上项目目录
COMPOSE_FILE="docker-compose-deploy.yml"
ENV_FILE=".env.deploy"
HEALTH_PATH="/api/v1/utils/health-check/"               # 后端健康检查路径(经前端 nginx 代理)
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-90}"                  # 健康检查最长等待秒数

# 版本 tag:默认与 build.sh 一致(本地 git short sha),可被 IMAGE_TAG 环境变量覆盖
VERSION_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD 2>/dev/null || echo latest)}"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error()   { echo -e "${RED}[ERROR]${NC} $1"; }

print_banner() {
    echo -e "${GREEN}"
    echo "======================================"
    echo "  SMS Filing Platform 远程部署"
    echo "  目标: ${SSH_HOST}:${REMOTE_DIR}"
    echo "  版本: ${VERSION_TAG}"
    echo "======================================"
    echo -e "${NC}"
}

# ------------------------------------
# 前置检查
# ------------------------------------
preflight() {
    print_info "前置检查..."

    # 本地文件
    if [ ! -f "$COMPOSE_FILE" ]; then
        print_error "未找到 $COMPOSE_FILE"
        exit 1
    fi
    if [ ! -f "$ENV_FILE" ]; then
        print_error "未找到 $ENV_FILE(生产环境配置)"
        print_error "请从 .env.deploy.example 复制并填写真实值后重试"
        exit 1
    fi

    # SSH 连通性
    if ! ssh -o ConnectTimeout=10 -o BatchMode=true "$SSH_HOST" 'true' 2>/dev/null; then
        print_error "无法通过 SSH 连接 '$SSH_HOST'(检查 ~/.ssh/config 与密钥)"
        exit 1
    fi

    print_success "前置检查通过"
}

# ------------------------------------
# 同步 compose + env 到服务器
# ------------------------------------
sync_files() {
    print_info "同步 $COMPOSE_FILE 与 $ENV_FILE 到 ${SSH_HOST}:${REMOTE_DIR}/ ..."

    # 创建目录(幂等)
    ssh "$SSH_HOST" "mkdir -p '$REMOTE_DIR'"

    # 上传部署描述与配置(以本地为权威,覆盖远端旧版本)
    scp -q "$COMPOSE_FILE" "$SSH_HOST:$REMOTE_DIR/$COMPOSE_FILE"
    scp -q "$ENV_FILE"     "$SSH_HOST:$REMOTE_DIR/$ENV_FILE"

    print_success "同步完成"
}

# ------------------------------------
# 校验 ACR 已登录(若未登录则给出指引)
# ------------------------------------
ensure_registry_login() {
    print_info "检查服务器是否已登录阿里云 ACR..."
    local logged_in
    logged_in=$(ssh "$SSH_HOST" "test -f ~/.docker/config.json && grep -c 'crpi-nnm7kvwebfzqh8so.cn-hangzhou.personal.cr.aliyuncs.com' ~/.docker/config.json || echo 0")
    if [ "$logged_in" = "0" ]; then
        print_error "服务器尚未登录阿里云 ACR,无法拉取镜像"
        print_error "请在服务器上执行一次:"
        print_error "  ssh $SSH_HOST"
        print_error "  docker login crpi-nnm7kvwebfzqh8so.cn-hangzhou.personal.cr.aliyuncs.com"
        print_error "完成后再重试本脚本"
        exit 1
    fi
    print_success "ACR 凭证已配置"
}

# ------------------------------------
# 远程拉取镜像
# 拉取前用 docker manifest 校验镜像架构与服务器匹配,避免启动时 exec format error
# ------------------------------------
pull_images() {
    print_info "在服务器上拉取镜像(TAG=${VERSION_TAG})..."

    # ACR 上的镜像名(从 docker-compose-deploy.yml 提取)
    local registry="crpi-nnm7kvwebfzqh8so.cn-hangzhou.personal.cr.aliyuncs.com/feixinyun"
    local backend_img="${registry}/sms-filing-backend:${VERSION_TAG}"
    local frontend_img="${registry}/sms-filing-frontend:${VERSION_TAG}"

    # 架构检查(若镜像不存在或 manifest 拉取失败,给出明确提示)
    print_info "校验镜像架构(应为 linux/amd64)..."
    local missing
    missing=$(ssh "$SSH_HOST" "
        for img in '$backend_img' '$frontend_img'; do
            if ! docker manifest inspect \"\$img\" >/dev/null 2>&1; then
                echo \"\$img\"
            fi
        done
    ")
    if [ -n "$missing" ]; then
        print_error "ACR 上找不到以下镜像(确认已构建并推送版本 tag):"
        echo "$missing" | sed 's/^/    /'
        print_error "提示:当前 git 版本为 ${VERSION_TAG},请先运行 ./scripts/build.sh 推送该版本镜像"
        exit 1
    fi

    # 拉取(docker compose pull)
    ssh "$SSH_HOST" "cd '$REMOTE_DIR' && TAG='$VERSION_TAG' docker compose -f $COMPOSE_FILE --env-file $ENV_FILE pull"
    print_success "镜像拉取完成"
}

# ------------------------------------
# (重新)启动服务
# ------------------------------------
rollout() {
    print_info "启动 / 滚动更新服务..."
    ssh "$SSH_HOST" "cd '$REMOTE_DIR' && TAG='$VERSION_TAG' docker compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d --wait || (docker compose -f $COMPOSE_FILE logs --tail=100 && exit 1)"
    print_success "服务已启动"
}

# ------------------------------------
# 健康检查(经前端 nginx 代理)
# ------------------------------------
health_check() {
    print_info "健康检查(最长 ${HEALTH_TIMEOUT}s)..."
    local start elapsed http_code
    start=$(date +%s)

    while true; do
        elapsed=$(( $(date +%s) - start ))
        if [ "$elapsed" -gt "$HEALTH_TIMEOUT" ]; then
            print_error "健康检查超时(${HEALTH_TIMEOUT}s)"
            ssh "$SSH_HOST" "cd '$REMOTE_DIR' && docker compose -f $COMPOSE_FILE --env-file $ENV_FILE ps && docker compose -f $COMPOSE_FILE logs --tail=50"
            exit 1
        fi

        # 通过服务器本地端口 30100 走 nginx 代理到 backend
        http_code=$(ssh "$SSH_HOST" "curl -s -o /dev/null -w '%{http_code}' http://localhost:30100${HEALTH_PATH}" 2>/dev/null || echo "000")

        if [ "$http_code" = "200" ]; then
            print_success "健康检查通过(HTTP 200, ${elapsed}s)"
            return 0
        fi
        echo -ne "  等待服务就绪... (${elapsed}s, HTTP ${http_code})\r"
        sleep 3
    done
}

# ------------------------------------
# 展示部署结果
# ------------------------------------
show_status() {
    echo
    print_success "======================================"
    print_success "  部署完成"
    print_success "======================================"
    echo
    print_info "当前版本: ${VERSION_TAG}"
    print_info "服务器容器状态:"
    ssh "$SSH_HOST" "cd '$REMOTE_DIR' && docker compose -f $COMPOSE_FILE --env-file $ENV_FILE ps"
    echo
    print_info "访问地址:"
    local domain
    domain=$(grep -E '^DOMAIN=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '"')
    if [ -n "$domain" ]; then
        echo -e "  ${GREEN}• http://${domain}:30100${NC}"
    else
        echo -e "  ${GREEN}• http://<服务器IP>:30100${NC}"
    fi
    echo
    print_info "查看日志: ssh $SSH_HOST 'cd $REMOTE_DIR && docker compose -f $COMPOSE_FILE logs -f'"
    print_info "回滚到旧版本: IMAGE_TAG=<旧tag> $0"
}

# ------------------------------------
# 主流程
# ------------------------------------
main() {
    print_banner
    preflight
    sync_files
    ensure_registry_login
    pull_images
    rollout
    health_check
    show_status
}

main "$@"
