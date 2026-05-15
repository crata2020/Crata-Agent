from dataclasses import dataclass


@dataclass(frozen=True)
class CandidateTaskDraft:
    task_type: str
    title: str
    summary: str
    evidence_excerpt: str
    recommended_agents: list[str]


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
    },
    {
        "task_type": "business_planning",
        "keywords": [
            "제안서",
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
    },
]


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
    drafts: list[CandidateTaskDraft] = []

    for category in _CATEGORIES:
        keywords = category["keywords"]
        if _has_keyword(text, keywords):
            drafts.append(
                CandidateTaskDraft(
                    task_type=category["task_type"],
                    title=category["title"],
                    summary=category["summary"],
                    evidence_excerpt=_excerpt(text, keywords),
                    recommended_agents=category["recommended_agents"],
                )
            )

    if drafts:
        return drafts

    return [
        CandidateTaskDraft(
            task_type="general_agent_task",
            title="일반 에이전트 작업 후보",
            summary="명확한 유형은 없지만 실행 가능한 일반 요청으로 분류했습니다.",
            evidence_excerpt=text[:160],
            recommended_agents=["crata_ceo"],
        )
    ]


def _has_keyword(text: str, keywords: list[str]) -> bool:
    normalized_text = text.casefold()
    return any(keyword.casefold() in normalized_text for keyword in keywords)


def _keyword_score(text: str, keywords: list[str]) -> int:
    return sum(1 for keyword in keywords if keyword.casefold() in text)


def _excerpt(text: str, keywords: list[str]) -> str:
    normalized_text = text.casefold()
    matches = [
        normalized_text.find(keyword.casefold())
        for keyword in keywords
        if keyword.casefold() in normalized_text
    ]

    if not matches:
        return text[:160]

    first_match = min(matches)
    start = max(0, first_match - 60)
    end = min(len(text), start + 160)
    return text[start:end].strip()
