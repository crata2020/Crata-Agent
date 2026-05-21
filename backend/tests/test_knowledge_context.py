from pathlib import Path

from app.services.knowledge_context import load_task_knowledge_context


REPO_ROOT = Path(__file__).resolve().parents[2]

PERSONAL_MASTER = "knowledge/official/personal-behavior-motivation/MASTER.md"
GROUP_MASTER = "knowledge/official/group-behavior/MASTER.md"
ORGANIZATION_MASTER = "knowledge/official/organizational-behavior/MASTER.md"
AGENT_GUIDE = "knowledge/agent-guides/agent-operating-guides.md"


def _knowledge_text(reference: str) -> str:
    return (REPO_ROOT / reference).read_text(encoding="utf-8").strip()


def test_group_exam_query_keeps_references_but_does_not_embed_full_master() -> None:
    context = load_task_knowledge_context(
        task_type="general_agent_task",
        assigned_agents=["crata_ceo", "concept_guardian"],
        query="집단행동검사에서 관계 속 대화를 통해 생각과 감정이 정리되는 사람은 어떤 유형인가요?",
    )

    assert context.references == [GROUP_MASTER]
    assert "group_behavior.decision_style.group.definition" in context.evidence_keys
    assert "group_behavior.group_vs_comparison.difference" in context.evidence_keys
    assert _knowledge_text(GROUP_MASTER) not in context.text
    assert _knowledge_text(PERSONAL_MASTER) not in context.text
    assert _knowledge_text(ORGANIZATION_MASTER) not in context.text
    assert len(context.text) < 5000


def test_business_task_keeps_process_guide_reference_without_full_guide_text() -> None:
    context = load_task_knowledge_context(
        task_type="business_planning",
        assigned_agents=["crata_ceo", "business_designer"],
        query="집단행동검사를 활용한 기업 소통 워크숍 기획안을 작성합니다.",
    )

    assert context.references == [GROUP_MASTER, AGENT_GUIDE]
    assert _knowledge_text(GROUP_MASTER) not in context.text
    assert _knowledge_text(AGENT_GUIDE) not in context.text
    assert "# 작업 플레이북" in context.text
    assert "프로그램명" in context.text
    assert "검사 특징 및 장점" in context.text
    assert "공식 검사 개념과 충돌하지 않는다." in context.text


def test_report_phrase_revision_context_includes_playbook_and_approval_policy() -> None:
    context = load_task_knowledge_context(
        task_type="report_phrase_revision",
        assigned_agents=["report_editor"],
        query="집단검사 비교형 결과지 문구를 고등학생용으로 부드럽게 수정해줘.",
    )

    assert "# 작업 플레이북" in context.text
    assert "current_phrase" in context.text
    assert "revision_goal" in context.text
    assert "최종 반영은 승인 절차를 거친다." in context.text
    assert "action_policy: create_approval" in context.text


def test_school_program_planning_context_includes_group_behavior_application_map() -> None:
    context = load_task_knowledge_context(
        task_type="business_planning",
        assigned_agents=["business_designer"],
        query="집단검사의 특징과 장점을 분석해서 학교 학생 프로그램 기획안으로 만들어줘.",
    )

    assert "# 적용 지도" in context.text
    assert "학교 학생 프로그램" in context.text
    assert "의사결정 방식 인식" in context.text
    assert "또래 관계 속 자기 신뢰" in context.text


def test_organizational_terms_select_organizational_master_without_full_text() -> None:
    context = load_task_knowledge_context(
        task_type="general_agent_task",
        assigned_agents=["concept_guardian"],
        query="조직검사의 설계형과 기술형 차이를 설명합니다.",
    )

    assert context.references == [ORGANIZATION_MASTER]
    assert _knowledge_text(ORGANIZATION_MASTER) not in context.text
    assert _knowledge_text(GROUP_MASTER) not in context.text


def test_unclear_query_does_not_fall_back_to_all_official_masters() -> None:
    context = load_task_knowledge_context(
        task_type="general_agent_task",
        assigned_agents=[],
        query="",
    )

    assert context.references == []
    assert context.needs_clarification is True
    assert context.clarifying_questions
    assert PERSONAL_MASTER not in context.references
    assert GROUP_MASTER not in context.references
    assert ORGANIZATION_MASTER not in context.references
    for reference in (PERSONAL_MASTER, GROUP_MASTER, ORGANIZATION_MASTER):
        assert _knowledge_text(reference) not in context.text


def test_personal_behavior_planning_context_includes_composable_planning_context() -> None:
    context = load_task_knowledge_context(
        task_type="business_planning",
        assigned_agents=["business_designer"],
        query="개인행동검사를 기반으로 고등학교 학생들 진로 프로그램 기획안 만들어줘. 2시간 정도고 예산도 제안해줘.",
    )

    assert "# 기획 변환 컨텍스트" in context.text
    assert "personal_behavior_value_map" in context.text
    assert "동기위치" in context.text
    assert "동기성향" in context.text
    assert "고유/현재" in context.text
    assert "진로 탐색 행동" in context.text
    assert "120분" in context.text
    assert "예산안" in context.text
    assert context.workflow_plan["exam"] == "personal_behavior_motivation"
    assert context.workflow_plan["planning_topic"] == "career"
    assert context.workflow_plan["planning_constraints"]["duration_minutes"] == 120
    assert context.workflow_plan["planning_constraints"]["budget_requested"] is True
    assert "personal_behavior_motivation.motivation_position.definition" in context.evidence_keys
