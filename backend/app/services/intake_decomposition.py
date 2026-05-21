import os
import re
from dataclasses import dataclass, field, replace

from app.services.task_registry import build_workflow_plan


@dataclass(frozen=True)
class CandidateTaskDraft:
    task_type: str
    title: str
    summary: str
    evidence_excerpt: str
    recommended_agents: list[str]
    rule_hint_task_type: str | None
    ai_task_type: str
    classification_source: str
    classification_status: str
    confidence: float
    classification_reason: str
    approval_required: bool
    rule_hints: list[str]
    review_flags: list[str]
    clarifying_questions: list[str]
    workflow_plan: dict = field(default_factory=dict)


_CATEGORIES = [
    {
        "task_type": "report_phrase_revision",
        "keywords": [
            "결과지",
            "문구",
            "페이지",
            "수정",
            "검사 문구",
            "표현",
            "부드럽게",
            "바꿔",
            "개선",
        ],
        "title": "결과지 문구 수정 후보",
        "summary": "입력문에서 검사 결과지 문구 수정 요청을 발견했습니다.",
        "recommended_agents": [
            "crata_ceo",
            "concept_guardian",
            "report_editor",
            "quality_inspector",
        ],
        "approval_required": True,
        "reason": "검사 결과지 문구에 반영될 수 있는 요청이므로 개념 검수와 승인 흐름이 필요합니다.",
    },
    {
        "task_type": "counseling_case_learning",
        "keywords": [
            "상담",
            "전사록",
            "사례",
            "학습",
            "유형",
            "관계",
            "내담자",
            "상담자",
            "갈등",
            "불안",
            "패턴",
        ],
        "title": "상담 사례 학습 후보",
        "summary": "입력문에서 상담 사례 저장 또는 학습 후보 요청을 발견했습니다.",
        "recommended_agents": [
            "crata_ceo",
            "case_learner",
            "relationship_analyst",
            "quality_inspector",
        ],
        "approval_required": True,
        "reason": "상담 사례와 유형 패턴 학습 후보이므로 익명화, 관계 패턴 검토, 승인 흐름이 필요합니다.",
    },
    {
        "task_type": "relationship_pattern_analysis",
        "keywords": [
            "유형 조합",
            "관계 분석",
            "관계 패턴",
            "상호작용",
            "갈등 루프",
            "반복 패턴",
            "오해 포인트",
            "부부관계",
            "부모자녀",
            "직장관계",
            "대화 패턴",
        ],
        "title": "유형 조합·관계 패턴 분석 후보",
        "summary": "입력문에서 유형과 유형이 만났을 때의 관계 패턴 분석 요청을 발견했습니다.",
        "recommended_agents": [
            "crata_ceo",
            "concept_guardian",
            "relationship_analyst",
            "quality_inspector",
        ],
        "approval_required": True,
        "reason": "유형 간 관계 해석은 공식 지식과 상담 사례가 섞일 수 있으므로 개념 근거와 승인 흐름이 필요합니다.",
    },
    {
        "task_type": "business_planning",
        "keywords": [
            "제안서",
            "기획서",
            "계획서",
            "사업계획서",
            "프로그램",
            "상품",
            "기획",
            "공공기관",
            "기업",
            "연수",
            "워크숍",
            "사업",
        ],
        "title": "사업·프로그램 기획 후보",
        "summary": "입력문에서 사업, 제안서, 상품, 프로그램 기획 요청을 발견했습니다.",
        "recommended_agents": ["crata_ceo", "business_designer"],
        "approval_required": False,
        "reason": "사업, 제안서, 상품, 프로그램을 설계하는 기획 요청으로 분류했습니다.",
    },
    {
        "task_type": "content_marketing",
        "keywords": [
            "유튜브",
            "홍보",
            "블로그",
            "콘텐츠",
            "홈페이지",
            "마케팅",
            "카드뉴스",
            "SNS",
            "영상",
        ],
        "title": "콘텐츠·홍보 작업 후보",
        "summary": "입력문에서 콘텐츠, 홍보, 유튜브 관련 요청을 발견했습니다.",
        "recommended_agents": ["crata_ceo", "content_strategist"],
        "approval_required": False,
        "reason": "홍보, 콘텐츠, 유튜브, 블로그 등 외부 커뮤니케이션 작업으로 분류했습니다.",
    },
]

