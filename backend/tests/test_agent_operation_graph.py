from app.services.agent_operation_graph import run_agent_operation_graph


def test_agent_operation_graph_plans_specialist_and_approval_flow() -> None:
    result = run_agent_operation_graph(
        task_type="content_marketing",
        assigned_agents=["crata_ceo", "content_strategist"],
        knowledge_references=[
            "knowledge/official/personal-behavior-motivation/MASTER.md",
            "knowledge/agent-guides/agent-operating-guides.md",
        ],
    )

    assert result.graph_name == "agent_operation_graph"
    assert [step.step_name for step in result.steps] == [
        "ceo_routing",
        "context_retrieval",
        "question_gate",
        "specialist_draft",
        "quality_review",
    ]
    assert result.steps[2].agent_id == "content_strategist"
    assert result.steps[3].agent_id == "content_strategist"
    assert [node.name for node in result.node_trace] == [
        "ceo_routing",
        "context_retrieval",
        "question_gate",
        "specialist_draft",
        "quality_review",
        "approval_pending",
    ]


def test_agent_operation_graph_uses_registry_primary_agent_for_canonical_task_types() -> None:
    result = run_agent_operation_graph(
        task_type="planning",
        assigned_agents=[],
        knowledge_references=[],
    )

    assert result.steps[2].agent_id == "business_designer"
    assert result.steps[3].agent_id == "business_designer"
