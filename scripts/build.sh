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

# 私有仓库配置 (阿里云 ACR 华东1 个人版)
PRIVATE_REGISTRY="crpi-nnm7kvwebfzqh8so.cn-hangzhou.personal.cr.aliyuncs.com/feixinyun"

# 本地 compose 项目前缀(docker compose build 产生的镜像名为 <前缀>-<service>)
LOCAL_IMAGE_PREFIX="${COMPOSE_PROJECT_NAME:-sms-filing-platform}"

# 版本 tag:默认使用 git short sha,可通过 IMAGE_TAG 环境变量覆盖
# 推送时除 latest 外,会同时推送这个版本 tag,便于回滚
VERSION_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD 2>/dev/null || echo unknown)}"

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

# 推送单个镜像(latest + 版本 tag)
push_image() {
    local service_name=$1
    local image_name=$2
    local tag=${TAG:-latest}
    # 本地镜像名:docker compose build 生成 <project>-<service>:tag
    # 远程镜像名:${PRIVATE_REGISTRY}/${image_name}:tag
    local local_full="${LOCAL_IMAGE_PREFIX}-${service_name}:${tag}"
    local push_log

    # 推送 tag 列表:latest + 版本 tag(若与 latest 不同)
    local tags_to_push=("$tag")
    if [ -n "$VERSION_TAG" ] && [ "$VERSION_TAG" != "$tag" ]; then
        tags_to_push+=("$VERSION_TAG")
    fi

    print_info "推送镜像: $service_name ($local_full -> ${PRIVATE_REGISTRY}/${image_name}:{${tags_to_push[*]}})"

    # 检查本地镜像是否存在
    if ! docker image inspect "$local_full" &> /dev/null; then
        print_error "镜像 $local_full 不存在"
        return 1
    fi

    local remote_tag registry_image push_status
    for remote_tag in "${tags_to_push[@]}"; do
        registry_image="${PRIVATE_REGISTRY}/${image_name}:${remote_tag}"

        # 打标签
        if ! docker tag "$local_full" "$registry_image"; then
            print_error "镜像 $local_full 打标签 ${registry_image} 失败"
            return 1
        fi

        # 推送
        push_log="$(mktemp -t sms-filing-push-${service_name}.XXXXXX)"
        set +e
        docker push "$registry_image" 2>&1 | tee "$push_log"
        push_status=${PIPESTATUS[0]}
        set -e

        if [ $push_status -ne 0 ]; then
            print_error "  $service_name:$remote_tag 推送失败"
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
    done

    print_success "  $service_name 推送成功 (tags: ${tags_to_push[*]})"
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

# 清理旧版本镜像（保留 latest）
cleanup_old_images() {
    print_info "清理本地旧版本镜像..."

    local count=0
    while IFS= read -r img; do
        [ -z "$img" ] && continue
        docker rmi "$img" 2>/dev/null && count=$((count + 1))
    done < <(docker images --format '{{.Repository}}:{{.Tag}}' \
        | grep "${PRIVATE_REGISTRY}/${DOCKER_IMAGE_BACKEND:-sms-filing-backend}" \
        | grep -v ':latest' || true)

    while IFS= read -r img; do
        [ -z "$img" ] && continue
        docker rmi "$img" 2>/dev/null && count=$((count + 1))
    done < <(docker images --format '{{.Repository}}:{{.Tag}}' \
        | grep "${PRIVATE_REGISTRY}/${DOCKER_IMAGE_FRONTEND:-sms-filing-frontend}" \
        | grep -v ':latest' || true)

    if [ "$count" -gt 0 ]; then
        print_success "已清理 ${count} 个旧版本镜像"
    else
        print_info "没有需要清理的旧版本镜像"
    fi

    # 每周清理一次构建缓存（通过标记文件判断）
    local cache_marker="/tmp/.sms-build-cache-clean"
    local should_clean=false
    if [ ! -f "$cache_marker" ]; then
        should_clean=true
    else
        local last_clean
        last_clean=$(stat -f %m "$cache_marker" 2>/dev/null || stat -c %Y "$cache_marker" 2>/dev/null || echo 0)
        local now
        now=$(date +%s)
        local week_secs=604800
        if [ $((now - last_clean)) -gt $week_secs ]; then
            should_clean=true
        fi
    fi

    if [ "$should_clean" = true ]; then
        print_info "清理构建缓存（每周一次）..."
        docker builder prune -f >/dev/null 2>&1 && \
            touch "$cache_marker" && \
            print_success "构建缓存已清理"
    fi
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
    if [ -n "$VERSION_TAG" ] && [ "$VERSION_TAG" != "$tag" ]; then
        echo
        print_info "版本 tag (便于回滚):"
        echo -e "  ${GREEN}• ${PRIVATE_REGISTRY}/${DOCKER_IMAGE_BACKEND:-sms-filing-backend}:${VERSION_TAG}${NC}"
        echo -e "  ${GREEN}• ${PRIVATE_REGISTRY}/${DOCKER_IMAGE_FRONTEND:-sms-filing-frontend}:${VERSION_TAG}${NC}"
    fi
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

    # 清理本地旧版本镜像
    cleanup_old_images

    # 显示结果
    show_access_info

    # 显示耗时
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    echo -e "${BLUE}总耗时: ${duration} 秒${NC}"
}

main "$@"
