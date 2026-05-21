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
