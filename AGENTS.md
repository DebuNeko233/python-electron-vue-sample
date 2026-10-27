# AI / 人类开发者交接指南（AGENTS.md）

本仓库是一份轻量 **Electron + Vue 3 + TypeScript + Python FastAPI + uv**
Windows x64 桌面软件样例，不是某个具体业务软件。

**目标：别人或 AI 不依赖以往聊天记录，也能读懂、扩展、测试与打包。**
代码是当前行为的最终依据；文档与代码不一致时先检查实际实现并修正文档。

## 新接手时先读什么？

1. [快速上手](docs/getting-started.md)：安装、运行、体验每种通信、测试和构建。
2. [通信协议](docs/communication.md)：Renderer/Preload/Main/Python 真实调用链与认证边界。
3. [目录约定](docs/project-structure.md)：每个文件夹的职责。
4. [完整新增业务练习](docs/extend-features.md)：可复制的 Service → API → TS → Vue → 测试。
5. [排错手册](docs/troubleshooting.md)：按责任模块定位问题。
6. [定制与限制](docs/customization.md)：应用标识、资源、依赖、Python 版本。
7. [架构说明](docs/architecture.md)：进程所有权、数据目录、运行状态。

先阅读相关代码再改；不要猜测本仓库已经拥有数据库、插件系统或 GPU 构建器。

## 责任边界（很重要）

| 用户需求 | 应修改的最小范围 |
| --- | --- |
| 修改菜单、页面 | `src/renderer/src/navigation.ts`、`App.vue`、`views/`、`components/` |
| 前端 HTTP 接口 | `src/renderer/src/services/backend-api.ts`，对应的 Python `api/` 与 `services/` |
| Python 算法、后台任务 | `backend/src/sample_backend/services/`，并在 `api/` 暴露接口 |
| WebSocket 事件 | `services/event_hub.py`、Python 业务 Service、前端 `composables/` |
| 新桌面权限 | `src/main/index.ts`、`src/preload/index.ts`、`src/shared/bridge.ts`、`services/desktop.ts` |
| 改 Python 版本或依赖 | `backend/.python-version`、`backend/pyproject.toml`、`backend/uv.lock` |
| 打包路径、便携目录 | `scripts/build.mjs`、`electron-builder.yml`、`src/main/backend-manager.ts` |
| Python 启动与退出 | `src/main/backend-manager.ts`、`backend/src/sample_backend/__main__.py` |

## 不可破坏的契约

- **开发模式**：Python 是独立进程（8765 端口）。Electron 不得杀掉手动运行的 Python。
- **打包模式**：Electron 只管理它启动的 Python，动态端口、随机会话令牌与就绪握手不可删。
- Renderer 只能通过受限的 `window.desktop` 接口访问 Main/Python；禁止开放 `nodeIntegration` 或直接在 Vue 硬编码 Python 端口。
- Preload/IPC 不可暴露任意命令执行、完整 `ipcRenderer` 或发行版会话控制令牌。
- 当前 HTTP 桥只支持 `GET` / `POST` 和 `/api/...` 路径（无 query）。要扩展接口先补校验和测试。
- WebSocket **不持久化**历史；关键状态必须有可查询的 HTTP API。
- 退出顺序要保留优雅关闭与超时清理；实际运动设备还要有独立硬件安全措施。
- 开发 `backend/.venv` 不参与打包；发行版用 uv 的 Python 缓存复制新目录，不能每次重新下载已安装的相同解释器。
- 保持可维护：优先短函数、清晰名称、小范围修改、真实示例，不新增无需求的框架。

## 常用命令（从仓库根目录执行）

~~~powershell
pnpm install
pnpm dev
pnpm dev:backend
pnpm dev:frontend
pnpm test:backend
pnpm typecheck
node --test scripts/windows-terminal.test.mjs
pnpm python:info
pnpm python:use 3.11
pnpm build
~~~

注意：`python:use` 删除并重建 `backend/.venv`。Windows 下执行前必须关闭运行中的 Python。
`pnpm build` 的绿色软件仅面向 Windows x64；CI 还运行专用的打包与进程测试。
`pnpm clean` 不应删除用户数据与全局 uv 缓存。

## 对 AI 的完成条件

修改前：
1. 把请求映射到正确目录，先读对应模块和测试。
2. 记录是否涉及 HTTP 类型、IPC 安全、生命周期、Python 依赖或打包路径。
3. 优先沿已有示例扩展，不另建并行通信通道。

修改后：
1. 检查修改文件是否包含易懂命名、异常处理和必要注释。
2. 如果改动了 HTTP / WS / IPC，则同步更新两端类型、路由、例子和文档。
3. 尽可能执行 `pnpm test:backend`、`pnpm typecheck`。
4. 改进程、打包或原生依赖时，还要让 Windows `pnpm build` 与相关 smoke 测试通过。
5. 明确说明实际运行了哪些测试、哪些没有跑；不要把“静态分析通过”说成“离线实机通过”。
6. 不引入大型框架，不修改无关模块，不隐瞒未实现的功能。

## 目前没有的东西

模板没有用户账号体系、数据库、自动更新、业务权限、持久任务队列、
跨平台发行保证、任意厂商 SDK/DLL/GPU 的自动封装、项目名称初始化向导。
业务提出明确需求并有测试标准后再逐步增加。
