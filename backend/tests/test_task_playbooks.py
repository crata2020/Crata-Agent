from app.services.task_playbooks import load_task_playbook


def test_load_planning_playbook_sections_and_rules() -> None:
    playbook = load_task_playbook("planning")

    assert playbook is not None
    assert playbook.id == "planning"
    assert "프로그램명" in playbook.default_sections
    assert "CRATA 검사 기반 차별점" in playbook.default_sections
    assert "예산안" in playbook.default_sections
    assert any("공식 검사 개념" in rule for rule in playbook.rules)
    assert any("검사 구조가 활동 구조" in rule for rule in playbook.rules)
    assert any("시간 조건" in rule for rule in playbook.rules)
    assert any("예산안" in rule for rule in playbook.rules)
    assert any("활동명" in rule for rule in playbook.rules)
    assert any("총액" in rule for rule in playbook.rules)


def test_load_report_phrase_revision_playbook_required_inputs() -> None:
    playbook = load_task_playbook("report_phrase_revision")

    assert playbook is not None
    assert "current_phrase" in playbook.required_inputs
    assert "revision_goal" in playbook.required_inputs
    assert playbook.rules


def test_unknown_or_empty_playbook_returns_none() -> None:
    assert load_task_playbook(None) is None
    assert load_task_playbook("") is None
    assert load_task_playbook("../planning") is None
    assert load_task_playbook("missing") is None


def test_load_remaining_registry_playbooks() -> None:
    for playbook_id in (
        "concept_explanation",
        "type_judgment",
        "content_strategy",
        "relationship_pattern_analysis",
    ):
        playbook = load_task_playbook(playbook_id)

        assert playbook is not None
        assert playbook.default_sections
        assert playbook.rules
