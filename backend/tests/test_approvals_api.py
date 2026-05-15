from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Artifact, CandidateTask, Task


def _create_pending_approval(client: TestClient) -> tuple[str, str]:
    intake_response = client.post(
        "/intake",
        json={
            "title": "결과지 문구 수정 요청",
            "input_type": "memo",
            "raw_content": "결과지 문구를 더 부드럽게 수정하고 승인 대기 상태로 올려 주세요.",
            "source": "manual",
        },
    )
    assert intake_response.status_code == 201
    candidate_id = intake_response.json()["candidate_tasks"][0]["id"]

    run_response = client.post(f"/tasks/from-candidate/{candidate_id}/run")
    assert run_response.status_code == 201
    return candidate_id, run_response.json()["approval_id"]


def test_approval_inbox_lists_pending_items(app: FastAPI) -> None:
    client = TestClient(app)
    _candidate_id, _approval_id = _create_pending_approval(client)

    response = client.get("/approvals")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["status"] == "pending_approval"
    assert body[0]["id"]
    assert body[0]["task_id"]
    assert body[0]["artifact_id"]


def test_approve_item_changes_status(app: FastAPI, db_session: Session) -> None:
    client = TestClient(app)
    candidate_id, approval_id = _create_pending_approval(client)

    response = client.post(
        f"/approvals/{approval_id}/decide",
        json={"decision": "approved", "reason": "확인 완료"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "approved"

    artifact = db_session.scalar(select(Artifact).where(Artifact.id == body["artifact_id"]))
    task = db_session.scalar(select(Task).where(Task.id == body["task_id"]))
    candidate = db_session.get(CandidateTask, candidate_id)
    assert artifact is not None
    assert artifact.status == "approved"
    assert task is not None
    assert task.status == "approved"
    assert candidate is not None
    assert candidate.status == "approved"


def test_dashboard_summary_counts_after_one_run(app: FastAPI) -> None:
    client = TestClient(app)
    _candidate_id, _approval_id = _create_pending_approval(client)

    response = client.get("/dashboard/summary")

    assert response.status_code == 200
    body = response.json()
    assert body["agent_count"] == 10
    assert body["active_agent_count"] == 7
    assert body["candidate_task_count"] >= 1
    assert body["running_task_count"] == 0
    assert body["pending_approval_count"] == 1
    assert body["artifact_count"] == 1


def test_decide_rejects_invalid_decision(app: FastAPI) -> None:
    client = TestClient(app)
    _candidate_id, approval_id = _create_pending_approval(client)

    response = client.post(
        f"/approvals/{approval_id}/decide",
        json={"decision": "invalid", "reason": "bad value"},
    )

    assert response.status_code == 422


def test_decide_returns_404_for_missing_approval(app: FastAPI) -> None:
    client = TestClient(app)

    response = client.post(
        "/approvals/missing-approval/decide",
        json={"decision": "rejected", "reason": "not found"},
    )

    assert response.status_code == 404
