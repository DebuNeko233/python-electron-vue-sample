"""One small, cancellable example of a background task."""

import asyncio
from dataclasses import dataclass
from typing import Awaitable, Callable
from uuid import uuid4

Publish = Callable[[str, dict], Awaitable[None]]


@dataclass
class DemoJob:
    id: str
    status: str = "running"
    progress: int = 0


class DemoJobs:
    """A job ID lets HTTP requests and WebSocket events refer to the same task."""

    def __init__(self, publish: Publish):
        self._publish = publish
        self._jobs: dict[str, DemoJob] = {}
        self._tasks: dict[str, asyncio.Task[None]] = {}

    def start(self) -> DemoJob:
        job = DemoJob(id=uuid4().hex)
        self._jobs[job.id] = job
        task = asyncio.create_task(self._run(job))
        self._tasks[job.id] = task
        task.add_done_callback(lambda _: self._tasks.pop(job.id, None))
        return job

    def get(self, job_id: str) -> DemoJob | None:
        return self._jobs.get(job_id)

    async def cancel(self, job_id: str) -> DemoJob | None:
        """Cancellation waits until the worker publishes its final state."""
        job = self.get(job_id)
        if job is None:
            return None
        task = self._tasks.get(job_id)
        if task and not task.done():
            task.cancel()
            await asyncio.gather(task, return_exceptions=True)
        return job

    async def _run(self, job: DemoJob) -> None:
        try:
            for progress in range(0, 101, 10):
                job.progress = progress
                await self._publish("task.progress", {"task_id": job.id, "progress": progress})
                if progress < 100:
                    await asyncio.sleep(0.4)
            job.status = "completed"
            await self._publish("task.completed", {"task_id": job.id})
        except asyncio.CancelledError:
            job.status = "cancelled"
            await self._publish("task.cancelled", {"task_id": job.id})
            raise

    async def close(self) -> None:
        """All owned tasks are cancelled during FastAPI shutdown."""
        tasks = list(self._tasks.values())
        for task in tasks:
            task.cancel()
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
