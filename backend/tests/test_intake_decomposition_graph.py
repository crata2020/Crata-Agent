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


def test_intake_decomposition_graph_splits_short_revision_and_planning_request() -> None:
    result = run_intake_decomposition_graph("문구수정하고 기획서 작성해줘.")

    assert [draft.task_type for draft in result.candidate_drafts] == [
        "report_phrase_revision",
        "business_planning",
    ]
    assert result.candidate_drafts[1].evidence_excerpt.rstrip(".") == "기획서 작성해줘"
    assert result.candidate_drafts[1].workflow_plan["task_type"] == "planning"
    assert result.candidate_drafts[1].workflow_plan["legacy_task_type"] == "business_planning"
    assert result.candidate_drafts[1].workflow_plan["primary_agent"] == "business_designer"
    assert result.candidate_drafts[1].workflow_plan["gates"] == {
        "knowledge": "concept_guardian",
        "quality": "quality_inspector",
    }


def test_intake_decomposition_graph_splits_revision_and_relationship_request() -> None:
    result = run_intake_decomposition_graph("문구수정하고 A유형 B유형 부부관계 패턴 분석해줘.")

    assert [draft.task_type for draft in result.candidate_drafts] == [
        "report_phrase_revision",
        "relationship_pattern_analysis",
    ]
    assert result.candidate_drafts[1].evidence_excerpt == "A유형 B유형 부부관계 패턴 분석해줘."


def test_intake_decomposition_graph_preserves_multiple_same_type_requests() -> None:
    result = run_intake_decomposition_graph(
        "개인행동검사 결과지 3페이지 문구를 부드럽게 수정하자. "
        "집단행동검사 결과지 5페이지 문구도 상담형으로 수정하자."
    )

    assert [draft.task_type for draft in result.candidate_drafts] == [
        "report_phrase_revision",
        "report_phrase_revision",
    ]
    assert "개인행동검사" in result.candidate_drafts[0].evidence_excerpt
    assert "집단행동검사" in result.candidate_drafts[1].evidence_excerpt


def test_intake_decomposition_graph_marks_review_required_for_low_confidence_general_task() -> None:
    result = run_intake_decomposition_graph("다음 회의 전에 다시 검토할 메모를 정리해둔다.")

    assert result.human_review_required is True
    assert [draft.task_type for draft in result.candidate_drafts] == ["general_agent_task"]
    assert result.candidate_drafts[0].review_flags == ["분류 검토 필요"]