_CATEGORY_BY_TYPE = {category["task_type"]: category for category in _CATEGORIES}


def detect_input_type(title: str, raw_content: str) -> str:
    text = f"{title}\n{raw_content}".casefold()

    transcript_score = _keyword_score(
        text,
        [
            "상담자",
            "내담자",
            "상담 기록",
            "전사록",
            "발화",
            "축어록",
            "내담",
            "상담 내용",
        ],
    )
    meeting_score = _keyword_score(
        text,
        [
            "회의록",
            "회의",
            "안건",
            "결정사항",
            "논의",
            "참석자",
            "액션아이템",
            "action item",
            "합의",
        ],
    )

    if transcript_score >= 2 or "전사록" in text or ("상담자" in text and "내담자" in text):
        return "transcript"

    if meeting_score >= 1:
        return "meeting_notes"

    return "memo"


def decompose_input(raw_content: str) -> list[CandidateTaskDraft]:
    text = raw_content.strip()

    if not _llm_intake_router_enabled():
        return _decompose_input_with_rules(text)

    from app.services.llm_router import decompose_intake_with_llm

    llm_tasks = decompose_intake_with_llm(text)
    if not llm_tasks:
        return _decompose_input_with_rules(text)
        
    drafts: list[CandidateTaskDraft] = []
    
    for t in llm_tasks:
        task_type = t.get("task_type", "general_agent_task")
        
        # Fallback to general if task_type is invalid
        if task_type not in _CATEGORY_BY_TYPE and task_type != "general_agent_task":
            task_type = "general_agent_task"
            
        if task_type == "general_agent_task":
            category = {
                "title": "일반 에이전트 작업 후보",
                "summary": "명확한 유형은 없지만 실행 가능한 일반 요청으로 분류했습니다.",
                "recommended_agents": ["crata_ceo", "concept_guardian"],
                "approval_required": False
            }
        else:
            category = _CATEGORY_BY_TYPE[task_type]
            
        drafts.append(
            CandidateTaskDraft(
                task_type=task_type,
                title=category["title"],
                summary=t.get("summary", category["summary"]),
                evidence_excerpt=t.get("evidence_excerpt", text[:180]),
                recommended_agents=category["recommended_agents"],
                rule_hint_task_type=None,
                ai_task_type=task_type,
                classification_source="llm_router",
                classification_status="aligned",
                confidence=0.9,
                classification_reason="LLM Router classified this task based on user intent.",
                approval_required=category.get("approval_required", False),
                rule_hints=[],
                review_flags=[],
                clarifying_questions=t.get("clarifying_questions", []),
                workflow_plan=build_workflow_plan(task_type=task_type, query=t.get("summary", text)),
            )
        )
        
    return drafts


def _llm_intake_router_enabled() -> bool:
    return os.getenv("CRATA_ENABLE_LLM_INTAKE_ROUTER", "").casefold() in {"1", "true", "yes", "on"}


