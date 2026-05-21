from app.services.output_guard import validate_output


def test_output_guard_rejects_internal_metadata_leakage() -> None:
    result = validate_output(
        task_type="planning",
        workflow_plan={"approval_required": False},
        draft="# 기획안\n\n## 작업 유형\nplanning\n\nprimary_agent: business_designer",
    )

    assert result.passed is False
    assert result.rewrite_required is True
    assert any("내부 메타데이터" in issue for issue in result.issues)


def test_output_guard_rejects_persisted_claim_before_approval() -> None:
    result = validate_output(
        task_type="report_phrase_revision",
        workflow_plan={"approval_required": True},
        draft="결과지 문구를 공식 지식에 반영했습니다.",
    )

    assert result.passed is False
    assert any("승인 전 저장" in issue for issue in result.issues)


def test_output_guard_requires_case_learning_anonymization_and_approval_language() -> None:
    result = validate_output(
        task_type="case_learning",
        workflow_plan={
            "requires_anonymization": True,
            "approval_required": True,
        },
        draft="이 사례는 비교형 대표 사례로 학습 가치가 큽니다.",
    )

    assert result.passed is False
    assert any("익명화" in issue for issue in result.issues)
    assert any("승인" in issue for issue in result.issues)


def test_output_guard_passes_clean_planning_draft() -> None:
    result = validate_output(
        task_type="planning",
        workflow_plan={"approval_required": False},
        draft="# 학교 프로그램 기획안\n\n## 검사 특징 및 장점\n집단검사의 특징을 교육 활동으로 전환합니다.",
    )

    assert result.passed is True
    assert result.issues == []
    assert result.rewrite_required is False


def test_output_guard_rejects_generic_personal_behavior_planning_draft() -> None:
    result = validate_output(
        task_type="planning",
        workflow_plan={
            "task_type": "planning",
            "exam": "personal_behavior_motivation",
            "planning_topic": "career",
            "planning_constraints": {
                "duration_minutes": 120,
                "budget_requested": True,
            },
        },
        draft="고등학생의 자기 이해와 진로 탐색을 돕는 일반적인 프로그램입니다. 강점과 약점을 파악합니다.",
    )

    assert result.passed is False
    assert result.rewrite_required is True
    assert any("동기위치" in issue for issue in result.issues)
    assert any("동기성향" in issue for issue in result.issues)
    assert any("예산" in issue for issue in result.issues)


def test_output_guard_passes_specific_personal_behavior_planning_draft() -> None:
    result = validate_output(
        task_type="planning",
        workflow_plan={
            "task_type": "planning",
            "exam": "personal_behavior_motivation",
            "planning_topic": "career",
            "planning_constraints": {
                "duration_minutes": 120,
                "budget_requested": True,
            },
        },
        draft=(
            "개인행동 동기검사의 동기위치는 진로 탐색 행동의 시작 조건을 다루고, "
            "동기성향은 진로 준비를 지속하게 하는 조건을 다룹니다. "
            "고유/현재 비교를 통해 본래 방식과 학교생활에서 쓰는 방식을 연결합니다. "
            "세부 운영표는 총 120분으로 구성하고, 예산안은 1개 학급 25명 기준으로 검사비와 강사비를 나누고 총액을 제안합니다. "
            "기대효과는 시작 조건 이해, 지속 조건 이해, 실행 전략 수립입니다."
        ),
    )

    assert result.passed is True
    assert result.issues == []


def test_output_guard_rejects_vague_relationship_activity_and_budget() -> None:
    result = validate_output(
        task_type="planning",
        workflow_plan={
            "task_type": "planning",
            "exam": "personal_behavior_motivation",
            "planning_topic": "relationship",
            "planning_constraints": {
                "duration_minutes": 180,
                "budget_requested": True,
            },
        },
        draft=(
            "중학생이 서로를 이해하는 3시간 프로그램입니다. "
            "동기위치와 동기성향, 고유/현재를 설명하고 역할극과 토론을 진행합니다. "
            "예산안에는 검사비와 강사비를 포함합니다."
        ),
    )

    assert result.passed is False
    assert any("세부 활동" in issue for issue in result.issues)
    assert any("오해" in issue for issue in result.issues)
    assert any("총액" in issue for issue in result.issues)


def test_output_guard_passes_structured_relationship_planning_draft() -> None:
    result = validate_output(
        task_type="planning",
        workflow_plan={
            "task_type": "planning",
            "exam": "personal_behavior_motivation",
            "planning_topic": "relationship",
            "planning_constraints": {
                "duration_minutes": 180,
                "budget_requested": True,
            },
        },
        draft=(
            "개인행동 동기검사의 동기위치는 친구 행동의 시작 조건을 이해하게 하고, "
            "동기성향은 친구가 오래 지속하는 조건을 이해하게 합니다. 고유/현재 비교도 포함합니다. "
            "세부 활동: 활동명 친구 행동 오해 카드 바꾸기, 목적은 행동을 태도 문제가 아니라 조건 차이로 이해하는 것, "
            "진행 방식은 오해 문장을 무엇이 있어야 시작할까/무엇이 있어야 지속될까 문장으로 바꾸는 것, "
            "검사 개념 연결은 동기위치와 동기성향, 산출물은 우리 반 행동 이해 카드입니다. "
            "예산안은 1개 학급 25명 기준이며 검사비 250,000원, 강사비 300,000원, 자료 제작비 75,000원, 운영비 100,000원, 총액 725,000원입니다. "
            "총 180분 운영표로 구성합니다."
        ),
    )

    assert result.passed is True
    assert result.issues == []
