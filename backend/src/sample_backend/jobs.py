"""One intentionally small example of a cancellable long-running task."""

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
    def __init__(self, publish: Publish):
        self._publish = publish
        self._jobs: dict[str, DemoJob] = {}
        self._tasks: set[asyncio.Task] = set()

    def start(self) -> DemoJob:
        job = DemoJob(id=uuid4().hex)
        self._jobs[job.id] = job
        task = asyncio.create_task(self._run(job))
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)
        return job

    def get(self, job_id: str) -> DemoJob | None:
        return self._jobs.get(job_id)

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
        for task in tuple(self._tasks):
            task.cancel()
        if self._tasks:
            await asyncio.gather(*self._tasks, return_exceptions=True)
