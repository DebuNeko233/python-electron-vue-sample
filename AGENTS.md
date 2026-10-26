# 开发约定

- 使用清晰的变量名、短函数与可观察的异常处理。
- Electron Main 只处理桌面权限、连接和进程所有权；业务留在 Python。
- 改动进程/打包逻辑必须补充测试，不可仅用编译通过判断发布成功。
- 开发 `.venv` 不得进入发行目录。
- 不允许关闭 Electron 开发窗口时误杀手动运行的 Python。
- 生产不能隐藏所有错误；同时记录 Electron 和 Python 的日志。
- 不无故加入大型依赖、插件系统或不必要的抽象层。

开发时先运行 `pnpm typecheck` 和 `pnpm test:backend`，Windows 发布前检查 `pnpm build`。
