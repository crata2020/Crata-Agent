from app.services.task_registry import build_workflow_plan, get_task_definition, resolve_task_type


def test_registry_resolves_legacy_business_planning_to_planning_workflow() -> None:
    task = get_task_definition("business_planning")

    assert task.id == "planning"
    assert task.primary_agent == "business_designer"
    assert task.gates == {
        "knowledge": "concept_guardian",
        "quality": "quality_inspector",
    }
    assert task.approval_required is False
    assert "exam_definition" in task.default_knowledge_scope


def test_build_workflow_plan_detects_school_program_output_type() -> None:
    plan = build_workflow_plan(
        task_type="business_planning",
        query="집단검사의 특징과 장점을 분석해서 학교 학생 프로그램 기획안으로 만들어줘.",
    )

    assert plan["task_type"] == "planning"
    assert plan["legacy_task_type"] == "business_planning"
    assert plan["output_type"] == "school_program"
    assert plan["audience"] == "school_students"
    assert plan["primary_agent"] == "business_designer"
    assert plan["approval_required"] is False
    assert plan["requires_type_hypothesis"] is False
    assert plan["gates"]["knowledge"] == "concept_guardian"


def test_case_learning_uses_type_hypothesis_and_approval_gate() -> None:
    plan = build_workflow_plan(
        task_type="counseling_case_learning",
        query="이 상담 사례를 비교형 대표 사례 후보로 저장해서 나중에 학습에 반영해줘.",
    )

    assert plan["task_type"] == "case_learning"
    assert plan["legacy_task_type"] == "counseling_case_learning"
    assert plan["primary_agent"] == "case_learner"
    assert plan["requires_type_hypothesis"] is True
    assert plan["allow_uncertain_type"] is True
    assert plan["requires_anonymization"] is True
    assert plan["approval_required"] is True
    assert plan["action_policy"]["default"] == "create_approval"


def test_resolve_unknown_task_type_keeps_general_agent_task() -> None:
    assert resolve_task_type("unknown_task") == "general_agent_task"
