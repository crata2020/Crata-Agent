from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Approval, CandidateTask
from app.services.agent_seed import seed_agents


def test_run_candidate_task_creates_pending_approval(app: FastAPI, db_session: Session) -> None:
    seed_agents(db_session)
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


def test_run_candidate_task_rejects_duplicate_execution(app: FastAPI, db_session: Session) -> None:
    seed_agents(db_session)
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
