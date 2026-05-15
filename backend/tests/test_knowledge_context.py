from app.services.knowledge_context import load_task_knowledge_context


def test_load_task_knowledge_context_includes_official_masters_and_agent_guide() -> None:
    context = load_task_knowledge_context(
        task_type="business_planning",
        assigned_agents=["business_designer"],
    )

    assert "개인행동 동기검사 MASTER" in context.text
    assert "집단행동검사 MASTER" in context.text
    assert "사업설계자" in context.text
    assert "먼저 물어볼 질문" in context.text
    assert "knowledge/official/personal-behavior-motivation/MASTER.md" in context.references
    assert "knowledge/official/group-behavior/MASTER.md" in context.references
    assert "knowledge/agent-guides/agent-operating-guides.md" in context.references
