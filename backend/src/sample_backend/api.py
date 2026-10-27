"""HTTP commands and WebSocket events. No Electron dependency lives here."""

import asyncio
import hmac
import itertools
from contextlib import asynccontextmanager
from typing import Any

from fastapi import BackgroundTasks, FastAPI, Header, HTTPException, Request, WebSocket, WebSocketDisconnect
from loguru import logger
from pydantic import BaseModel, Field

from .jobs import DemoJobs
from .logging_setup import configure_logging
from .settings import control_token, session_token

clients: set[WebSocket] = set()
sequence = itertools.count(1)


async def publish(event: str, data: dict[str, Any]) -> None:
    message = {"event": event, "sequence": next(sequence), "data": data}
    for client in tuple(clients):
        try:
            await client.send_json(message)
        except Exception:
            clients.discard(client)


jobs = DemoJobs(publish)


@asynccontextmanager
async def lifespan(_: FastAPI):
    configure_logging()
    logger.info("FastAPI is starting")
    try:
        yield
    finally:
        await jobs.close()
        logger.info("FastAPI is shutting down")
        clients.clear()


app = FastAPI(title="Sample Backend", version="0.1.0", lifespan=lifespan)


@app.middleware("http")
async def authenticate_api(request: Request, call_next):
    if request.url.path.startswith("/api/"):
        required = session_token()
        supplied = request.headers.get("x-session-token", "")
        if required and not hmac.compare_digest(required, supplied):
            from fastapi.responses import JSONResponse
            return JSONResponse(status_code=401, content={"detail": "INVALID_SESSION"})
    return await call_next(request)


class EchoInput(BaseModel):
    message: str = Field(min_length=1, max_length=500)


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ready", "version": app.version}


@app.post("/api/echo")
async def echo(payload: EchoInput) -> dict:
    logger.info("Echo request received ({} characters)", len(payload.message))
    return {"message": payload.message, "from": "Python / FastAPI"}


@app.post("/api/tasks/demo")
async def start_demo() -> dict:
    job = jobs.start()
    return {"task_id": job.id, "status": job.status}


@app.post("/api/tasks/{job_id}/cancel")
async def cancel_demo(job_id: str) -> dict:
    job = await jobs.cancel(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="TASK_NOT_FOUND")
    return {"task_id": job.id, "status": job.status, "progress": job.progress}


@app.get("/api/tasks/{job_id}")
async def get_demo(job_id: str) -> dict:
    job = jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="TASK_NOT_FOUND")
    return {"task_id": job.id, "status": job.status, "progress": job.progress}


@app.websocket("/ws/events")
async def events(websocket: WebSocket) -> None:
    required = session_token()
    supplied = websocket.headers.get("x-session-token", "")
    if required and not hmac.compare_digest(required, supplied):
        await websocket.close(code=4401)
        return

    await websocket.accept()
    clients.add(websocket)
    try:
        await websocket.send_json({
            "event": "system.connected",
            "sequence": next(sequence),
            "data": {"message": "WebSocket connected"},
        })
        while True:
            try:
                # Receiving also lets Starlette detect closed clients.
                await asyncio.wait_for(websocket.receive_text(), timeout=10)
            except asyncio.TimeoutError:
                await websocket.send_json({
                    "event": "system.heartbeat",
                    "sequence": next(sequence),
                    "data": {},
                })
    except WebSocketDisconnect:
        pass
    finally:
        clients.discard(websocket)


@app.post("/internal/shutdown", include_in_schema=False)
async def shutdown(
    request: Request,
    background_tasks: BackgroundTasks,
    x_control_token: str = Header(default=""),
) -> dict:
    expected = control_token()
    if (
        not expected
        or request.client is None
        or request.client.host not in ("127.0.0.1", "::1")
        or not hmac.compare_digest(expected, x_control_token)
    ):
        raise HTTPException(status_code=403, detail="FORBIDDEN")
    callback = getattr(app.state, "request_shutdown", None)
    if callback is None:
        raise HTTPException(status_code=503, detail="SHUTDOWN_UNAVAILABLE")
    background_tasks.add_task(callback)
    return {"accepted": True}
