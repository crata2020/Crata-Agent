from app.services.planning_context_builder import build_planning_context


def test_personal_behavior_high_school_career_context_combines_exam_topic_and_constraints() -> None:
    context = build_planning_context(
        exam="personal_behavior_motivation",
        audience="school_students",
        output_type="school_program",
        query="개인행동검사를 기반으로 고등학교 학생들 진로 프로그램 기획안 만들어줘. 2시간 정도고 예산도 제안해줘.",
    )

    assert context is not None
    assert context.exam == "personal_behavior_motivation"
    assert context.topic == "career"
    assert context.constraints["duration_minutes"] == 120
    assert context.constraints["budget_requested"] is True
    assert "개인행동 동기검사" in context.text
    assert "동기위치" in context.text
    assert "행동 시작 조건" in context.text
    assert "동기성향" in context.text
    assert "행동 지속 조건" in context.text
    assert "고유/현재" in context.text
    assert "진로 탐색 행동" in context.text
    assert "진로 준비와 탐색 활동" in context.text
    assert "120분" in context.text
    assert "예산안" in context.text


def test_personal_behavior_high_school_study_context_does_not_force_career() -> None:
    context = build_planning_context(
        exam="personal_behavior_motivation",
        audience="school_students",
        output_type="school_program",
        query="개인행동검사 기반으로 고등학생 학업 습관 프로그램 기획안 만들어줘.",
    )

    assert context is not None
    assert context.topic == "study"
    assert "공부 시작" in context.text
    assert "학습 루틴 유지" in context.text
    assert "진로 탐색 행동" not in context.text


def test_personal_behavior_adult_self_understanding_context_does_not_force_work() -> None:
    context = build_planning_context(
        exam="personal_behavior_motivation",
        audience="adults",
        output_type="workshop",
        query="성인 대상 개인행동검사 자기이해 워크숍 기획안",
    )

    assert context is not None
    assert context.topic == "self_understanding"
    assert "현재 생활과 본래 동기 구조의 연결" in context.text
    assert "자기 관찰" in context.text
    assert "업무 착수" not in context.text


def test_personal_behavior_middle_school_relationship_context_converts_concepts_to_activities() -> None:
    context = build_planning_context(
        exam="personal_behavior_motivation",
        audience="school_students",
        output_type="school_program",
        query=(
            "개인행동검사를 기반으로 중학생 학급 프로그램 기획안 만들어줘. "
            "반 아이들이 서로의 행동을 더 잘 이해하는 것이 목적이고 3시간 정도, 예산은 제안해야 해."
        ),
    )

    assert context is not None
    assert context.audience == "middle_school_students"
    assert context.topic == "relationship"
    assert context.constraints["duration_minutes"] == 180
    assert context.constraints["budget_requested"] is True
    assert "친구 행동 오해 카드" in context.text
    assert "무엇이 있어야 시작할까" in context.text
    assert "무엇이 있어야 지속될까" in context.text
    assert "일반 프로그램" in context.text
    assert "CRATA 개인행동 동기검사 기반 프로그램" in context.text
    assert "활동명" in context.text
    assert "검사 개념 연결" in context.text
    assert "1개 학급 25명 기준" in context.text
    assert "총액" in context.text
