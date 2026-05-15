from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Agent, Approval, CandidateTask, Task


def test_run_candidate_task_seeds_agents_and_creates_pending_approval(
    app: FastAPI, db_session: Session
) -> None:
    client = TestClient(app)
    intake_response = client.post(
        "/intake",
        json={
            "title": "결과지 수정 요청",
            "input_type": "memo",
            "raw_content": "결과지 공식 문구를 더 부드럽게 수정하고 승인 후 반영하자.",
            "source": "manual",
        },
    )
    candidate_id = intake_response.json()["candidate_tasks"][0]["id"]

    response = client.post(f"/tasks/from-candidate/{candidate_id}/run")

    assert response.status_code == 201
    body = response.json()
    assert body["task_id"]
    assert body["workflow_run_id"]
    assert body["artifact_id"]
    assert body["approval_id"]
    assert body["status"] == "pending_approval"

    approval = db_session.get(Approval, body["approval_id"])
    candidate = db_session.get(CandidateTask, candidate_id)
    assert approval is not None
    assert approval.status == "pending_approval"
    assert candidate is not None
    assert candidate.status == "pending_approval"
    assert db_session.get(Agent, "crata_ceo") is not None


def test_run_candidate_tasks_runs_multiple_candidates_at_once(
    app: FastAPI, db_session: Session
) -> None:
    client = TestClient(app)
    intake_response = client.post(
        "/intake",
        json={
            "title": "회의록",
            "input_type": "meeting_notes",
            "raw_content": "결과지 문구를 수정하고 상담 사례는 학습 후보로 저장하자.",
            "source": "manual",
        },
    )
    candidate_ids = [task["id"] for task in intake_response.json()["candidate_tasks"]]

    response = client.post(
        "/tasks/from-candidates/run",
        json={"candidate_ids": candidate_ids},
    )

    assert response.status_code == 201
    body = response.json()
    assert [result["status"] for result in body["results"]] == [
        "pending_approval",
        "pending_approval",
    ]
    assert [result["candidate_id"] for result in body["results"]] == candidate_ids
    assert all(result["approval_id"] for result in body["results"])

    candidates = [db_session.get(CandidateTask, candidate_id) for candidate_id in candidate_ids]
    assert [candidate.status for candidate in candidates if candidate is not None] == [
        "pending_approval",
        "pending_approval",
    ]
    assert len(db_session.scalars(select(Approval)).all()) == 2
    assert len(db_session.scalars(select(Task)).all()) == 2


def test_run_candidate_task_rejects_duplicate_execution(app: FastAPI, db_session: Session) -> None:
    client = TestClient(app)
    intake_response = client.post(
        "/intake",
        json={
            "title": "결과지 수정 요청",
            "raw_content": "결과지 공식 문구를 더 부드럽게 수정하고 승인 후 반영하자.",
        },
    )
    candidate_id = intake_response.json()["candidate_tasks"][0]["id"]

    first_response = client.post(f"/tasks/from-candidate/{candidate_id}/run")
    second_response = client.post(f"/tasks/from-candidate/{candidate_id}/run")

    assert first_response.status_code == 201
    assert second_response.status_code == 409
    assert len(db_session.scalars(select(Approval)).all()) == 1
    assert len(db_session.scalars(select(Task)).all()) == 1


def test_run_candidate_task_marks_rows_failed_when_workflow_errors(
    app: FastAPI, db_session: Session, monkeypatch
) -> None:
    def raise_draft(self, *, task_title: str, task_type: str, context: str) -> str:
        raise RuntimeError("draft failed")

    monkeypatch.setattr("app.services.model_gateway.ModelGateway.draft", raise_draft)
    client = TestClient(app, raise_server_exceptions=False)
    intake_response = client.post(
        "/intake",
        json={
            "title": "결과지 수정 요청",
            "raw_content": "결과지 공식 문구를 더 부드럽게 수정하고 승인 후 반영하자.",
        },
    )
    candidate_id = intake_response.json()["candidate_tasks"][0]["id"]

    response = client.post(f"/tasks/from-candidate/{candidate_id}/run")

    candidate = db_session.get(CandidateTask, candidate_id)
    task = db_session.scalar(select(Task).where(Task.candidate_task_id == candidate_id))
    assert response.status_code == 500
    assert candidate is not None
    assert candidate.status == "failed"
    assert task is not None
    assert task.status == "failed"
