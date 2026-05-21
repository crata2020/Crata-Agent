from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Approval, Artifact, CandidateTask, Task
from app.models import IntakeItem
from app.api.intake import _candidate_chat_context


def test_candidate_chat_context_uses_candidate_excerpt_not_full_intake() -> None:
    raw_content = "회의록 전체 원문입니다. " + ("원문반복 " * 3000)
    intake_item = IntakeItem(
        title="long meeting",
        input_type="meeting_note",
        raw_content=raw_content,
    )
    candidate = CandidateTask(
        intake_item_id="intake-1",
        task_type="general_agent_task",
        title="집단행동검사 유형 확인",
        summary="관계 속 대화를 통해 생각과 감정이 정리되는 표현을 집단행동검사 기준으로 확인합니다.",
        evidence_excerpt="관계 속 대화에서 생각과 감정이 정리된다.",
        recommended_agents=["concept_guardian"],
    )

    context = _candidate_chat_context(
        intake_item=intake_item,
        candidate=candidate,
        messages=[{"role": "user", "content": "이건 어떤 유형인가요?"}],
    )

    assert raw_content not in context
    assert "관계 속 대화에서 생각과 감정이 정리된다." in context
    assert "group_behavior.decision_style.group.definition" in context
    assert len(context) < 7000


