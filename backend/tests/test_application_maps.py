from app.services.application_maps import load_application_map


def test_load_group_behavior_school_program_application_map() -> None:
    application_map = load_application_map(
        exam="group_behavior",
        output_type="school_program",
    )

    assert application_map is not None
    assert application_map.id == "group_behavior_school_program"
    assert application_map.application == "school_program"
    assert application_map.audience == "school_students"
    assert any(value.title == "의사결정 방식 인식" for value in application_map.value_propositions)
    assert any("학생을 유형으로 단정하지 않는다" in rule for rule in application_map.rules)


def test_load_application_map_returns_none_for_unmapped_scope() -> None:
    assert load_application_map(exam="group_behavior", output_type="b2b_proposal") is None
    assert load_application_map(exam=None, output_type="school_program") is None
