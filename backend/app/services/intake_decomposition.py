import re
from dataclasses import dataclass


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
    drafts_by_type: dict[str, CandidateTaskDraft] = {}

    for unit in _semantic_units(text):
        rule_hint_task_type, rule_hints = _rule_hint(unit)
        ai_task_type, reason = _ai_judgment(unit, rule_hint_task_type)
        if ai_task_type is None:
            continue

        category = _CATEGORY_BY_TYPE[ai_task_type]
        classification_status = (
            "aligned"
            if rule_hint_task_type == ai_task_type
            else "ai_overrode_rule"
            if rule_hint_task_type
            else "ai_without_rule_hint"
        )
        confidence = _confidence(
            text=unit,
            ai_task_type=ai_task_type,
            rule_hint_task_type=rule_hint_task_type,
            rule_hints=rule_hints,
            classification_status=classification_status,
        )

        drafts_by_type.setdefault(
            ai_task_type,
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
                classification_reason=reason,
                approval_required=category["approval_required"],
                rule_hints=rule_hints,
                review_flags=_review_flags(classification_status, confidence),
            ),
        )

    drafts = list(drafts_by_type.values())
    if drafts:
        return drafts

    return [_general_task(text)]


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
    )


def _semantic_units(text: str) -> list[str]:
    units = [
        unit.strip()
        for unit in re.split(
            r"(?<=[.!?。！？])\s+|\n+|그리고\s+|또한\s+|또\s+|(?<=하고)\s+(?=(?:상담|전사록|사례|공공기관|제안서|기획서|계획서|사업계획서|프로그램|유튜브|홍보|블로그|콘텐츠|홈페이지|결과지|검사))",
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


def _matched_keywords(text: str, keywords: list[str]) -> list[str]:
    normalized_text = text.casefold()
    return [
        keyword
        for keyword in keywords
        if keyword.casefold() in normalized_text
    ]


def _keyword_score(text: str, keywords: list[str]) -> int:
    return sum(1 for keyword in keywords if keyword.casefold() in text)
