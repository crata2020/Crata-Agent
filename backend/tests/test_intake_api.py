from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import CandidateTask, IntakeItem


def test_create_intake_extracts_candidate_tasks(app: FastAPI, db_session: Session) -> None:
    client = TestClient(app)
    raw_content = (
        "이번 검사 결과지 3페이지 문구를 더 부드럽게 수정하자. "
        "그리고 상담 사례는 관계 유형 학습 후보로 저장하자."
    )

    response = client.post(
        "/intake",
        json={
            "title": "  5월 상담 회의록  ",
            "input_type": "meeting_notes",
            "raw_content": f"  {raw_content}  ",
            "source": "manual",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "5월 상담 회의록"
    assert body["raw_content"] == raw_content
    assert [task["task_type"] for task in body["candidate_tasks"]] == [
        "report_phrase_revision",
        "counseling_case_learning",
    ]
    assert len(body["candidate_tasks"]) == 2

    assert len(db_session.scalars(select(IntakeItem)).all()) == 1
    assert len(db_session.scalars(select(CandidateTask)).all()) == 2


def test_create_intake_extracts_all_mixed_candidate_task_types_in_order(app: FastAPI) -> None:
    client = TestClient(app)

    response = client.post(
        "/intake",
        json={
            "title": "복합 요청 메모",
            "raw_content": (
                "결과지 표현과 검사 문구를 수정하자. "
                "상담 전사록 사례는 학습 데이터로 저장하자. "
                "공공기관 연수 프로그램 제안서도 기획하자. "
                "유튜브 콘텐츠와 블로그 홍보, 홈페이지 마케팅도 준비하자."
            ),
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert [task["task_type"] for task in body["candidate_tasks"]] == [
        "report_phrase_revision",
        "counseling_case_learning",
        "business_planning",
        "content_marketing",
    ]
    assert [task["summary"] for task in body["candidate_tasks"]] == [
        "입력문에서 검사 결과지 문구 수정 요청을 발견했습니다.",
        "입력문에서 상담 사례 저장 또는 학습 후보 요청을 발견했습니다.",
        "입력문에서 사업, 제안서, 상품, 프로그램 기획 요청을 발견했습니다.",
        "입력문에서 콘텐츠, 홍보, 유튜브 관련 요청을 발견했습니다.",
    ]


def test_create_intake_resolves_auto_input_type_from_content(app: FastAPI, db_session: Session) -> None:
    client = TestClient(app)

    response = client.post(
        "/intake",
        json={
            "title": "상담 기록",
            "input_type": "auto",
            "raw_content": "상담자: 오늘 어떤 부분이 가장 힘드셨나요?\n내담자: 남편이 침묵하면 불안해서 계속 확인하게 됩니다.",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["input_type"] == "transcript"
    assert db_session.scalars(select(IntakeItem)).one().input_type == "transcript"


def test_create_intake_resolves_auto_input_type_from_title(app: FastAPI) -> None:
    client = TestClient(app)

    response = client.post(
        "/intake",
        json={
            "title": "5월 운영 회의록",
            "input_type": "auto",
            "raw_content": "결정사항: 조직행동검사 결과지 문구를 수정하고 제안서 기획을 진행한다.",
        },
    )

    assert response.status_code == 201
    assert response.json()["input_type"] == "meeting_notes"


def test_update_candidate_task_before_execution(app: FastAPI, db_session: Session) -> None:
    client = TestClient(app)
    intake_response = client.post(
        "/intake",
        json={
            "title": "회의록",
            "raw_content": "결과지 문구를 수정하자.",
        },
    )
    candidate_id = intake_response.json()["candidate_tasks"][0]["id"]

    response = client.patch(
        f"/intake/candidates/{candidate_id}",
        json={
            "title": "조직행동검사 5페이지 문구 수정",
            "summary": "기존 결과지 표현을 상담형 문장으로 바꾸는 작업입니다.",
            "recommended_agents": ["crata_ceo", "report_editor", "quality_inspector"],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "조직행동검사 5페이지 문구 수정"
    assert body["summary"] == "기존 결과지 표현을 상담형 문장으로 바꾸는 작업입니다."
    assert body["recommended_agents"] == ["crata_ceo", "report_editor", "quality_inspector"]

    candidate = db_session.get(CandidateTask, candidate_id)
    assert candidate is not None
    assert candidate.title == "조직행동검사 5페이지 문구 수정"
    assert candidate.recommended_agents == ["crata_ceo", "report_editor", "quality_inspector"]


def test_list_candidate_tasks_returns_existing_candidates(app: FastAPI) -> None:
    client = TestClient(app)
    intake_response = client.post(
        "/intake",
        json={
            "title": "회의록",
            "raw_content": "결과지 문구를 수정하고 상담 사례는 학습 후보로 저장하자.",
        },
    )
    candidate_ids = {task["id"] for task in intake_response.json()["candidate_tasks"]}

    response = client.get("/intake/candidates")

    assert response.status_code == 200
    body = response.json()
    assert {task["id"] for task in body} == candidate_ids
    assert [task["status"] for task in body] == ["draft", "draft"]


def test_update_candidate_task_rejects_started_candidates(app: FastAPI) -> None:
    client = TestClient(app)
    intake_response = client.post(
        "/intake",
        json={
            "title": "회의록",
            "raw_content": "결과지 문구를 수정하자.",
        },
    )
    candidate_id = intake_response.json()["candidate_tasks"][0]["id"]
    run_response = client.post(f"/tasks/from-candidate/{candidate_id}/run")

    response = client.patch(
        f"/intake/candidates/{candidate_id}",
        json={
            "title": "실행 후 수정",
            "summary": "이미 실행된 후보는 수정하지 않는다.",
            "recommended_agents": ["crata_ceo"],
        },
    )

    assert run_response.status_code == 201
    assert response.status_code == 409


def test_update_candidate_task_rejects_unknown_recommended_agents(app: FastAPI) -> None:
    client = TestClient(app)
    intake_response = client.post(
        "/intake",
        json={
            "title": "회의록",
            "raw_content": "결과지 문구를 수정하자.",
        },
    )
    candidate_id = intake_response.json()["candidate_tasks"][0]["id"]

    response = client.patch(
        f"/intake/candidates/{candidate_id}",
        json={
            "title": "조직행동검사 5페이지 문구 수정",
            "summary": "기존 결과지 표현을 상담형 문장으로 바꾸는 작업입니다.",
            "recommended_agents": ["crata_ceo", "unknown_agent"],
        },
    )

    assert response.status_code == 422
    assert "Unknown recommended agents" in response.json()["detail"]


def test_create_intake_falls_back_to_general_task_for_unmatched_text(app: FastAPI) -> None:
    client = TestClient(app)

    response = client.post(
        "/intake",
        json={
            "title": "일반 메모",
            "raw_content": "다음 회의 전에 다시 검토가 필요한 메모를 정리해둔다.",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert [task["task_type"] for task in body["candidate_tasks"]] == ["general_agent_task"]
    assert body["candidate_tasks"][0]["title"] == "일반 에이전트 작업 후보"
    assert body["candidate_tasks"][0]["recommended_agents"] == ["crata_ceo"]


def test_create_intake_rejects_whitespace_only_required_fields(
    app: FastAPI, db_session: Session
) -> None:
    client = TestClient(app)

    title_response = client.post(
        "/intake",
        json={
            "title": "   ",
            "raw_content": "검사 결과지 문구를 수정하자.",
        },
    )
    raw_content_response = client.post(
        "/intake",
        json={
            "title": "검사 결과지 수정",
            "raw_content": "\n\t  ",
        },
    )

    assert title_response.status_code == 422
    assert raw_content_response.status_code == 422
    assert len(db_session.scalars(select(IntakeItem)).all()) == 0
    assert len(db_session.scalars(select(CandidateTask)).all()) == 0
