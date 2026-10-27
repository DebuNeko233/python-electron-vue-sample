"""Internal lifecycle endpoint; never expose an unauthenticated shutdown."""

import hmac

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Request

from ..core.config import control_token

router = APIRouter()


@router.post("/internal/shutdown", include_in_schema=False)
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

    callback = getattr(request.app.state, "request_shutdown", None)
    if callback is None:
        raise HTTPException(status_code=503, detail="SHUTDOWN_UNAVAILABLE")
    background_tasks.add_task(callback)
    return {"accepted": True}
