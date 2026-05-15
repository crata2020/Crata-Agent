from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import CandidateTask, IntakeItem


def test_create_intake_extracts_candidate_tasks(app: FastAPI, db_session: Session) -> None:
    client = TestClient(app)
    raw_content = (
        "이번 검사 결과지 3페이지 문구를 더 부드럽게 수정하자. "
        "그리고 이 상담 사례는 관계 유형 학습 후보로 저장하자."
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
        "입력물에서 검사 결과지 문구 수정 요청을 발견했습니다.",
        "입력물에서 상담 사례 저장 또는 학습 후보 요청을 발견했습니다.",
        "입력물에서 사업, 제안서, 상품, 프로그램 기획 요청을 발견했습니다.",
        "입력물에서 콘텐츠, 홍보, 유튜브 관련 요청을 발견했습니다.",
    ]


def test_create_intake_falls_back_to_general_task_for_unmatched_text(app: FastAPI) -> None:
    client = TestClient(app)

    response = client.post(
        "/intake",
        json={
            "title": "일반 메모",
            "raw_content": "다음 회의 전에 내부 검토가 필요한 메모를 정리해두자.",
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
