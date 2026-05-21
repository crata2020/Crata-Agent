from app.services.task_playbooks import load_task_playbook


def test_load_planning_playbook_sections_and_rules() -> None:
    playbook = load_task_playbook("planning")

    assert playbook is not None
    assert playbook.id == "planning"
    assert "프로그램명" in playbook.default_sections
    assert "검사 특징 및 장점" in playbook.default_sections
    assert any("공식 검사 개념" in rule for rule in playbook.rules)


def test_load_report_phrase_revision_playbook_required_inputs() -> None:
    playbook = load_task_playbook("report_phrase_revision")

    assert playbook is not None
    assert "current_phrase" in playbook.required_inputs
    assert "revision_goal" in playbook.required_inputs
    assert any("승인" in rule for rule in playbook.rules)


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
