from app.services.model_gateway import ModelGateway


def test_business_planning_fallback_uses_expert_planning_structure() -> None:
    draft = ModelGateway()._fallback_draft(
        task_title="공공기관 회복 프로그램 제안서",
        task_type="business_planning",
        context=(
            "# 사용자 작업\n"
            "공공기관 연수 프로그램에 CRATA 검사를 넣는 기획서를 만든다.\n\n"
            "# CRATA 지식 컨텍스트\n"
            "개인행동 동기검사 MASTER\n"
            "집단행동검사 MASTER\n"
            "사업설계자\n"
            "먼저 물어볼 질문\n"
        ),
    )

    assert "MVP 에이전트 워크플로우" not in draft
    assert "작업 유형" not in draft
    assert "검수 메모" not in draft
    assert "참조한 컨텍스트" not in draft
    assert "## 먼저 확인할 질문" in draft
    assert "대상" in draft
    assert "예산" in draft
    assert "## CRATA 검사 활용 방향" in draft
    assert "개인행동 동기검사" in draft
    assert "집단행동검사" in draft
    assert "## 제안서 기본 구조" in draft
    assert "기대효과" in draft


def test_report_phrase_revision_fallback_uses_report_editor_structure() -> None:
    draft = ModelGateway()._fallback_draft(
        task_title="결과지 문구 수정",
        task_type="report_phrase_revision",
        context=(
            "# 사용자 작업\n"
            "집단검사 결과지 문구를 더 부드럽게 수정한다.\n\n"
            "# CRATA 지식 컨텍스트\n"
            "집단행동검사 MASTER\n"
            "결과지 에디터\n"
            "품질검수관\n"
        ),
    )

    assert "MVP 에이전트 워크플로우" not in draft
    assert "## 문구 수정 작업 절차" in draft
    assert "## Before / After 초안" in draft
    assert "낙인" in draft
    assert "최종 반영 전 승인 절차" in draft
    assert "개념수호자" not in draft
    assert "품질검수관" not in draft
    assert "작업 유형" not in draft
    assert "검수 메모" not in draft
    assert "참조한 컨텍스트" not in draft


def test_planning_fallback_uses_playbook_sections_without_internal_metadata() -> None:
    draft = ModelGateway()._fallback_draft(
        task_title="학교 학생 프로그램 기획안",
        task_type="planning",
        context=(
            "# 사용자 작업\n"
            "집단검사의 특징과 장점을 분석해서 학교 학생 프로그램 기획안으로 만든다.\n\n"
            "# 작업 플레이북\n\n"
            "## 출력 섹션\n\n"
            "- 프로그램명\n"
            "- 기획 배경\n"
            "- 검사 특징 및 장점\n"
            "- 회기 구성\n"
            "- 기대효과\n\n"
            "action_policy: respond_only\n"
        ),
    )

    assert "## 제안서 기본 구조" in draft
    assert "프로그램명" in draft
    assert "검사 특징 및 장점" in draft
    assert "회기 구성" in draft
    assert "작업 유형" not in draft
    assert "primary_agent" not in draft
    assert "action_policy" not in draft


def test_fallback_draft_surfaces_candidate_clarifying_questions() -> None:
    draft = ModelGateway()._fallback_draft(
        task_title="기관 프로그램 기획",
        task_type="business_planning",
        context=(
            "# 사용자 작업\n"
            "기관 프로그램 기획을 진행한다.\n\n"
            "# 먼저 확인할 질문\n\n"
            "1. 대상 기관 또는 고객은 누구인가?\n"
            "2. 예산, 일정, 운영 형태의 제한은 무엇인가?\n\n"
            "# CRATA 지식 컨텍스트\n"
            "개인행동 동기검사 MASTER\n"
        ),
    )

    assert "## 먼저 확인할 질문" in draft
    assert "대상 기관 또는 고객은 누구인가?" in draft
    assert "예산, 일정, 운영 형태의 제한은 무엇인가?" in draft