def _decompose_input_with_rules(text: str) -> list[CandidateTaskDraft]:
    drafts: list[CandidateTaskDraft] = []
    for unit in _semantic_units(text):
        rule_hint_task_type, rule_hints = _rule_hint(unit)
        ai_task_type, classification_reason = _ai_judgment(unit, rule_hint_task_type)
        if not ai_task_type or ai_task_type not in _CATEGORY_BY_TYPE:
            if drafts:
                previous = drafts[-1]
                combined_excerpt = f"{previous.evidence_excerpt} {unit}".strip()[:180]
                drafts[-1] = replace(
                    previous,
                    evidence_excerpt=combined_excerpt,
                    clarifying_questions=_clarifying_questions(previous.task_type, combined_excerpt),
                )
                continue
            drafts.append(_general_task(unit))
            continue

        category = _CATEGORY_BY_TYPE[ai_task_type]
        classification_status = (
            "aligned"
            if rule_hint_task_type == ai_task_type
            else "ai_overrode_rule"
            if rule_hint_task_type
            else "needs_review"
        )
        confidence = _confidence(
            text=unit,
            ai_task_type=ai_task_type,
            rule_hint_task_type=rule_hint_task_type,
            rule_hints=rule_hints,
            classification_status=classification_status,
        )
        drafts.append(
            CandidateTaskDraft(
                task_type=ai_task_type,
                title=category["title"],
                summary=category["summary"],
                evidence_excerpt=unit[:180],
                recommended_agents=category["recommended_agents"],
                rule_hint_task_type=rule_hint_task_type,
                ai_task_type=ai_task_type,
                classification_source="rule_assisted_ai",
                classification_status=classification_status,
                confidence=confidence,
                classification_reason=classification_reason,
                approval_required=category.get("approval_required", False),
                rule_hints=rule_hints,
                review_flags=_review_flags(classification_status, confidence),
                clarifying_questions=_clarifying_questions(ai_task_type, unit),
                workflow_plan=build_workflow_plan(task_type=ai_task_type, query=unit),
            )
        )

    return drafts or [_general_task(text)]


def _general_task(text: str) -> CandidateTaskDraft:
    return CandidateTaskDraft(
        task_type="general_agent_task",
        title="일반 에이전트 작업 후보",
        summary="명확한 유형은 없지만 실행 가능한 일반 요청으로 분류했습니다.",
        evidence_excerpt=text[:160],
        recommended_agents=["crata_ceo"],
        rule_hint_task_type=None,
        ai_task_type="general_agent_task",
        classification_source="rule_assisted_ai",
        classification_status="needs_review",
        confidence=0.45,
        classification_reason="정해진 업무 유형과 강하게 일치하지 않아 CEO가 검토할 일반 후보로 남겼습니다.",
        approval_required=False,
        rule_hints=[],
        review_flags=["분류 검토 필요"],
        clarifying_questions=[
            "이 작업의 최종 산출물은 무엇인가요?",
            "반드시 반영해야 할 기준이나 금지할 표현이 있나요?",
            "완료 후 어디에 저장하거나 누구에게 보고해야 하나요?",
        ],
        workflow_plan=build_workflow_plan(task_type="general_agent_task", query=text),
    )


def _semantic_units(text: str) -> list[str]:
    units = [
        unit.strip()
        for unit in re.split(
            r"(?<=[.!?。！？])\s+|\n+|그리고\s+|또한\s+|또\s+|(?<=하고)\s+(?=(?:상담|전사록|사례|유형|관계|부부|부모자녀|직장|공공기관|제안서|기획서|계획서|사업계획서|프로그램|유튜브|홍보|블로그|콘텐츠|홈페이지|결과지|검사))|(?<=하고)\s+(?=[^.!?。！？\n]*유형)",
            text,
        )
        if unit.strip()
    ]
    return units or [text]


def _rule_hint(text: str) -> tuple[str | None, list[str]]:
    for category in _CATEGORIES:
        hints = _matched_keywords(text, category["keywords"])
        if hints:
            return category["task_type"], hints

    return None, []


