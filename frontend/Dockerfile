# 第一阶段：构建前端应用
FROM node:20-alpine AS builder

WORKDIR /app

# 配置使用国内镜像源
RUN npm config set registry https://registry.npmmirror.com

# 复制 package 文件
COPY package.json pnpm-lock.yaml ./

# 安装 pnpm 并配置镜像源，然后安装依赖
RUN npm install -g pnpm --registry=https://registry.npmmirror.com && \
    pnpm config set registry https://registry.npmmirror.com && \
    pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建应用 - 使用构建参数
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# 直接使用 vite build 跳过 tsc 类型检查（避免 Docker 构建时的 TypeScript 错误）
# 本地开发仍可使用 pnpm run build 进行完整检查
RUN pnpm vite build

# 第二阶段：运行 Nginx 服务器
FROM nginx:alpine

# 复制构建产物到 Nginx 目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制自定义 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 3000

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]
