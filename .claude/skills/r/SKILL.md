---
name: r
description: Use when the user types "/r", "r", "构建部署", "发布", "build and deploy", "deploy", or otherwise asks for a one-shot release of the SMS Filing Platform — runs build.sh then deploy.sh in sequence
---

# r — 构建 + 部署 一键流程

## Overview

项目级快捷命令：依次执行 `./scripts/build.sh` 和 `./scripts/deploy.sh`，把当前 main 分支的代码构建成 Docker 镜像、推送到阿里云 ACR，再滚动更新到生产服务器（`sms` = `39.105.3.36:30100`）。

## When to Use

触发条件（任一即可）：
- 用户输入 `/r`、`r`、`发布`、`构建部署`、`build and deploy`、`deploy`
- 用户要求"上线当前改动"、"推到生产"、"发版"

**不要在以下情况使用：**
- 只想推送代码到 git（用 git push 即可）
- 只想本地起开发服务（用 `fastapi dev` / `pnpm dev`）
- 只想构建不部署（直接调用 `./scripts/build.sh`）
- 只想回滚（用 `IMAGE_TAG=<旧tag> ./scripts/deploy.sh`）

## Workflow

按顺序执行以下两步，**两步都必须等命令完整结束并退出码为 0 才算成功**。任何一步失败立即停止，不要尝试继续。

### Step 1: 构建并推送镜像

```bash
./scripts/build.sh
```

要点：
- timeout 至少 600000ms（10 分钟），构建可能较慢
- 该脚本会构建 backend + frontend 两个镜像，推送 `latest` 和 `<git-short-sha>` 两个 tag 到 ACR
- 脚本本身会做启动验证（本地起容器、健康检查）再推送，失败会自动停止
- 成功标志：末尾输出 `镜像构建及推送完成！`，并打印版本 tag（如 `2bce498`）

### Step 2: 部署到生产

```bash
./scripts/deploy.sh
```

要点：
- timeout 至少 300000ms（5 分钟）
- 通过 SSH 连接 `sms` 别名拉取镜像并 `docker compose up -d --wait`
- 末尾输出 `部署完成` + 健康检查 `HTTP 200` 即成功
- 成功输出会包含当前版本 tag、容器状态表、访问地址

## Quick Reference

| 阶段 | 命令 | 超时 | 成功标志 |
|------|------|------|---------|
| 构建 | `./scripts/build.sh` | 600000ms | `镜像构建及推送完成！` |
| 部署 | `./scripts/deploy.sh` | 300000ms | `部署完成` + 健康检查通过 |

## Common Mistakes

- **没有等命令完整结束就开始下一步**：两个脚本都是同步阻塞，必须等退出码
- **遇到 hook / lint 失败用 `--no-verify` 绕过**：不要绕过，修复根因
- **构建失败后尝试部署**：构建失败不会有新 tag，部署也是徒劳；先修复构建
- **直接修改服务器配置**：所有配置变更通过 `docker-compose-deploy.yml` + `.env.deploy` 同步，不要 SSH 上去手改

## Rollback

如果部署后发现问题，回滚到上一个版本：

```bash
IMAGE_TAG=<旧tag> ./scripts/deploy.sh
```

旧 tag 可以从 `git log --oneline -20` 或 ACR 控制台查到。

## 参考内存

完整构建部署细节见 memory：`build-deploy.md`。
