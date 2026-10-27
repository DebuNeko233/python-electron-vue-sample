"""Examples should be wired together by the application, not at import time."""

from fastapi.testclient import TestClient

from sample_backend.main import create_app


def test_separate_application_instances_have_independent_tasks():
    first = create_app()
    second = create_app()

    with TestClient(first) as a, TestClient(second) as b:
        task_id = a.post("/api/tasks/demo").json()["task_id"]
        assert a.get(f"/api/tasks/{task_id}").status_code == 200
        assert b.get(f"/api/tasks/{task_id}").status_code == 404
        a.post(f"/api/tasks/{task_id}/cancel")


def test_routes_are_registered_by_app_factory():
    app = create_app()
    names = {route.path for route in app.routes}
    assert "/api/echo" in names
    assert "/api/tasks/{job_id}/cancel" in names
    assert "/ws/events" in names
    assert "/internal/shutdown" in names
