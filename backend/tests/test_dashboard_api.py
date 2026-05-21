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
    assert all("work_items" in agent for agent in body["agents"])


def test_dashboard_summary_seeds_agents_before_counting(app: FastAPI) -> None:
    client = TestClient(app)

    response = client.get("/dashboard/summary")

    assert response.status_code == 200
    body = response.json()
    assert body["agent_count"] == 10
    assert body["active_agent_count"] == 9


def test_agent_activity_includes_draft_candidate_work_items(app: FastAPI) -> None:
    client = TestClient(app)
    intake_response = client.post(
        "/intake",
        json={
            "title": "상담 전사록 정리",
            "input_type": "transcript",
            "raw_content": "상담 사례는 학습 후보로 저장하고 반복되는 관계 패턴을 분리하자.",
            "source": "manual",
        },
    )
    candidate_id = intake_response.json()["candidate_tasks"][0]["id"]
    client.patch(
        f"/intake/candidates/{candidate_id}",
        json={
            "title": "상담 전사록 사례 학습 후보",
            "summary": "상담 전사록에서 익명화된 사례와 반복 패턴 후보를 분리한다.",
            "recommended_agents": ["case_learner", "relationship_analyst"],
        },
    )

    response = client.get("/dashboard/agent-activity")

    assert response.status_code == 200
    agents = {agent["id"]: agent for agent in response.json()["agents"]}
    work_item = agents["case_learner"]["work_items"][0]
    assert agents["case_learner"]["activity_status"] == "queued"
    assert work_item["id"] == candidate_id
    assert work_item["source_type"] == "candidate"
    assert work_item["title"] == "상담 전사록 사례 학습 후보"
    assert work_item["status"] == "draft"
    assert work_item["href"] == f"/?candidateId={candidate_id}"
    assert work_item["activity_href"] is None


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
    assert agents["report_editor"]["work_items"][0]["source_type"] == "approval"
    assert agents["report_editor"]["work_items"][0]["status"] == "pending_approval"
    assert agents["report_editor"]["work_items"][0]["href"].startswith("/approvals?approvalId=")
    assert agents["report_editor"]["work_items"][0]["activity_href"].startswith("/activity?taskId=")
    assert agents["quality_inspector"]["activity_status"] == "waiting_approval"


def test_workflow_activity_returns_recent_runs_with_steps(app: FastAPI) -> None:
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
    run_response = client.post(f"/tasks/from-candidate/{candidate_id}/run")

    response = client.get("/dashboard/workflow-activity")

    assert run_response.status_code == 201
    assert response.status_code == 200
    body = response.json()
    assert len(body["runs"]) == 1
    run = body["runs"][0]
    assert run["id"] == run_response.json()["workflow_run_id"]
    assert run["workflow_type"] == "agent_operation"
    assert run["graph_name"] == "agent_operation_graph"
    assert [node["name"] for node in run["node_trace"]] == [
        "ceo_routing",
        "context_retrieval",
        "question_gate",
        "specialist_draft",
        "quality_review",
        "approval_pending",
    ]
    assert run["task_title"]
    assert run["status"] == "pending_approval"
    assert [step["step_name"] for step in run["steps"]] == [
        "ceo_routing",
        "context_retrieval",
        "question_gate",
        "specialist_draft",
        "quality_review",
    ]
    assert [step["agent_id"] for step in run["steps"]] == [
        "crata_ceo",
        "concept_guardian",
        "report_editor",
        "report_editor",
        "quality_inspector",
    ]


def test_request_map_groups_candidates_by_intake_chat(app: FastAPI) -> None:
    client = TestClient(app)
    intake_response = client.post(
        "/intake",
        json={
            "title": "회의록 기반 작업 요청",
            "input_type": "meeting_notes",
            "raw_content": "결과지 문구를 수정하고 사업 프로그램 기획 후보도 같이 분리하자.",
            "source": "manual",
        },
    )
    candidate_id = intake_response.json()["candidate_tasks"][0]["id"]
    run_response = client.post(f"/tasks/from-candidate/{candidate_id}/run")

    response = client.get("/dashboard/request-map")

    assert run_response.status_code == 201
    assert response.status_code == 200
    body = response.json()
    assert body["items"]
    item = body["items"][0]
    assert item["title"] == "회의록 기반 작업 요청"
    assert item["raw_preview"].startswith("결과지 문구를 수정하고")
    assert item["decomposition_trace"]
    candidate = next(candidate for candidate in item["candidates"] if candidate["id"] == candidate_id)
    assert candidate["task_id"] == run_response.json()["task_id"]
    assert candidate["workflow_run_id"] == run_response.json()["workflow_run_id"]
    assert candidate["activity_href"].startswith("/activity?taskId=")
    assert candidate["agents"]
    assert [step["step_name"] for step in candidate["steps"]] == [
        "ceo_routing",
        "context_retrieval",
        "question_gate",
        "specialist_draft",
        "quality_review",
    ]