def _ai_judgment(text: str, rule_hint_task_type: str | None) -> tuple[str | None, str]:
    normalized = text.casefold()

    if _has_content_marketing_intent(normalized):
        if rule_hint_task_type == "report_phrase_revision":
            return (
                "content_marketing",
                "문구 자체를 수정하는 요청이 아니라 결과지 문구 수정 기능을 홍보 콘텐츠로 풀자는 요청으로 판단했습니다.",
            )
        return (
            "content_marketing",
            "홍보, 유튜브, 블로그, 콘텐츠 배포 의도가 중심인 요청으로 판단했습니다.",
        )

    if _has_business_planning_intent(normalized):
        return (
            "business_planning",
            "프로그램, 제안서, 상품화, 연수 설계처럼 사업 기획 산출물이 필요한 요청으로 판단했습니다.",
        )

    if _has_relationship_pattern_intent(normalized):
        return (
            "relationship_pattern_analysis",
            "상담 원문 학습보다 유형 조합, 관계 맥락, 반복 상호작용 패턴 분석이 중심인 요청으로 판단했습니다.",
        )

    if _has_counseling_learning_intent(normalized):
        return (
            "counseling_case_learning",
            "상담 전사록, 사례 저장, 유형 관계 패턴 학습을 다루는 요청으로 판단했습니다.",
        )

    if _has_report_revision_intent(normalized):
        return (
            "report_phrase_revision",
            "결과지 문구나 검사 표현을 실제로 바꾸자는 요청이므로 결과지 문구 수정으로 판단했습니다.",
        )

    return (
        rule_hint_task_type,
        "규칙 힌트와 문맥이 약하게 일치해 우선 후보로 남기고 사람 검토가 필요합니다.",
    )


def _has_content_marketing_intent(text: str) -> bool:
    content_score = _keyword_score(
        text,
        ["홍보", "콘텐츠", "유튜브", "블로그", "홈페이지", "마케팅", "카드뉴스", "sns", "영상", "올리"],
    )
    return content_score >= 2 or "홍보 콘텐츠" in text


def _has_business_planning_intent(text: str) -> bool:
    return _keyword_score(
        text,
        ["제안서", "기획서", "계획서", "사업계획서", "프로그램", "상품", "기획", "공공기관", "기업", "연수", "워크숍", "사업"],
    ) >= 2


def _has_counseling_learning_intent(text: str) -> bool:
    return _keyword_score(text, ["상담", "전사록", "사례", "학습", "유형", "관계", "내담자", "상담자", "갈등", "패턴"]) >= 2


def _has_relationship_pattern_intent(text: str) -> bool:
    relationship_score = _keyword_score(
        text,
        [
            "유형 조합",
            "관계 분석",
            "관계 패턴",
            "상호작용",
            "갈등 루프",
            "반복 패턴",
            "오해 포인트",
            "부부관계",
            "부모자녀",
            "직장관계",
            "대화 패턴",
        ],
    )
    case_learning_score = _keyword_score(text, ["전사록", "사례", "학습", "상담 원문", "축어록"])
    return relationship_score >= 1 and case_learning_score < 2


def _has_report_revision_intent(text: str) -> bool:
    report_score = _keyword_score(text, ["결과지", "문구", "페이지", "수정", "검사 문구", "표현", "상담형", "바꾸", "개선"])
    action_score = _keyword_score(text, ["수정", "바꾸", "개선", "부드럽게", "상담형", "딱딱", "표현"])
    return report_score >= 2 and action_score >= 1


def _confidence(
    *,
    text: str,
    ai_task_type: str,
    rule_hint_task_type: str | None,
    rule_hints: list[str],
    classification_status: str,
) -> float:
    category = _CATEGORY_BY_TYPE[ai_task_type]
    ai_keywords = _matched_keywords(text, category["keywords"])
    score = 0.62 + min(len(ai_keywords), 4) * 0.06 + min(len(rule_hints), 3) * 0.03

    if classification_status == "aligned":
        score += 0.08
    elif classification_status == "ai_overrode_rule":
        score -= 0.04
    elif rule_hint_task_type is None:
        score -= 0.1

    return round(max(0.35, min(score, 0.96)), 2)


