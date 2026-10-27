# 更新日志（Changelog）

本文件记录版本发布、功能变化、可靠性改进及构建行为调整。项目介绍、启动命令和开发文档请查看 [README](README.md)。

## [Unreleased]

### 文档

- 精简 README，使其专注于项目定位、核心能力、快速启动、构建和学习入口。
- 将历史功能迭代、可靠性改进和构建缓存说明集中到本文件，便于追踪版本变化。

## [1.0.0] - 2026-10-27

首个稳定基线：Electron + Vue 3 + TypeScript + FastAPI + uv 的 Windows x64 桌面应用模板。

### 开发体验

- 支持 `pnpm dev` 分别启动 Python 后端与 Electron/Vue 前端，前后端均可独立调试。
- Windows 双终端启动改用 PowerShell `Start-Process`，修复原先将 `"Python backend"` 误识别为文件名的命令行引号问题。
- 通过 uv 管理 Python 版本及依赖；切换 Python 版本时删除并重建整个开发 `.venv`。
- 前端代码拆分为 `views/`、`components/`、`composables/`、`services/`，后端拆分为 `api/`、`services/`、`core/`。

### 通信与界面

- 提供 Electron IPC、FastAPI HTTP 和 WebSocket 的可运行示例。
- 增加 Python 后端离线/失败的诊断提示及手动重新连接入口。
- 示例任务增加状态查询、取消功能；WebSocket 重新连接后可通过 HTTP 获取任务当前状态。
- 修复旧 WebSocket 连接迟到的关闭事件干扰新连接状态的问题。
- 侧边栏由静态锚点调整为真正的页面切换按钮，支持“应用概览、HTTP 示例、实时任务、IPC 示例”；切换时保留正在运行的任务界面状态。
- 开发版的“打开日志目录”优先打开独立 Python 的日志目录，发行版打开应用数据目录中的日志。

### Python 发行与进程管理

- 发行版由 Electron 自动启动内置 Python，使用动态本机端口、随机会话令牌和就绪握手。
- 正常关闭时请求后端优雅退出；超时后清理受托管进程。Python 通过父进程监测处理 Electron 意外终止的场景。
- 构建发行包时复制**独立的 CPython 运行时**，不复制开发用 `.venv`，最终用户无需安装 Python、Node.js 或 uv。
- **修复重复下载 Python 的问题**：构建优先通过 `uv python find` 查找本机已安装的 uv-managed Python，并复制至干净的发行目录；只有缺少指定版本时才通过 `uv python install` 安装一次。
- 每次构建仍会重新生成发行目录并安装项目正式依赖，避免发布产物引用开发机的虚拟环境或修改全局解释器。
- `pnpm clean` 只清理项目生成的构建文件，不删除 uv 的全局 Python 安装及依赖缓存。

### 测试与文档

- 提供 Python API、后台任务、任务取消、应用装配等测试，以及 TypeScript/Vue 类型检查。
- Windows CI 验证绿色目录、包内 Python HTTP/WebSocket、会话认证、日志、正常退出，以及打包的 Electron 启动与通信。
- 增加仅强制结束 Electron 的回归测试，检查受托管 Python 能通过父进程监测自行退出。
- 增加实际侧边栏导航和任务状态保留的打包版 Electron 冒烟测试。
- 提供首次运行、通信契约、目录说明、业务扩展示例、项目定制、故障排查及 AI 开发约定文档。
- 增加文档内部链接检查，降低重构后出现失效说明的风险。

### 已知范围

- 当前发行目标为 Windows x64。
- 未内置自动更新、业务数据库、持久化任务队列或 GPU/硬件 SDK 通用封装。
- 原生 DLL、模型、驱动及设备安全停机需在具体业务和目标电脑上单独验证。

[1.0.0]: https://github.com/DebuNeko233/python-electron-vue-sample/tree/1.0.0
