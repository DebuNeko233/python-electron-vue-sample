"""A small in-memory WebSocket event broadcaster for desktop applications."""

import asyncio
import itertools
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect


class EventHub:
    def __init__(self):
        self._clients: set[WebSocket] = set()
        self._sequence = itertools.count(1)

    def _message(self, event: str, data: dict[str, Any]) -> dict:
        return {"event": event, "sequence": next(self._sequence), "data": data}

    async def publish(self, event: str, data: dict[str, Any]) -> None:
        message = self._message(event, data)
        for client in tuple(self._clients):
            try:
                await client.send_json(message)
            except Exception:
                self._clients.discard(client)

    async def serve(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self._clients.add(websocket)
        try:
            await websocket.send_json(self._message(
                "system.connected", {"message": "WebSocket connected"}
            ))
            while True:
                try:
                    await asyncio.wait_for(websocket.receive_text(), timeout=10)
                except asyncio.TimeoutError:
                    await websocket.send_json(self._message("system.heartbeat", {}))
        except WebSocketDisconnect:
            pass
        finally:
            self._clients.discard(websocket)

    async def close(self) -> None:
        clients = tuple(self._clients)
        self._clients.clear()
        for client in clients:
            try:
                await client.close()
            except Exception:
                pass