def _review_flags(classification_status: str, confidence: float) -> list[str]:
    flags: list[str] = []
    if classification_status == "ai_overrode_rule":
        flags.append("AI가 규칙 힌트를 재분류함")
    if confidence < 0.7:
        flags.append("신뢰도 낮음")
    return flags


def _clarifying_questions(task_type: str, text: str = "") -> list[str]:
    questions_by_type = {
        "report_phrase_revision": [
            "어느 검사와 몇 페이지 또는 어느 문구를 수정하나요?",
            "대상 독자는 성인, 청소년, 아동, 부모, 조직 중 누구인가요?",
            "기존 문구에서 가장 바꾸고 싶은 톤이나 문제 표현은 무엇인가요?",
            "공식 개념상 반드시 유지해야 할 핵심 표현이 있나요?",
        ],
        "counseling_case_learning": [
            "상담 원문에서 개인정보를 제거했나요?",
            "사용자 유형, 상대 유형, 관계 맥락은 무엇인가요?",
            "이번 사례에서 관찰할 핵심 감정과 행동은 무엇인가요?",
            "공식 지식 반영 후보인지, 사례 보관용인지 구분이 필요한가요?",
        ],
        "relationship_pattern_analysis": [
            "분석할 사용자 유형과 상대 유형은 무엇인가요?",
            "관계 맥락은 부부, 연인, 부모자녀, 직장, 친구 중 어디에 가까운가요?",
            "반복해서 나타나는 장면이나 갈등 루프는 무엇인가요?",
            "공식 지식 후보인지, 상담 답변용 참고 패턴인지 구분이 필요한가요?",
        ],
        "business_planning": [
            "대상 기관 또는 고객은 누구인가요?",
            "해결하려는 문제나 개선하고 싶은 장면은 무엇인가요?",
            "이번 제안서의 목적과 기대 성과는 무엇인가요?",
            "예산, 일정, 운영 형태의 제한은 무엇인가요?",
            "CRATA 검사 중 어떤 검사를 어떤 단계에 넣고 싶나요?",
        ],
        "content_marketing": [
            "사용할 채널은 유튜브, 블로그, 홈페이지, SNS 중 무엇인가요?",
            "핵심 타깃은 누구이고 어떤 문제를 느끼고 있나요?",
            "콘텐츠를 본 사람이 다음에 어떤 행동을 하길 원하나요?",
            "반드시 피해야 할 표현이나 과장된 약속이 있나요?",
        ],
    }
    questions = questions_by_type.get(task_type, [])
    if not text:
        return questions

    return [
        question
        for question in questions
        if not _answer_present(task_type, question, text)
    ]


