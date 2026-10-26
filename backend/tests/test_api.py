"""Small tests for the public request contract."""

from fastapi.testclient import TestClient
from sample_backend.api import app


def test_health():
    with TestClient(app) as client:
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ready"


def test_echo():
    with TestClient(app) as client:
        response = client.post("/api/echo", json={"message": "hello"})
        assert response.status_code == 200
        assert response.json()["message"] == "hello"


def test_echo_rejects_empty_input():
    with TestClient(app) as client:
        assert client.post("/api/echo", json={"message": ""}).status_code == 422


def test_private_shutdown_is_restricted():
    with TestClient(app) as client:
        assert client.post("/internal/shutdown").status_code == 403
