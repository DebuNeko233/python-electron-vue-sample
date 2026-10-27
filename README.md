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

## 从哪里开始开发

- `src/renderer/src/App.vue` — Vue 示例界面
- `backend/src/sample_backend/api.py` — HTTP 与 WebSocket API
- `backend/src/sample_backend/jobs.py` — Python 后台任务
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
