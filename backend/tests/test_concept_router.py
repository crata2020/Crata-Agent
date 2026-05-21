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


def test_structural_concept_maps_do_not_emit_blank_type_candidates() -> None:
    result = classify_concept(
        query="개인행동 동기검사에서 외적자극형을 설명해줘.",
        task_type="concept_explanation",
    )

    assert all(candidate.type for candidate in result.type_candidates)


def test_rc_is_not_detected_from_explanation_request_only() -> None:
    result = classify_concept(
        query="경쟁형과 비교형 둘 다 설명해줘.",
        task_type="concept_explanation",
    )

    assert not any(
        candidate.type == "both" and candidate.confidence in {"medium", "high"}
        for candidate in result.type_candidates
    )


def test_rc_is_not_detected_from_generic_all_words() -> None:
    result = classify_concept(
        query="혼자형과 그룹형 모두 알려줘.",
        task_type="concept_explanation",
    )

    assert not any(
        candidate.axis == "self_efficacy" and candidate.type == "both"
        for candidate in result.type_candidates
    )


def test_neither_is_not_detected_from_insufficient_information() -> None:
    result = classify_concept(
        query="어떤 관계에서 자신감이 생기는지는 아직 잘 모르겠어요.",
        task_type="type_judgment",
    )

    assert not any(
        candidate.axis == "self_efficacy" and candidate.type == "neither"
        for candidate in result.type_candidates
    )
    assert result.needs_clarification is True


def test_rc_detected_when_both_relation_levels_raise_self_trust() -> None:
    result = classify_concept(
        query=(
            "또래나 동료처럼 비슷한 수준의 관계에서도 자신감이 생기고, "
            "나보다 수준이 다른 사람에게 배우거나 내가 돌봐야 하는 사람을 챙길 때도 자기 신뢰가 올라가요."
        ),
        task_type="type_judgment",
    )

    assert any(
        candidate.axis == "self_efficacy"
        and candidate.type == "both"
        and candidate.confidence in {"medium", "high"}
        for candidate in result.type_candidates
    )


def test_neither_detected_when_both_relation_levels_do_not_raise_self_trust() -> None:
    result = classify_concept(
        query=(
            "비슷한 수준의 또래 관계에서도 특별히 자기 신뢰가 올라가는 편은 아니고, "
            "수준이 다른 사람을 보거나 돌보는 관계에서도 특별히 자신감이 살아나는 편은 아니에요."
        ),
        task_type="type_judgment",
    )

    assert any(
        candidate.axis == "self_efficacy"
        and candidate.type == "neither"
        and candidate.confidence in {"medium", "high"}
        for candidate in result.type_candidates
    )
