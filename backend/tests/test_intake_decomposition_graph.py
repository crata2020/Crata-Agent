from app.services.intake_decomposition_graph import run_intake_decomposition_graph


def test_intake_decomposition_graph_runs_review_workflow_nodes() -> None:
    result = run_intake_decomposition_graph(
        "결과지 문구는 상담형으로 수정하자. "
        "그리고 공공기관 연수 프로그램 제안서도 기획하자."
    )

    assert result.graph_name == "intake_decomposition_graph"
    assert result.human_review_required is True
    assert [node.name for node in result.node_trace] == [
        "preserve_input",
        "split_semantic_units",
        "collect_rule_hints",
        "judge_with_ai_context",
        "build_candidates",
        "prepare_human_review",
    ]
    assert all(node.status == "completed" for node in result.node_trace)
    assert [draft.task_type for draft in result.candidate_drafts] == [
        "report_phrase_revision",
        "business_planning",
    ]


def test_intake_decomposition_graph_marks_review_required_for_low_confidence_general_task() -> None:
    result = run_intake_decomposition_graph("다음 회의 전에 다시 검토할 메모를 정리해둔다.")

    assert result.human_review_required is True
    assert [draft.task_type for draft in result.candidate_drafts] == ["general_agent_task"]
    assert result.candidate_drafts[0].review_flags == ["분류 검토 필요"]
