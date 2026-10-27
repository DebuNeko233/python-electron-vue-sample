"""Add ordinary HTTP endpoints here; route handlers stay short."""

from fastapi import APIRouter, HTTPException, Request
from loguru import logger
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api")


class EchoInput(BaseModel):
    message: str = Field(min_length=1, max_length=500)


@router.get("/health")
async def health(request: Request) -> dict:
    return {"status": "ready", "version": request.app.version}


@router.post("/echo")
async def echo(payload: EchoInput) -> dict:
    logger.info("Echo request received ({} characters)", len(payload.message))
    return {"message": payload.message, "from": "Python / FastAPI"}


@router.post("/tasks/demo")
async def start_demo(request: Request) -> dict:
    job = request.app.state.jobs.start()
    return {"task_id": job.id, "status": job.status}


@router.post("/tasks/{job_id}/cancel")
async def cancel_demo(job_id: str, request: Request) -> dict:
    job = await request.app.state.jobs.cancel(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="TASK_NOT_FOUND")
    return {"task_id": job.id, "status": job.status, "progress": job.progress}


@router.get("/tasks/{job_id}")
async def get_demo(job_id: str, request: Request) -> dict:
    job = request.app.state.jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="TASK_NOT_FOUND")
    return {"task_id": job.id, "status": job.status, "progress": job.progress}
