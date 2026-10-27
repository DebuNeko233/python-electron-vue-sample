"""Create the FastAPI application and connect its small, independent modules."""

import hmac
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from loguru import logger

from .api.control import router as control_router
from .api.routes import router as api_router
from .api.websocket import router as websocket_router
from .core.config import session_token
from .core.logging import configure_logging
from .services.demo_jobs import DemoJobs
from .services.event_hub import EventHub


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    app.state.events = EventHub()
    app.state.jobs = DemoJobs(app.state.events.publish)
    logger.info("FastAPI is starting")
    try:
        yield
    finally:
        await app.state.jobs.close()
        await app.state.events.close()
        logger.info("FastAPI is shutting down")


def create_app() -> FastAPI:
    app = FastAPI(title="Sample Backend", version="0.1.0", lifespan=lifespan)

    @app.middleware("http")
    async def authenticate_api(request: Request, call_next):
        if request.url.path.startswith("/api/"):
            required = session_token()
            supplied = request.headers.get("x-session-token", "")
            if required and not hmac.compare_digest(required, supplied):
                return JSONResponse(status_code=401, content={"detail": "INVALID_SESSION"})
        return await call_next(request)

    app.include_router(api_router)
    app.include_router(websocket_router)
    app.include_router(control_router)
    return app


app = create_app()