def _answer_present(task_type: str, question: str, text: str) -> bool:
    normalized_text = text.casefold()
    if task_type == "business_planning" and "예산, 일정, 운영 형태" in question:
        has_budget = any(keyword in normalized_text for keyword in ["예산", "만원", "비용"])
        has_schedule = any(keyword in normalized_text for keyword in ["1박", "2일", "일정", "시간", "회기", "주간"])
        return has_budget and has_schedule

    if task_type == "report_phrase_revision":
        if question == "어느 검사와 몇 페이지 또는 어느 문구를 수정하나요?":
            return any(keyword in normalized_text for keyword in ["검사", "페이지", "결과지", "문구"])
        if question == "대상 독자는 성인, 청소년, 아동, 부모, 조직 중 누구인가요?":
            return any(keyword in normalized_text for keyword in ["성인", "청소년", "아동", "부모", "조직", "직원", "관리자"])
        if question == "기존 문구에서 가장 바꾸고 싶은 톤이나 문제 표현은 무엇인가요?":
            return any(keyword in normalized_text for keyword in ["부드럽", "상담형", "딱딱", "부정적", "톤", "표현"])
        return False

    if task_type == "counseling_case_learning":
        if question == "상담 원문에서 개인정보를 제거했나요?":
            return any(keyword in normalized_text for keyword in ["익명", "개인정보", "비식별"])
        if question == "사용자 유형, 상대 유형, 관계 맥락은 무엇인가요?":
            return "유형" in normalized_text and any(keyword in normalized_text for keyword in ["관계", "부부", "연인", "부모", "직장"])
        if question == "이번 사례에서 관찰할 핵심 감정과 행동은 무엇인가요?":
            return any(keyword in normalized_text for keyword in ["불안", "분노", "서운", "압박", "침묵", "회피", "반박", "확인"])
        return False

    if task_type == "relationship_pattern_analysis":
        if question == "분석할 사용자 유형과 상대 유형은 무엇인가요?":
            return "유형" in normalized_text
        if question == "관계 맥락은 부부, 연인, 부모자녀, 직장, 친구 중 어디에 가까운가요?":
            return any(keyword in normalized_text for keyword in ["부부", "연인", "부모자녀", "부모", "자녀", "직장", "친구"])
        if question == "반복해서 나타나는 장면이나 갈등 루프는 무엇인가요?":
            return any(keyword in normalized_text for keyword in ["반복", "루프", "갈등", "침묵", "확인", "회피", "반박", "오해"])
        return False

    if task_type == "business_planning":
        if question == "해결하려는 문제나 개선하고 싶은 장면은 무엇인가요?":
            return any(
                keyword in normalized_text
                for keyword in ["문제", "개선", "불편", "소통 비용", "소통 문제", "갈등", "동기 저하", "의사결정 지연", "관계 갈등"]
            )
        if question == "CRATA 검사 중 어떤 검사를 어떤 단계에 넣고 싶나요?":
            return any(
                keyword in normalized_text
                for keyword in ["개인행동", "집단행동", "색채", "조직행동", "검사 활용", "진단", "해석", "검사 결과"]
            )

    if question == "대상 기관 또는 고객은 누구인가요?":
        return any(
            keyword in normalized_text
            for keyword in [
                "대상",
                "고객",
                "공공기관",
                "기업",
                "관리자",
                "교사",
                "부모",
                "직원",
                "참여자",
            ]
        )
    if question == "예산, 일정, 운영 형태의 제한은 무엇인가요?":
        has_budget = any(keyword in normalized_text for keyword in ["예산", "만원", "원", "비용"])
        has_schedule = any(keyword in normalized_text for keyword in ["1박", "2일", "일정", "시간", "회기", "주간"])
        return has_budget and has_schedule
    if question == "이번 제안서의 목적과 기대 성과는 무엇인가요?":
        return any(keyword in normalized_text for keyword in ["목적", "성과", "기대효과", "목표"])

    if task_type == "content_marketing":
        if question == "사용할 채널은 유튜브, 블로그, 홈페이지, SNS 중 무엇인가요?":
            return any(keyword in normalized_text for keyword in ["유튜브", "블로그", "홈페이지", "sns", "카드뉴스", "영상"])
        if question == "핵심 타깃은 누구이고 어떤 문제를 느끼고 있나요?":
            return any(keyword in normalized_text for keyword in ["타깃", "대상", "고객", "부모", "직원", "관리자", "문제"])
        if question == "콘텐츠를 본 사람이 다음에 어떤 행동을 하길 원하나요?":
            return any(keyword in normalized_text for keyword in ["문의", "신청", "상담", "공유", "구독", "전환"])
        if question == "반드시 피해야 할 표현이나 과장된 약속이 있나요?":
            return any(keyword in normalized_text for keyword in ["금지", "피해야", "과장", "단정", "표현"])

    return False


def _matched_keywords(text: str, keywords: list[str]) -> list[str]:
    normalized_text = text.casefold()
    return [
        keyword
        for keyword in keywords
        if keyword.casefold() in normalized_text
    ]


def _keyword_score(text: str, keywords: list[str]) -> int:
    return sum(1 for keyword in keywords if keyword.casefold() in text)
