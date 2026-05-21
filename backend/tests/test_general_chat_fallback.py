from app.services.model_gateway import ModelGateway


def test_general_fallback_returns_user_facing_answer_without_internal_metadata() -> None:
    context = """
# 사용자 작업

제목: 일반 에이전트 작업 후보
작업 유형: general_agent_task
설명: 집단검사가 무엇인지에 대한 개념과 목적을 설명합니다.
배정 에이전트: crata_ceo, concept_guardian

# CRATA 지식 컨텍스트

CRATA 집단행동검사는 사람을 유형으로 가르는 검사가 아니라, 동료나 집단 안에서
사람이 어떤 방식으로 의사결정을 하고 자기 확신을 회복하는지 보는 행동 검사입니다.
검사의 목적은 집단 안에서 합의가 어디서 막히고, 어떤 관계에서는 자신감이 생기며,
어떤 환경에서는 의사결정이 미뤄지는지를 파악하게 돕는 것입니다.
"""

    draft = ModelGateway()._fallback_draft(
        task_title="일반 에이전트 작업 후보",
        task_type="general_agent_task",
        context=context,
    )

    assert "집단검사" in draft
    assert "목적" in draft
    assert "작업 유형" not in draft
    assert "general_agent_task" not in draft
    assert "검수 메모" not in draft
    assert "참조한 컨텍스트" not in draft