def test_request_map_includes_focused_candidate_outside_recent_limit(app: FastAPI) -> None:
    client = TestClient(app)
    target_response = client.post(
        "/intake",
        json={
            "title": "오래된 상담 요청",
            "input_type": "transcript",
            "raw_content": "상담 전사록에서 사례 학습 후보를 분리하자.",
            "source": "manual",
        },
    )
    target_intake_id = target_response.json()["id"]
    target_candidate_id = target_response.json()["candidate_tasks"][0]["id"]

    for index in range(11):
        client.post(
            "/intake",
            json={
                "title": f"최근 요청 {index}",
                "input_type": "meeting_notes",
                "raw_content": "결과지 문구를 수정하고 승인 후보로 올리자.",
                "source": "manual",
            },
        )

    response = client.get(f"/dashboard/request-map?candidateId={target_candidate_id}")

    assert response.status_code == 200
    body = response.json()
    assert body["items"][0]["id"] == target_intake_id
    assert any(
        candidate["id"] == target_candidate_id
        for candidate in body["items"][0]["candidates"]
    )


def test_request_map_exposes_revision_loop_links(app: FastAPI) -> None:
    client = TestClient(app)
    intake_response = client.post(
        "/intake",
        json={
            "title": "결과지 수정 검토",
            "input_type": "meeting_notes",
            "raw_content": "결과지 문구를 수정하고 승인 후 수정요청이 생기면 재작업 후보로 돌리자.",
            "source": "manual",
        },
    )
    candidate_id = intake_response.json()["candidate_tasks"][0]["id"]
    run_response = client.post(f"/tasks/from-candidate/{candidate_id}/run")
    approval_id = run_response.json()["approval_id"]
    decision_response = client.post(
        f"/approvals/{approval_id}/decide",
        json={"decision": "revise_requested", "reason": "상담형 문장으로 더 부드럽게 다시 작성"},
    )
    revision_candidate_id = decision_response.json()["revision_candidate_task"]["id"]
    rework_response = client.post(f"/tasks/from-candidate/{revision_candidate_id}/run")

    response = client.get(f"/dashboard/request-map?candidateId={candidate_id}")

    assert rework_response.status_code == 201
    assert response.status_code == 200
    item = response.json()["items"][0]
    original = next(candidate for candidate in item["candidates"] if candidate["id"] == candidate_id)
    revision = next(candidate for candidate in item["candidates"] if candidate["id"] == revision_candidate_id)
    assert original["status"] == "revise_requested"
    assert original["revision_candidate_id"] == revision_candidate_id
    assert original["revision_candidate_title"].endswith("재작업 후보")
    assert original["revision_candidate_href"] == f"/?candidateId={revision_candidate_id}"
    assert original["revision_reason"] == "상담형 문장으로 더 부드럽게 다시 작성"
    assert original["revision_candidate_task_id"] == rework_response.json()["task_id"]
    assert original["revision_candidate_workflow_run_id"] == rework_response.json()["workflow_run_id"]
    assert original["revision_candidate_activity_href"] == f"/activity?taskId={rework_response.json()['task_id']}"
    assert original["revision_candidate_approval_id"] == rework_response.json()["approval_id"]
    assert original["revision_candidate_approval_href"] == f"/approvals?approvalId={rework_response.json()['approval_id']}"
    assert original["revision_candidate_status"] == "pending_approval"
    assert revision["revision_source_approval_id"] == approval_id
    assert revision["revision_source_candidate_id"] == candidate_id
    assert revision["revision_source_task_id"] == run_response.json()["task_id"]
    assert revision["revision_reason"] == "상담형 문장으로 더 부드럽게 다시 작성"
    assert revision["task_id"] == rework_response.json()["task_id"]
    assert revision["approval_id"] == rework_response.json()["approval_id"]
