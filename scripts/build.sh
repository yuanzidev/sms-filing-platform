#!/bin/bash

# ====================================
# SMS Filing Platform 镜像构建脚本
# 构建、启动服务并推送镜像到私有仓库
# ====================================

set -e

# 获取脚本所在目录的父目录（项目根目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

COMPOSE_FILE="docker-compose.yml"

# 环境配置文件
ENV_FILE_LOCAL=".env.deploy.local"   # 本地测试环境
ENV_FILE_PROD=".env.deploy"          # 生产环境

# 私有仓库配置
PRIVATE_REGISTRY="docker.runyz.com"

# 打印函数
print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

print_banner() {
    echo -e "${GREEN}"
    echo "======================================"
    echo "   SMS Filing Platform 镜像构建脚本"
    echo "======================================"
    echo -e "${NC}"
}

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 未安装，请先安装"
        exit 1
    fi
}

# 检查环境变量文件
check_env_files() {
    # 检查生产环境配置（用于构建和推送）
    if [ ! -f "$ENV_FILE_PROD" ]; then
        print_warning "$ENV_FILE_PROD 不存在"
        if [ -f "${ENV_FILE_PROD}.example" ]; then
            print_info "从 ${ENV_FILE_PROD}.example 复制..."
            cp "${ENV_FILE_PROD}.example" "$ENV_FILE_PROD"
            print_warning "请编辑 $ENV_FILE_PROD 配置生产环境变量后重新运行"
            exit 1
        else
            print_error "${ENV_FILE_PROD}.example 也不存在"
            exit 1
        fi
    fi

    # 检查本地测试环境配置（用于启动服务）
    if [ ! -f "$ENV_FILE_LOCAL" ]; then
        print_warning "$ENV_FILE_LOCAL 不存在，将使用 $ENV_FILE_PROD 启动服务"
        ENV_FILE_LOCAL="$ENV_FILE_PROD"
    fi

    # 加载生产环境变量（用于镜像名称等）
    export $(grep -v '^#' "$ENV_FILE_PROD" | grep -v '^$' | xargs)

    print_success "构建配置: $ENV_FILE_PROD"
    print_success "运行配置: $ENV_FILE_LOCAL"
}

# 构建镜像（使用生产配置）
build_images() {
    print_info "构建镜像 (linux/amd64)..."
    echo

    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE_PROD" build \
        --progress=plain

    print_success "镜像构建完成"
}

# 验证镜像启动（验证完成后自动停止）
validate_images() {
    print_info "验证镜像启动（验证完成后自动停止）..."
    print_info "拉取 linux/amd64 基础镜像..."
    docker pull --platform linux/amd64 postgres:${POSTGRES_TAG:-17}
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE_LOCAL" down || true

    local exit_code=0
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE_LOCAL" up -d --wait || exit_code=$?

    if [ $exit_code -ne 0 ]; then
        print_error "镜像验证失败，打印各服务日志："
        docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE_LOCAL" logs
    fi

    print_info "清理本地服务..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE_LOCAL" down

    if [ $exit_code -ne 0 ]; then
        print_error "镜像验证未通过，终止推送"
        exit 1
    fi

    print_success "镜像验证通过"
}

# 推送单个镜像
push_image() {
    local service_name=$1
    local image_name=$2
    local tag=${TAG:-latest}
    local full_image_name="${image_name}:${tag}"
    local registry_image="${PRIVATE_REGISTRY}/${image_name}:${tag}"
    local push_log

    print_info "推送镜像: $service_name ($full_image_name -> $registry_image)"

    # 检查本地镜像是否存在
    if ! docker image inspect "$full_image_name" &> /dev/null; then
        print_error "镜像 $full_image_name 不存在"
        return 1
    fi

    # 打标签并推送
    if ! docker tag "$full_image_name" "$registry_image"; then
        print_error "镜像 $full_image_name 打标签失败"
        return 1
    fi

    push_log="$(mktemp -t sms-filing-push-${service_name}.XXXXXX)"
    set +e
    docker push "$registry_image" 2>&1 | tee "$push_log"
    local push_status=${PIPESTATUS[0]}
    set -e

    if [ $push_status -ne 0 ]; then
        print_error "  $service_name 推送失败"
        if grep -q "413 Request Entity Too Large" "$push_log"; then
            print_error "  发现 413 错误：仓库限制上传大小，请调整仓库侧 client_max_body_size"
        elif grep -q "dial tcp: lookup" "$push_log"; then
            print_error "  发现 DNS 解析失败：请检查构建机 DNS 或网络连通性"
        fi
        print_error "  推送日志（最近 30 行）："
        tail -n 30 "$push_log" || true
        rm -f "$push_log"
        return 1
    fi

    if grep -q "413 Request Entity Too Large" "$push_log"; then
        print_error "  检测到 413 错误：仓库限制上传大小"
        print_error "  推送日志（最近 30 行）："
        tail -n 30 "$push_log" || true
        rm -f "$push_log"
        return 1
    fi

    rm -f "$push_log"
    print_success "  $service_name 推送成功"
}

# 推送所有镜像
push_all_images() {
    print_info "推送镜像到私有仓库 $PRIVATE_REGISTRY ..."
    echo

    local failed_images=()

    # 推送后端镜像
    if ! push_image "backend" "${DOCKER_IMAGE_BACKEND:-sms-filing-backend}"; then
        failed_images+=("backend")
    fi

    # 推送前端镜像
    if ! push_image "frontend" "${DOCKER_IMAGE_FRONTEND:-sms-filing-frontend}"; then
        failed_images+=("frontend")
    fi

    # 检查是否有失败
    if [ ${#failed_images[@]} -gt 0 ]; then
        print_error "以下镜像推送失败: ${failed_images[*]}"
        return 1
    fi

    return 0
}

# 显示访问信息
show_access_info() {
    local tag=${TAG:-latest}

    echo
    print_success "======================================"
    print_success "   镜像构建及推送完成！"
    print_success "======================================"
    echo
    print_info "已推送的镜像:"
    echo -e "  ${GREEN}• ${PRIVATE_REGISTRY}/${DOCKER_IMAGE_BACKEND:-sms-filing-backend}:${tag}${NC}"
    echo -e "  ${GREEN}• ${PRIVATE_REGISTRY}/${DOCKER_IMAGE_FRONTEND:-sms-filing-frontend}:${tag}${NC}"
    echo
}

# 主函数
main() {
    print_banner

    # 检查依赖
    print_info "检查系统依赖..."
    check_command docker
    check_command "docker compose"
    print_success "Docker 和 Docker Compose 已安装"

    # 检查环境配置
    check_env_files
    export DOCKER_DEFAULT_PLATFORM=linux/amd64

    # 记录开始时间
    start_time=$(date +%s)

    # 执行构建
    build_images
    validate_images

    # 推送镜像到私有仓库
    push_all_images

    # 显示结果
    show_access_info

    # 显示耗时
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    echo -e "${BLUE}总耗时: ${duration} 秒${NC}"
}

main "$@"
