import json
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
KNOWLEDGE_ROOT = REPO_ROOT / "knowledge"


def _load_json(path: Path) -> dict:
    with path.open(encoding="utf-8") as file:
        return json.load(file)


def test_core_knowledge_markdown_files_exist() -> None:
    for file_name in [
        "personal_behavior_motivation.md",
        "group_behavior.md",
        "organizational_behavior.md",
    ]:
        path = KNOWLEDGE_ROOT / "core" / file_name
        assert path.is_file(), f"Missing core knowledge file: {path}"


def test_concept_map_json_files_exist_and_parse() -> None:
    for file_name in [
        "personal_behavior_motivation.json",
        "group_behavior.json",
        "organizational_behavior.json",
    ]:
        path = KNOWLEDGE_ROOT / "concept_maps" / file_name
        data = _load_json(path)
        assert data["id"]
        assert data["name"]


def test_personal_behavior_motivation_has_ten_genuine_and_current_combinations() -> None:
    data = _load_json(
        KNOWLEDGE_ROOT
        / "combinations"
        / "personal_behavior_motivation_combinations.json"
    )

    assert len(data["genuine_combinations"]) == 10
    assert len(data["current_combinations"]) == 10


def test_group_behavior_has_eight_combinations() -> None:
    data = _load_json(KNOWLEDGE_ROOT / "combinations" / "group_behavior_combinations.json")

    assert len(data["combinations"]) == 8


def test_organizational_behavior_has_256_generated_axis_state_combinations() -> None:
    data = _load_json(
        KNOWLEDGE_ROOT
        / "combinations"
        / "organizational_behavior_axis_state_combinations.generated.json"
    )

    assert data["count"] == 256
    assert len(data["combinations"]) == 256
    assert {combo["status"] for combo in data["combinations"]} == {
        "generated_auto_draft"
    }


def test_organizational_growth_competency_cognition_uses_personal_genuine_combinations() -> None:
    data = _load_json(KNOWLEDGE_ROOT / "concept_maps" / "organizational_behavior.json")
    growth_competency = next(
        competency
        for competency in data["competencies"]
        if competency["id"] == "growth_competency"
    )

    assert (
        growth_competency["cognition_value_source"]
        == "personal_behavior_motivation.genuine_10_combinations"
    )


def test_organizational_behavior_four_axes_exclude_self_efficacy_enhancement() -> None:
    data = _load_json(KNOWLEDGE_ROOT / "concept_maps" / "organizational_behavior.json")
    axis_ids = {axis["id"] for axis in data["behavior_4_axes"]}

    assert axis_ids == {
        "purpose_achievement",
        "information_processing",
        "ability_expression",
        "goal_execution",
    }
    assert "self_efficacy_enhancement" not in axis_ids


def test_group_behavior_neither_combination_definitions_are_natural() -> None:
    data = _load_json(KNOWLEDGE_ROOT / "combinations" / "group_behavior_combinations.json")
    neither_definitions = [
        combination["definition"]
        for combination in data["combinations"]
        if combination["self_efficacy_style"] == "neither"
    ]

    assert neither_definitions
    for definition in neither_definitions:
        assert "설명되지 않음에서 높아지는" not in definition
        assert "어느 한쪽으로도 뚜렷하게 설명되지" in definition


def test_group_behavior_concept_map_uses_relative_source_document() -> None:
    data = _load_json(KNOWLEDGE_ROOT / "concept_maps" / "group_behavior.json")

    assert "source_file" not in data
    assert data["source_doc"] == {
        "id": "group_behavior_2026_05_16",
        "path": "knowledge/_sources/group-behavior_2026-05-16.raw.md",
        "source_type": "extracted_markdown",
    }
