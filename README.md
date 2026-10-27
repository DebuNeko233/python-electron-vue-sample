# Python + Electron + Vue 桌面应用模板

基于 **Vue 3 + TypeScript + Electron + Python FastAPI + uv** 的简洁可维护脚手架。
包含三个真实通信示例：Electron IPC、HTTP 请求、WebSocket 实时任务进度。

## 开发环境

Windows x64、Node.js 22+、pnpm（也可用 npm）以及 [uv](https://docs.astral.sh/uv/getting-started/installation/)。
上述环境仅用于开发，最终用户无需安装 Python、Node.js 或 uv。

```powershell
pnpm install
pnpm dev
```

在 Windows，`pnpm dev` 会分别打开 **Python 后端** 和 **Electron/Vue 前端** 两个终端。
如果 `.venv` 不存在，`uv run` 会自动准备环境。前端可以单独运行，后端离线时显示状态。

| 命令 | 功能 |
| --- | --- |
| `pnpm dev` | Windows 下自动打开两个开发终端 |
| `pnpm dev:backend` | 独立启动 FastAPI，支持热重载 |
| `pnpm dev:frontend` | 独立启动 Electron/Vue |
| `pnpm dev:combined` | 一个终端启动两个进程 |
| `pnpm python:use 3.11` | 删除 `.venv`，安装指定 Python 和全部依赖 |
| `pnpm python:list` | 查看可选 Python |
| `pnpm python:info` | 显示当前解释器 |
| `pnpm test:backend` | 执行 Python 测试 |
| `pnpm typecheck` | 检查 Vue 和 TypeScript |
| `pnpm build` | 打包 Windows x64 绿色目录 |
| `pnpm clean` | 只清理可重新生成的构建产物 |

使用 npm 时可以将以上 `pnpm <命令>` 改为 `npm run <命令>`。

## Windows 绿色目录

```powershell
pnpm build
```

发布目录为 `dist/win-unpacked/`。将**整个目录**复制到无网络的目标电脑，双击其中的
`SampleApp.exe` 即可。不能只复制 EXE，旁边的 Electron 和 Python 资源也属于发布包。

打包脚本不会复制开发 `.venv`，而是用 uv 准备全新的独立 CPython、安装依赖、
打包前端并运行基础导入测试。正式发布前仍需在无 Python/Node 的 Windows 电脑上验证。

## 标准目录和业务示例

前端使用 `views / components / composables / services / styles`，后端使用 `api / services / core`。
这里面的文件是已经接通 HTTP、WebSocket 与 IPC 的可运行示例，不是空目录。

详见 [标准目录结构与扩展教程](docs/project-structure.md)。

## 从哪里开始开发

- `src/renderer/src/App.vue` — 顶层 Vue 页面容器
- `src/renderer/src/views/HomeView.vue` — 首页组装
- `src/renderer/src/components/` — HTTP、任务、IPC、实时事件组件
- `src/renderer/src/services/backend-api.ts` — 类型化的 HTTP 调用
- `backend/src/sample_backend/main.py` — FastAPI 应用装配
- `backend/src/sample_backend/api/routes.py` — HTTP API
- `backend/src/sample_backend/services/demo_jobs.py` — 后台任务
- `src/main/backend-manager.ts` — Python 启动、关闭及异常处理
- `src/main/index.ts` — Electron 窗口及 IPC
- `src/preload/index.ts` — 向 Vue 暴露受限桌面操作

更多说明见 [架构文档](docs/architecture.md)。

## 版本与离线依赖

仓库已提交 `backend/uv.lock` 与 `pnpm-lock.yaml`，日常 CI 使用锁定安装校验依赖。
更改 Python 依赖后由 uv 更新锁文件，并一起提交；不要手工编辑锁文件。
第一版聚焦 Windows x64 的通用软件；CUDA、摄像头驱动、厂商 SDK 和额外 DLL 需要业务项目单独测试。

Windows 的 GitHub Actions 成功运行后，可在该运行的 Artifacts 下载 `SampleApp-windows-x64`，解压后双击 `SampleApp.exe`。

构建后的 Windows CI 还会启动真正的 `SampleApp.exe --smoke-test`（不打开窗口），验证 Electron 能启动内置 Python、完成 HTTP 通信并退出，检查 Python PID 不再存在。

## 新增的可靠性功能

- Python 连接中断时，界面显示原因并提供“重新连接”；独立开发后端仍由开发者控制。
- HTTP 示例任务支持取消和状态查询，WebSocket 重连后会尝试重新同步任务进度。
- 发行版可通过 `--smoke-test` 验证 Electron → Python 的启动、通信和正常退出；CI 还检测强制结束 Electron 后的 Python 自行退出。
- 开发版的“打开日志目录”优先打开 Python 日志（`~/.python-electron-vue-sample/logs`）；打包版打开应用数据目录中的日志。

## Python 构建缓存

`pnpm build` 不会每次重新下载 Python。它先用 `uv python find` 检查当前用户的 **uv-managed Python**，如果已经安装，就直接复制一份到发布构建目录；只有第一次缺少指定版本时才会执行 `uv python install`。更改 `.python-version` 到尚未安装的版本时也可能需要下载一次。`pnpm clean` 只清理项目构建文件，**不会删除 uv 的全局 Python 安装或依赖缓存**。

每次构建仍会重新生成干净的 Python 发行副本并安装项目依赖，避免发行包引用开发机路径或修改本机缓存的解释器。