def test_candidate_message_appends_chat_without_starting_workflow(
    app: FastAPI,
    db_session: Session,
    monkeypatch,
) -> None:
    client = TestClient(app)
    intake_response = client.post(
        "/intake",
        json={
            "title": "study start help",
            "raw_content": "공부할 때 책상에 앉는게 어려워. 오래 앉아 있기도 어렵고",
        },
    )
    candidate_id = intake_response.json()["candidate_tasks"][0]["id"]

    def fake_draft(self, *, task_title: str, task_type: str, context: str) -> str:
        assert "공부할 때 책상에 앉는게 어려워" in context
        assert "나: 어떤 검사를 하면 좋을까?" in context
        assert len(context) < 12000
        assert "## 참조 파일: knowledge/" in context
        return "시작과 지속이 어려운 흐름이라 개인행동 동기검사부터 보는 게 맞습니다."

    monkeypatch.setattr("app.services.model_gateway.ModelGateway.draft", fake_draft)

    response = client.post(
        f"/intake/candidates/{candidate_id}/messages",
        json={"content": "어떤 검사를 하면 좋을까?"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == candidate_id
    assert body["status"] == "draft"
    assert body["chat_messages"] == [
        {"role": "user", "content": "어떤 검사를 하면 좋을까?"},
        {
            "role": "assistant",
            "content": "시작과 지속이 어려운 흐름이라 개인행동 동기검사부터 보는 게 맞습니다.",
        },
    ]

    candidate = db_session.get(CandidateTask, candidate_id)
    assert candidate is not None
    assert candidate.item_metadata["chat_messages"] == body["chat_messages"]
    assert db_session.scalars(select(Task)).all() == []
    assert db_session.scalars(select(Artifact)).all() == []
    assert db_session.scalars(select(Approval)).all() == []


def test_list_candidate_tasks_includes_chat_messages(
    app: FastAPI,
    monkeypatch,
) -> None:
    client = TestClient(app)
    intake_response = client.post(
        "/intake",
        json={
            "title": "chat persistence",
            "raw_content": "공부를 시작하기 어렵다.",
        },
    )
    candidate_id = intake_response.json()["candidate_tasks"][0]["id"]

    monkeypatch.setattr(
        "app.services.model_gateway.ModelGateway.draft",
        lambda self, **_: "개인행동 동기검사 관점에서 먼저 정리하겠습니다.",
    )
    client.post(
        f"/intake/candidates/{candidate_id}/messages",
        json={"content": "조금 더 설명해줘."},
    )

    response = client.get("/intake/candidates")

    assert response.status_code == 200
    [candidate] = response.json()
    assert candidate["chat_messages"] == [
        {"role": "user", "content": "조금 더 설명해줘."},
        {"role": "assistant", "content": "개인행동 동기검사 관점에서 먼저 정리하겠습니다."},
    ]


def test_candidate_message_answers_group_dialogue_type_without_llm(
    app: FastAPI,
    monkeypatch,
) -> None:
    client = TestClient(app)
    intake_response = client.post(
        "/intake",
        json={
            "title": "dialogue style",
            "raw_content": "나는 내 상황을 이해하는 주변 사람들과 의논하면서 생각과 감정이 정리되는 편인데 무슨 유형인거야?",
        },
    )
    candidate_id = intake_response.json()["candidate_tasks"][0]["id"]

    def fail_draft(*args, **kwargs) -> str:
        raise AssertionError("clear group-dialogue type questions should not need the LLM")

    monkeypatch.setattr("app.services.model_gateway.ModelGateway.draft", fail_draft)

    response = client.post(
        f"/intake/candidates/{candidate_id}/messages",
        json={"content": "관계 속 대화에서 생각과 감정이 정리되는 스타일이면 어떤 검사의 어떤 유형이야?"},
    )

    assert response.status_code == 200
    assistant_message = response.json()["chat_messages"][-1]["content"]
    assert "집단행동검사" in assistant_message
    assert "그룹형" in assistant_message
    assert "비교형" in assistant_message


def test_candidate_message_rewrites_internal_metadata_leakage(
    app: FastAPI,
    monkeypatch,
) -> None:
    client = TestClient(app)
    intake_response = client.post(
        "/intake",
        json={
            "title": "planning",
            "raw_content": "집단검사를 학교 학생 프로그램 기획안으로 만들어줘.",
        },
    )
    candidate_id = intake_response.json()["candidate_tasks"][0]["id"]

    monkeypatch.setattr(
        "app.services.model_gateway.ModelGateway.draft",
        lambda self, **_: "# 초안\n\n## 작업 유형\nplanning\n\nprimary_agent: business_designer",
    )

    response = client.post(
        f"/intake/candidates/{candidate_id}/messages",
        json={"content": "초안으로 보여줘."},
    )

    assert response.status_code == 200
    assistant_message = response.json()["chat_messages"][-1]["content"]
    assert "작업 유형" not in assistant_message
    assert "primary_agent" not in assistant_message
    assert "## 제안서 기본 구조" in assistant_message


def test_candidate_message_guard_uses_latest_planning_context(
    app: FastAPI,
    db_session: Session,
    monkeypatch,
) -> None:
    client = TestClient(app)
    intake_item = IntakeItem(
        id="intake-personal-planning",
        title="personal planning",
        input_type="meeting_note",
        raw_content="개인행동검사를 기반으로 학교 프로그램 기획안을 만든다.",
    )
    db_session.add(intake_item)
    db_session.flush()
    candidate = CandidateTask(
        id="candidate-personal-planning",
        intake_item_id=intake_item.id,
        task_type="planning",
        title="개인행동검사 기반 학교 프로그램 기획안",
        summary="개인행동 동기검사를 기반으로 중학생 학급 상호이해 프로그램을 만든다.",
        evidence_excerpt="반 아이들이 서로의 행동을 더 잘 이해하는 것이 목적이다.",
        recommended_agents=["business_designer"],
        item_metadata={
            "workflow_plan": {
                "task_type": "planning",
                "exam": "group_behavior",
                "planning_topic": "general",
            }
        },
    )
    db_session.add(candidate)
    db_session.commit()

    def vague_draft(self, *, task_title: str, task_type: str, context: str) -> str:
        assert "개인행동 동기검사" in context
        assert "기획 변환 사고 절차" in context
        assert "고정 목록에서 가져오지 말고" in context
        assert "1개 학급 25명 기준" in context
        return (
            "### CRATA 검사 기반 차별점\n"
            "개인행동검사는 동기위치와 동기성향, 고유/현재를 봅니다.\n\n"
            "### 세부 활동\n"
            "역할극과 그룹 토론을 진행합니다.\n\n"
            "### 예산안\n"
            "검사비와 강사비를 제안합니다."
        )

    fallback_calls: list[str] = []

    def structured_fallback(self, *, task_title: str, task_type: str, context: str) -> str:
        fallback_calls.append(context)
        return "검수 기준을 반영한 구조화 기획안"

    monkeypatch.setattr("app.services.model_gateway.ModelGateway.draft", vague_draft)
    monkeypatch.setattr("app.services.model_gateway.ModelGateway.fallback_draft", structured_fallback)

    response = client.post(
        "/intake/candidates/candidate-personal-planning/messages",
        json={
            "content": (
                "중학생 대상이고, 반 아이들이 서로의 행동을 더 잘 이해하는 것이 목적이야. "
                "3시간 정도고 예산은 우리가 제안해야 해."
            )
        },
    )

    assert response.status_code == 200
    assistant_message = response.json()["chat_messages"][-1]["content"]
    assert assistant_message == "검수 기준을 반영한 구조화 기획안"
    assert fallback_calls
