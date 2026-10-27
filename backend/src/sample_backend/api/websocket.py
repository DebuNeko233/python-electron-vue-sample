"""WebSocket endpoint. The event hub handles clients and broadcasts."""

import hmac

from fastapi import APIRouter, WebSocket

from ..core.config import session_token

router = APIRouter()


@router.websocket("/ws/events")
async def events(websocket: WebSocket) -> None:
    required = session_token()
    supplied = websocket.headers.get("x-session-token", "")
    if required and not hmac.compare_digest(required, supplied):
        await websocket.close(code=4401)
        return
    await websocket.app.state.events.serve(websocket)
