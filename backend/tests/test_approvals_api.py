from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Approval, Artifact, CandidateTask, Task


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


def test_revise_request_creates_revision_candidate_task(
    app: FastAPI, db_session: Session
) -> None:
    client = TestClient(app)
    candidate_id, approval_id = _create_pending_approval(client)

    response = client.post(
        f"/approvals/{approval_id}/decide",
        json={"decision": "revise_requested", "reason": "문장을 더 상담형으로 바꿔 주세요."},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "revise_requested"
    assert body["revision_candidate_task"]["id"]
    assert body["revision_candidate_task"]["status"] == "draft"
    assert body["revision_candidate_task"]["task_type"] == "report_phrase_revision"
    assert "문장을 더 상담형으로 바꿔 주세요." in body["revision_candidate_task"]["summary"]

    original_candidate = db_session.get(CandidateTask, candidate_id)
    revision_candidate = db_session.get(CandidateTask, body["revision_candidate_task"]["id"])
    assert original_candidate is not None
    assert original_candidate.status == "revise_requested"
    assert revision_candidate is not None
    assert revision_candidate.status == "draft"
    assert revision_candidate.intake_item_id == original_candidate.intake_item_id
    assert revision_candidate.recommended_agents == original_candidate.recommended_agents
    assert revision_candidate.item_metadata["source_approval_id"] == approval_id
    assert revision_candidate.item_metadata["revision_reason"] == "문장을 더 상담형으로 바꿔 주세요."


def test_revise_request_requires_reason(app: FastAPI) -> None:
    client = TestClient(app)
    _candidate_id, approval_id = _create_pending_approval(client)

    response = client.post(
        f"/approvals/{approval_id}/decide",
        json={"decision": "revise_requested", "reason": " "},
    )

    assert response.status_code == 422


def test_decide_rejects_second_decision_and_preserves_statuses(
    app: FastAPI, db_session: Session
) -> None:
    client = TestClient(app)
    candidate_id, approval_id = _create_pending_approval(client)

    first_response = client.post(
        f"/approvals/{approval_id}/decide",
        json={"decision": "approved", "reason": "initial approval"},
    )
    second_response = client.post(
        f"/approvals/{approval_id}/decide",
        json={"decision": "rejected", "reason": "second decision"},
    )

    assert first_response.status_code == 200
    assert second_response.status_code == 409
    assert second_response.json()["detail"] == "Approval already decided"

    approval = db_session.get(Approval, approval_id)
    artifact = db_session.scalar(
        select(Artifact).where(Artifact.id == first_response.json()["artifact_id"])
    )
    task = db_session.scalar(select(Task).where(Task.id == first_response.json()["task_id"]))
    candidate = db_session.get(CandidateTask, candidate_id)
    assert approval is not None
    assert approval.status == "approved"
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
