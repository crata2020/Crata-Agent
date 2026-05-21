from app.services.knowledge_scope_planner import plan_knowledge_scope


def test_planning_scope_uses_exam_level_group_behavior_evidence_without_type_judgment() -> None:
    result = plan_knowledge_scope(
        task_type="business_planning",
        query="집단검사의 특징과 장점을 분석해서 학교 학생들에게 맞는 프로그램 기획안으로 만들어줘.",
    )

    assert result.task_type == "planning"
    assert result.legacy_task_type == "business_planning"
    assert result.exam == "group_behavior"
    assert result.reference == "knowledge/official/group-behavior/MASTER.md"
    assert result.requires_type_hypothesis is False
    assert result.scope == [
        "exam_definition",
        "exam_purpose",
        "strengths",
        "application_points",
        "cautions",
    ]
    assert "group_behavior.definition" in result.evidence_keys
    assert "group_behavior.short_definition" in result.evidence_keys
    assert "group_behavior.cautions.not_execution_power" in result.evidence_keys
    assert "group_behavior.decision_style.group.definition" not in result.evidence_keys


def test_type_judgment_scope_merges_concept_router_evidence() -> None:
    result = plan_knowledge_scope(
        task_type="type_judgment",
        query="양쪽 말을 다 들어봐야 판단이 서요. 이건 그룹형이야 비교형이야?",
    )

    assert result.task_type == "type_judgment"
    assert result.exam == "group_behavior"
    assert result.requires_type_hypothesis is True
    assert "signals" in result.scope
    assert "confused_with" in result.scope
    assert "group_behavior.decision_style.group.definition" in result.evidence_keys
    assert "group_behavior.group_vs_comparison.difference" in result.evidence_keys
    assert result.needs_clarification is True


def test_unclear_scope_does_not_select_all_masters() -> None:
    result = plan_knowledge_scope(task_type="general_agent_task", query="")

    assert result.exam is None
    assert result.reference is None
    assert result.evidence_keys == []
    assert result.needs_clarification is True


def test_personal_behavior_planning_scope_includes_exam_value_evidence() -> None:
    result = plan_knowledge_scope(
        task_type="business_planning",
        query="개인행동검사를 기반으로 고등학교 학생들 진로 프로그램 기획안 만들어줘.",
    )

    expected_keys = {
        "personal_behavior_motivation.definition",
        "personal_behavior_motivation.motivation_position.definition",
        "personal_behavior_motivation.motivation_tendency.definition",
        "personal_behavior_motivation.genuine_current.definition",
        "personal_behavior_motivation.position.internal.definition",
        "personal_behavior_motivation.position.external.definition",
        "personal_behavior_motivation.tendency.growth.definition",
        "personal_behavior_motivation.tendency.diffusion.definition",
        "personal_behavior_motivation.tendency.balance.definition",
        "personal_behavior_motivation.tendency.harvest.definition",
        "personal_behavior_motivation.tendency.accumulation.definition",
    }

    assert result.task_type == "planning"
    assert result.exam == "personal_behavior_motivation"
    assert expected_keys.issubset(set(result.evidence_keys))
