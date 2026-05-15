from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


def test_agent_activity_returns_seeded_agents(app: FastAPI) -> None:
    client = TestClient(app)

    response = client.get("/dashboard/agent-activity")

    assert response.status_code == 200
    body = response.json()
    assert len(body["agents"]) == 10
    assert body["agents"][0]["id"] == "crata_ceo"
    assert {agent["activity_status"] for agent in body["agents"]} >= {"idle", "planned"}


def test_agent_activity_shows_pending_approval_work(
    app: FastAPI,
    db_session: Session,
) -> None:
    client = TestClient(app)
    intake_response = client.post(
        "/intake",
        json={
            "title": "결과지 문구 수정 회의록",
            "input_type": "meeting_notes",
            "raw_content": "결과지 문구를 부드럽게 수정하고 공식 반영 전 승인 대기로 올린다.",
            "source": "manual",
        },
    )
    candidate_id = intake_response.json()["candidate_tasks"][0]["id"]
    client.patch(
        f"/intake/candidates/{candidate_id}",
        json={
            "title": "결과지 문구 수정 후보",
            "summary": "회의록에서 나온 결과지 문구 수정 요청을 승인 후보로 정리한다.",
            "recommended_agents": [
                "crata_ceo",
                "concept_guardian",
                "report_editor",
                "quality_inspector",
            ],
        },
    )
    client.post(f"/tasks/from-candidate/{candidate_id}/run")

    response = client.get("/dashboard/agent-activity")

    assert response.status_code == 200
    agents = {agent["id"]: agent for agent in response.json()["agents"]}
    assert agents["report_editor"]["activity_status"] == "waiting_approval"
    assert agents["report_editor"]["current_focus"] == "결과지 문구 수정 후보"
    assert agents["report_editor"]["pending_approval_count"] == 1
    assert agents["quality_inspector"]["activity_status"] == "waiting_approval"
