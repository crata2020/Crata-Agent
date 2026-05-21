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


def test_create_intake_persists_intake_decomposition_graph_trace(
    app: FastAPI, db_session: Session
) -> None:
    client = TestClient(app)

    response = client.post(
        "/intake",
        json={
            "title": "복합 회의록",
            "raw_content": "결과지 문구는 상담형으로 수정하고 상담 사례는 학습 후보로 저장하자.",
        },
    )

    assert response.status_code == 201
    intake_item = db_session.scalars(select(IntakeItem)).one()
    graph_metadata = intake_item.item_metadata
    assert graph_metadata["graph_name"] == "intake_decomposition_graph"
    assert graph_metadata["human_review_required"] is True
    assert [node["name"] for node in graph_metadata["node_trace"]] == [
        "preserve_input",
        "split_semantic_units",
        "collect_rule_hints",
        "judge_with_ai_context",
        "build_candidates",
        "prepare_human_review",
    ]

    candidate = db_session.scalars(select(CandidateTask)).first()
    assert candidate is not None
    assert candidate.item_metadata["origin_graph"] == "intake_decomposition_graph"
    assert candidate.item_metadata["origin_node"] == "build_candidates"


def test_create_intake_returns_graph_trace_for_request_console(app: FastAPI) -> None:
    client = TestClient(app)

    response = client.post(
        "/intake",
        json={
            "title": "복합 회의록",
            "raw_content": "결과지 문구는 상담형으로 수정하고 상담 사례는 학습 후보로 저장하자.",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["decomposition_graph_name"] == "intake_decomposition_graph"
    assert body["human_review_required"] is True
    assert body["decomposition_trace"][0] == {
        "name": "preserve_input",
        "status": "completed",
        "summary": "원문을 보존하고 앞뒤 공백만 정리했습니다.",
    }
    assert body["decomposition_trace"][-1]["name"] == "prepare_human_review"


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


def test_create_intake_preserves_multiple_same_type_candidate_tasks(app: FastAPI) -> None:
    client = TestClient(app)

    response = client.post(
        "/intake",
        json={
            "title": "결과지 회의록",
            "raw_content": (
                "개인행동검사 결과지 3페이지 문구를 부드럽게 수정하자. "
                "집단행동검사 결과지 5페이지 문구도 상담형으로 수정하자."
            ),
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert [task["task_type"] for task in body["candidate_tasks"]] == [
        "report_phrase_revision",
        "report_phrase_revision",
    ]
    assert "개인행동검사" in body["candidate_tasks"][0]["evidence_excerpt"]
    assert "집단행동검사" in body["candidate_tasks"][1]["evidence_excerpt"]


def test_create_intake_extracts_short_revision_and_planning_request(app: FastAPI) -> None:
    client = TestClient(app)

    response = client.post(
        "/intake",
        json={
            "title": "복합 요청",
            "raw_content": "문구수정하고 기획서 작성해줘.",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert [task["task_type"] for task in body["candidate_tasks"]] == [
        "report_phrase_revision",
        "business_planning",
    ]
    assert body["candidate_tasks"][1]["title"] == "사업·프로그램 기획 후보"
    assert body["candidate_tasks"][1]["workflow_plan"]["task_type"] == "planning"
    assert body["candidate_tasks"][1]["workflow_plan"]["primary_agent"] == "business_designer"
    assert body["candidate_tasks"][1]["workflow_plan"]["gates"]["knowledge"] == "concept_guardian"


def test_create_intake_marks_case_learning_as_approval_required_hypothesis_workflow(app: FastAPI) -> None:
    client = TestClient(app)

    response = client.post(
        "/intake",
        json={
            "title": "상담 사례 저장",
            "raw_content": "상담 사례를 비교형 대표 사례 후보로 저장하고 나중에 학습에 반영하자.",
        },
    )

    assert response.status_code == 201
    candidate = response.json()["candidate_tasks"][0]
    workflow_plan = candidate["workflow_plan"]
    assert candidate["task_type"] == "counseling_case_learning"
    assert workflow_plan["task_type"] == "case_learning"
    assert workflow_plan["requires_type_hypothesis"] is True
    assert workflow_plan["allow_uncertain_type"] is True
    assert workflow_plan["requires_anonymization"] is True
    assert workflow_plan["approval_required"] is True
    assert workflow_plan["action_policy"]["default"] == "create_approval"


def test_create_intake_returns_clarifying_questions_for_business_planning(app: FastAPI) -> None:
    client = TestClient(app)

    response = client.post(
        "/intake",
        json={
            "title": "기획 요청",
            "raw_content": "연수 프로그램 제안서를 기획해줘.",
        },
    )

    assert response.status_code == 201
    candidate = response.json()["candidate_tasks"][0]
    assert candidate["task_type"] == "business_planning"
    assert candidate["clarifying_questions"][:4] == [
        "대상 기관 또는 고객은 누구인가요?",
        "해결하려는 문제나 개선하고 싶은 장면은 무엇인가요?",
        "이번 제안서의 목적과 기대 성과는 무엇인가요?",
        "예산, 일정, 운영 형태의 제한은 무엇인가요?",
    ]


def test_create_intake_separates_relationship_pattern_analysis(app: FastAPI) -> None:
    client = TestClient(app)

    response = client.post(
        "/intake",
        json={
            "title": "관계 분석 요청",
            "raw_content": "A유형과 B유형이 부부관계에서 반복되는 침묵-확인요구 갈등 루프를 분석해줘.",
        },
    )

    assert response.status_code == 201
    candidate = response.json()["candidate_tasks"][0]
    assert candidate["task_type"] == "relationship_pattern_analysis"
    assert "relationship_analyst" in candidate["recommended_agents"]
    questions = candidate["clarifying_questions"]
    assert "분석할 사용자 유형과 상대 유형은 무엇인가요?" not in questions
    assert "관계 맥락은 부부, 연인, 부모자녀, 직장, 친구 중 어디에 가까운가요?" not in questions
    assert "공식 지식 후보인지, 상담 답변용 참고 패턴인지 구분이 필요한가요?" in questions


def test_create_intake_asks_only_missing_planning_questions(app: FastAPI) -> None:
    client = TestClient(app)

    response = client.post(
        "/intake",
        json={
            "title": "기획 요청",
            "raw_content": (
                "지방 공공기관 신규 관리자 대상으로 1박2일 회복 프로그램 제안서를 기획해줘. "
                "예산은 800만원 안쪽으로 잡고 싶어."
            ),
        },
    )

    assert response.status_code == 201
    candidate = response.json()["candidate_tasks"][0]
    questions = candidate["clarifying_questions"]
    assert "대상 기관 또는 고객은 누구인가요?" not in questions
    assert "예산, 일정, 운영 형태의 제한은 무엇인가요?" not in questions
    assert "해결하려는 문제나 개선하고 싶은 장면은 무엇인가요?" in questions
    assert "CRATA 검사 중 어떤 검사를 어떤 단계에 넣고 싶나요?" in questions


def test_create_intake_returns_ai_classification_metadata_for_review(app: FastAPI) -> None:
    client = TestClient(app)

    response = client.post(
        "/intake",
        json={
            "title": "복합 회의록",
            "raw_content": "조직검사 결과지 5페이지 문구는 너무 딱딱하니까 상담형으로 바꾸자.",
        },
    )

    assert response.status_code == 201
    candidate = response.json()["candidate_tasks"][0]
    assert candidate["task_type"] == "report_phrase_revision"
    assert candidate["ai_task_type"] == "report_phrase_revision"
    assert candidate["rule_hint_task_type"] == "report_phrase_revision"
    assert candidate["classification_source"] == "rule_assisted_ai"
    assert candidate["classification_status"] == "aligned"
    assert candidate["confidence"] >= 0.8
    assert candidate["approval_required"] is True
    assert "결과지" in candidate["rule_hints"]
    assert "결과지 문구" in candidate["classification_reason"]


def test_create_intake_uses_ai_context_to_override_keyword_hints(app: FastAPI) -> None:
    client = TestClient(app)

    response = client.post(
        "/intake",
        json={
            "title": "홍보 회의록",
            "raw_content": "결과지 문구 수정 기능을 홍보 콘텐츠로 만들어서 유튜브와 블로그에 올리자.",
        },
    )

    assert response.status_code == 201
    candidate = response.json()["candidate_tasks"][0]
    assert candidate["task_type"] == "content_marketing"
    assert candidate["rule_hint_task_type"] == "report_phrase_revision"
    assert candidate["ai_task_type"] == "content_marketing"
    assert candidate["classification_status"] == "ai_overrode_rule"
    assert candidate["approval_required"] is False
    assert "문구 자체를 수정하는 요청이 아니라" in candidate["classification_reason"]


def test_create_intake_decomposes_mixed_meeting_requests(app: FastAPI) -> None:
    client = TestClient(app)

    response = client.post(
        "/intake",
        json={
            "title": "운영 회의록",
            "input_type": "auto",
            "raw_content": "결과지 문구를 수정하고 공공기관 프로그램 제안서를 기획하고 유튜브 홍보 콘텐츠도 만들자.",
        },
    )

    assert response.status_code == 201
    body = response.json()
    task_types = {candidate["task_type"] for candidate in body["candidate_tasks"]}
    assert body["input_type"] == "meeting_notes"
    assert task_types == {
        "report_phrase_revision",
        "business_planning",
        "content_marketing",
    }


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


def test_update_candidate_task_persists_clarifying_answers(app: FastAPI, db_session: Session) -> None:
    client = TestClient(app)
    intake_response = client.post(
        "/intake",
        json={
            "title": "기획 요청",
            "raw_content": "공공기관 연수 프로그램 제안서를 기획해줘.",
        },
    )
    candidate = intake_response.json()["candidate_tasks"][0]

    response = client.patch(
        f"/intake/candidates/{candidate['id']}",
        json={
            "title": candidate["title"],
            "summary": candidate["summary"],
            "recommended_agents": candidate["recommended_agents"],
            "clarifying_answers": "대상은 지방 공공기관 신규 관리자이며, 예산은 1박2일 800만원 안쪽입니다.",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["clarifying_answers"] == "대상은 지방 공공기관 신규 관리자이며, 예산은 1박2일 800만원 안쪽입니다."

    saved_candidate = db_session.get(CandidateTask, candidate["id"])
    assert saved_candidate is not None
    assert saved_candidate.item_metadata["clarifying_answers"] == (
        "대상은 지방 공공기관 신규 관리자이며, 예산은 1박2일 800만원 안쪽입니다."
    )


def test_split_candidate_task_creates_reclassified_draft_candidates(
    app: FastAPI, db_session: Session
) -> None:
    client = TestClient(app)
    intake_response = client.post(
        "/intake",
        json={
            "title": "복합 후보",
            "raw_content": "결과지 문구를 수정하자.",
        },
    )
    candidate_id = intake_response.json()["candidate_tasks"][0]["id"]

    response = client.post(
        f"/intake/candidates/{candidate_id}/split",
        json={
            "parts": [
                "문구수정하고",
                "기획서 작성해줘.",
            ],
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["original_candidate"]["id"] == candidate_id
    assert body["original_candidate"]["status"] == "split"
    assert [candidate["task_type"] for candidate in body["split_candidates"]] == [
        "report_phrase_revision",
        "business_planning",
    ]
    assert [candidate["status"] for candidate in body["split_candidates"]] == ["draft", "draft"]

    original_candidate = db_session.get(CandidateTask, candidate_id)
    assert original_candidate is not None
    assert original_candidate.status == "split"
    assert original_candidate.item_metadata["split_part_count"] == 2

    split_candidates = db_session.scalars(
        select(CandidateTask).where(CandidateTask.status == "draft")
    ).all()
    assert len(split_candidates) == 2
    assert {candidate.item_metadata["origin_candidate_id"] for candidate in split_candidates} == {candidate_id}


def test_split_candidate_task_rejects_started_candidates(app: FastAPI) -> None:
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

    response = client.post(
        f"/intake/candidates/{candidate_id}/split",
        json={"parts": ["문구수정하고", "기획서 작성해줘."]},
    )

    assert run_response.status_code == 201
    assert response.status_code == 409


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
