"""Run the same backend independently or under Electron's supervision."""

import argparse
import asyncio
import json
import multiprocessing
import os
import threading
from pathlib import Path

import uvicorn
from loguru import logger

from .api import app


def watch_parent(parent_pid: int, request_stop, done: threading.Event) -> None:
    """Observe the actual parent handle on Windows, not a reusable PID alone."""
    if os.name != "nt":
        while not done.wait(1):
            if os.getppid() != parent_pid:
                logger.warning("Electron parent disappeared; stopping backend")
                request_stop()
                return
        return

    import ctypes
    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel32.OpenProcess.argtypes = (ctypes.c_ulong, ctypes.c_int, ctypes.c_ulong)
    kernel32.OpenProcess.restype = ctypes.c_void_p
    kernel32.WaitForSingleObject.argtypes = (ctypes.c_void_p, ctypes.c_ulong)
    kernel32.WaitForSingleObject.restype = ctypes.c_ulong
    kernel32.CloseHandle.argtypes = (ctypes.c_void_p,)
    handle = kernel32.OpenProcess(0x00100000, 0, parent_pid)
    if not handle:
        logger.error("Cannot watch Electron parent PID {}", parent_pid)
        request_stop()
        return
    try:
        while not done.wait(0.5):
            result = kernel32.WaitForSingleObject(handle, 0)
            if result == 0:
                logger.warning("Electron parent exited; stopping backend")
                request_stop()
                return
            if result != 0x102:
                logger.error("Parent process watch failed: {}", result)
                request_stop()
                return
    finally:
        kernel32.CloseHandle(handle)


async def run_managed(port: int) -> None:
    config = uvicorn.Config(app, host="127.0.0.1", port=port, log_config=None, access_log=False)
    server = uvicorn.Server(config)
    app.state.request_shutdown = lambda: setattr(server, "should_exit", True)
    done = threading.Event()
    parent_pid = int(os.environ.get("APP_PARENT_PID", "0"))
    if parent_pid:
        threading.Thread(
            target=watch_parent,
            args=(parent_pid, app.state.request_shutdown, done),
            name="electron-parent-watch",
            daemon=True,
        ).start()

    server_task = asyncio.create_task(server.serve())
    try:
        while not server.started and not server_task.done():
            await asyncio.sleep(0.05)
        if not server.started:
            await server_task
            raise RuntimeError("Backend failed before becoming ready")

        ready_path = os.environ.get("APP_READY_FILE")
        if ready_path:
            actual_port = server.servers[0].sockets[0].getsockname()[1]
            target = Path(ready_path)
            target.parent.mkdir(parents=True, exist_ok=True)
            temporary = target.with_suffix(".tmp")
            temporary.write_text(json.dumps({
                "port": actual_port,
                "pid": os.getpid(),
                "session_id": os.environ.get("APP_SESSION_ID", ""),
            }), encoding="utf-8")
            temporary.replace(target)
        await server_task
    finally:
        done.set()
        if not server_task.done():
            server.should_exit = True
            await server_task


def main() -> None:
    multiprocessing.freeze_support()
    parser = argparse.ArgumentParser(description="Standalone desktop sample backend")
    parser.add_argument("--dev", action="store_true", help="Enable Uvicorn autoreload")
    arguments = parser.parse_args()
    if arguments.dev:
        uvicorn.run("sample_backend.api:app", host="127.0.0.1", port=8765, reload=True)
    else:
        asyncio.run(run_managed(0))


if __name__ == "__main__":
    main()