def test_fallback_draft_prefers_candidate_specific_questions_over_default_questions() -> None:
    draft = ModelGateway()._fallback_draft(
        task_title="기관 프로그램 기획",
        task_type="business_planning",
        context=(
            "# 사용자 작업\n"
            "지방 공공기관 신규 관리자 대상으로 1박2일 회복 프로그램을 800만원 안쪽으로 기획한다.\n\n"
            "# 먼저 확인할 질문\n\n"
            "1. 해결하려는 문제나 개선하고 싶은 장면은 무엇인가?\n"
            "2. CRATA 검사 중 어떤 검사를 어떤 단계에 넣고 싶은가?\n\n"
            "# CRATA 지식 컨텍스트\n"
            "개인행동 동기검사 MASTER\n"
        ),
    )

    assert "해결하려는 문제나 개선하고 싶은 장면은 무엇인가?" in draft
    assert "CRATA 검사 중 어떤 검사를 어떤 단계에 넣고 싶은가?" in draft
    assert "참여자, 구매자, 승인권자는 누구인가?" not in draft
    assert "강사비, 자료비, 장소비, 운영비 범위가 있는가?" not in draft


def test_fallback_draft_reflects_clarifying_answers_without_repeating_questions() -> None:
    draft = ModelGateway()._fallback_draft(
        task_title="기관 프로그램 기획",
        task_type="business_planning",
        context=(
            "# 사용자 작업\n"
            "기관 프로그램 기획을 진행한다.\n\n"
            "# 먼저 확인할 질문\n\n"
            "1. 대상 기관 또는 고객은 누구인가?\n"
            "2. 예산, 일정, 운영 형태의 제한은 무엇인가?\n\n"
            "# 질문 답변 / 추가 메모\n\n"
            "대상은 공공기관 신규 관리자이고, 1박2일 형식으로 800만원 안쪽을 원한다.\n\n"
            "# CRATA 지식 컨텍스트\n"
            "개인행동 동기검사 MASTER\n"
        ),
    )

    assert "## 질문 답변 반영" in draft
    assert "공공기관 신규 관리자" in draft
    assert "1박2일" in draft
    assert "800만원" in draft
    assert "대상 기관 또는 고객은 누구인가?" not in draft


def test_general_fallback_uses_user_request_not_full_context_when_recommending_exam() -> None:
    user_request = (
        "내가 시작이 어려운데 어떤 검사를 하면 좋을까?\n"
        "공부할 때 책상에 앉는게 어려워. 오래 앉아 있기도 어렵고"
    )
    draft = ModelGateway()._fallback_draft(
        task_title="일반 에이전트 작업 후보",
        task_type="general_agent_task",
        context=(
            "# 사용자 작업\n\n"
            f"설명: {user_request}\n\n"
            "# CRATA 지식 컨텍스트\n"
            "## 참조 파일: knowledge/official/personal-behavior-motivation/MASTER.md\n"
            "개인행동 동기검사 MASTER\n"
            "## 참조 파일: knowledge/official/group-behavior/MASTER.md\n"
            "집단행동검사 MASTER\n"
        ),
    )

    assert "개인행동 동기검사" in draft or "행동동기검사" in draft
    assert "집단검사는 개인이 혼자 있을 때" not in draft


def test_general_fallback_recommends_personal_exam_from_start_and_maintenance_structure() -> None:
    draft = ModelGateway()._fallback_draft(
        task_title="일반 에이전트 작업 후보",
        task_type="general_agent_task",
        context=(
            "# 사용자 작업\n\n"
            "설명: 새 일을 시작하지 못하고, 시작해도 끝까지 유지가 잘 안 됩니다. 어떤 검사가 맞나요?\n\n"
            "# CRATA 지식 컨텍스트\n"
            "## 참조 파일: knowledge/official/personal-behavior-motivation/MASTER.md\n"
            "개인행동 동기검사 MASTER\n"
            "## 참조 파일: knowledge/official/group-behavior/MASTER.md\n"
            "집단행동검사 MASTER\n"
        ),
    )

    assert "개인행동 동기검사" in draft or "행동동기검사" in draft
    assert "집단검사는 개인이 혼자 있을 때" not in draft
