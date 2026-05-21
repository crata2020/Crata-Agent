from app.services.concept_router import classify_concept


def test_group_listening_signal_returns_group_with_comparison_confusion() -> None:
    result = classify_concept(
        query="집단행동검사에서 양쪽 말을 다 들어봐야 판단이 서요. 대화하면서 생각과 감정이 정리되는 편입니다.",
        task_type="general_agent_task",
    )

    assert result.exam == "group_behavior"
    assert result.axis_candidates[0].axis == "decision_style"
    assert result.type_candidates[0].type == "group"
    assert result.type_candidates[0].axis == "decision_style"
    assert result.type_candidates[0].confidence == "medium"
    assert "self_efficacy.comparison" in result.type_candidates[0].confused_with
    assert result.needs_clarification is True
    assert result.clarifying_questions == [
        "타인의 말을 들을 때 생각과 감정이 정리되어 판단이 선명해지는 쪽인가요, 아니면 수준 차이가 느껴지는 관계에서 거절이나 선택 타이밍이 어려운 쪽인가요?"
    ]
    assert "group_behavior.decision_style.group.definition" in result.evidence_keys
    assert "group_behavior.group_vs_comparison.difference" in result.evidence_keys


def test_comparison_signal_returns_comparison_without_group_confusion() -> None:
    result = classify_concept(
        query="자신보다 수준이 높은 사람에게는 거절이 어렵고 거절 타이밍을 놓쳐서 우유부단해 보여요.",
        task_type="general_agent_task",
    )

    assert result.exam == "group_behavior"
    assert result.axis_candidates[0].axis == "self_efficacy"
    assert result.type_candidates[0].type == "comparison"
    assert result.type_candidates[0].axis == "self_efficacy"
    assert result.type_candidates[0].confidence == "high"
    assert result.needs_clarification is False
    assert "group_behavior.self_efficacy.comparison.definition" in result.evidence_keys


def test_solo_signal_returns_solo_without_full_document_dependency() -> None:
    result = classify_concept(
        query="생각이 정리되기 전에는 남에게 이야기하기 어렵고, 먼저 객관적이고 전문적인 자료를 찾아보고 결정합니다.",
        task_type="general_agent_task",
    )

    assert result.exam == "group_behavior"
    assert result.axis_candidates[0].axis == "decision_style"
    assert result.type_candidates[0].type == "solo"
    assert result.needs_clarification is False
    assert result.evidence_keys == ["group_behavior.decision_style.solo.definition"]


def test_competitive_signal_returns_competitive() -> None:
    result = classify_concept(
        query="수준이 비슷한 또래나 동료 관계에서 자기 신뢰가 높아지고, 나도 할 수 있다는 도전의 용기가 생깁니다.",
        task_type="general_agent_task",
    )

    assert result.exam == "group_behavior"
    assert result.axis_candidates[0].axis == "self_efficacy"
    assert result.type_candidates[0].type == "competitive"
    assert result.type_candidates[0].confidence == "high"
    assert "group_behavior.self_efficacy.competitive.definition" in result.evidence_keys


def test_both_self_efficacy_signal_returns_both_state() -> None:
    result = classify_concept(
        query="비슷한 수준의 관계에서도 자기 신뢰가 올라가고, 수준이 다른 관계에서도 배우거나 돌보며 자기 신뢰가 높아지는 편입니다.",
        task_type="general_agent_task",
    )

    assert result.exam == "group_behavior"
    assert result.axis_candidates[0].axis == "self_efficacy"
    assert result.type_candidates[0].type == "both"
    assert result.type_candidates[0].confidence == "high"
    assert "group_behavior.self_efficacy.both.definition" in result.evidence_keys


def test_neither_self_efficacy_signal_returns_neither_state() -> None:
    result = classify_concept(
        query="비슷한 수준의 관계에서도, 수준이 다른 관계에서도 자기 신뢰가 특별히 높아지지는 않아요. 둘 다 뚜렷하게 설명되지 않습니다.",
        task_type="general_agent_task",
    )

    assert result.exam == "group_behavior"
    assert result.axis_candidates[0].axis == "self_efficacy"
    assert result.type_candidates[0].type == "neither"
    assert result.type_candidates[0].confidence == "high"
    assert "group_behavior.self_efficacy.neither.definition" in result.evidence_keys
