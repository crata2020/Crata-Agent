from dataclasses import dataclass
from typing import Sequence


PERSONAL_MASTER_REFERENCE = "knowledge/official/personal-behavior-motivation/MASTER.md"
GROUP_MASTER_REFERENCE = "knowledge/official/group-behavior/MASTER.md"
ORGANIZATION_MASTER_REFERENCE = "knowledge/official/organizational-behavior/MASTER.md"


@dataclass(frozen=True)
class RoutingDimension:
    label: str
    markers: tuple[str, ...]


@dataclass(frozen=True)
class KnowledgeReference:
    reference: str
    explicit_terms: tuple[str, ...]
    dimensions: tuple[RoutingDimension, ...]
    minimum_dimension_hits: int = 2


OFFICIAL_MASTERS = (
    KnowledgeReference(
        reference=PERSONAL_MASTER_REFERENCE,
        explicit_terms=(
            "개인행동 동기검사",
            "개인행동",
            "개인 행동",
            "행동동기",
            "동기검사",
            "동기 검사",
            "동기위치",
            "동기 위치",
            "동기성향",
            "동기 성향",
            "내적자극형",
            "외적자극형",
            "성장형",
            "발산형",
            "균형형",
            "수확형",
            "축적형",
            "고유 동기",
            "현재 동기",
        ),
        dimensions=(
            RoutingDimension(
                label="행동 시작",
                markers=(
                    "행동의 시동점",
                    "행동 시작",
                    "어디서 시작",
                    "시작",
                    "착수",
                    "움직이",
                    "몸이 안 움직",
                ),
            ),
            RoutingDimension(
                label="행동 지속",
                markers=(
                    "오래",
                    "지속",
                    "유지",
                    "계속",
                    "끝까지",
                    "꾸준",
                    "이어가",
                ),
            ),
            RoutingDimension(
                label="개인 동기 조건",
                markers=(
                    "동기",
                    "하고 싶은",
                    "해야 하는",
                    "에너지",
                    "끌리",
                    "미루",
                    "루틴",
                    "습관",
                ),
            ),
        ),
    ),
    KnowledgeReference(
        reference=GROUP_MASTER_REFERENCE,
        explicit_terms=(
            "집단검사",
            "집단 검사",
            "집단행동검사",
            "집단 행동 검사",
            "집단행동",
            "집단 행동",
            "의사결정방식",
            "의사 결정 방식",
            "혼자형",
            "그룹형",
            "자기효능감",
            "자기 효능감",
            "경쟁형",
            "비교형",
        ),
        dimensions=(
            RoutingDimension(
                label="집단 상황",
                markers=("집단", "팀", "동료", "회의", "조직 안", "함께", "관계 속"),
            ),
            RoutingDimension(
                label="상호작용과 조율",
                markers=("의사결정", "결정", "합의", "소통", "조율", "의견", "상호작용"),
            ),
            RoutingDimension(
                label="관계 속 자기확신",
                markers=("자기확신", "자기 효능감", "비교", "경쟁", "눈치", "의견을 못"),
            ),
        ),
    ),
    KnowledgeReference(
        reference=ORGANIZATION_MASTER_REFERENCE,
        explicit_terms=(
            "조직검사",
            "조직 검사",
            "조직행동검사",
            "조직 행동 검사",
            "행동방식검사",
            "행동 방식 검사",
            "행동방식",
            "행동 방식",
            "중심역량",
            "중심 역량",
            "핵심역량",
            "핵심 역량",
            "성장역량",
            "성장 역량",
            "잠재역량",
            "잠재 역량",
            "문제해결 방식",
            "문제 해결 방식",
            "과제수행",
            "과제 수행",
            "과제형",
            "관계형",
            "직관형",
            "경험형",
            "설계형",
            "기술형",
            "전술형",
            "전략형",
            "16유형",
            "16 유형",
            "조직구조방식",
            "조직 구조 방식",
            "P-O Fit",
            "P-J Fit",
            "P-G Fit",
        ),
        dimensions=(
            RoutingDimension(
                label="조직과 역할",
                markers=("조직", "역할", "직무", "업무", "팀 구조", "조직 구조", "회사"),
            ),
            RoutingDimension(
                label="역량과 수행",
                markers=("역량", "수행", "과제", "문제해결", "정보처리", "목적성취"),
            ),
            RoutingDimension(
                label="적합도",
                markers=("fit", "적합", "배치", "채용", "직무 적합", "조직 적합"),
            ),
        ),
    ),
)
OFFICIAL_MASTER_REFERENCES = [master.reference for master in OFFICIAL_MASTERS]

KOREAN_EXPLICIT_TERMS = {
    PERSONAL_MASTER_REFERENCE: (
        "개인행동 동기검사",
        "개인행동검사",
        "개인행동",
        "동기검사",
        "동기위치",
        "동기성향",
        "내적자극형",
        "외적자극형",
        "성장형",
        "발산형",
        "균형형",
        "수확형",
        "축적형",
    ),
    GROUP_MASTER_REFERENCE: (
        "집단행동검사",
        "집단검사",
        "집단행동",
        "의사결정방식",
        "혼자형",
        "그룹형",
        "자기효능감",
        "경쟁형",
        "비교형",
        "양쪽 말을",
        "반대편 말",
        "대화하면서 생각",
    ),
    ORGANIZATION_MASTER_REFERENCE: (
        "조직검사",
        "조직행동검사",
        "조직행동",
        "행동방식검사",
        "문제해결 방식",
        "설계형",
        "기술형",
        "조직구조",
        "P-O Fit",
        "P-J Fit",
        "P-G Fit",
    ),
}


def select_official_references(
    *,
    task_type: str,
    assigned_agents: Sequence[str],
    query: str,
) -> list[str]:
    selection_text = _selection_text(
        task_type=task_type,
        assigned_agents=assigned_agents,
        query=query,
    )
    scored_references = [
        (master.reference, _score_reference(master=master, selection_text=selection_text))
        for master in OFFICIAL_MASTERS
    ]
    return [reference for reference, score in scored_references if score > 0]


def infer_primary_official_reference(query: str) -> str | None:
    scored_references = [
        (master.reference, _score_reference(master=master, selection_text=query))
        for master in OFFICIAL_MASTERS
    ]
    selected = [(reference, score) for reference, score in scored_references if score > 0]
    if len(selected) != 1:
        return None
    return selected[0][0]


def _score_reference(*, master: KnowledgeReference, selection_text: str) -> int:
    normalized_text = _normalize(selection_text)
    compact_text = normalized_text.replace(" ", "")
    explicit_score = _explicit_score(master=master, normalized_text=normalized_text, compact_text=compact_text)
    explicit_score += _explicit_score_for_terms(
        terms=KOREAN_EXPLICIT_TERMS.get(master.reference, ()),
        normalized_text=normalized_text,
        compact_text=compact_text,
    )
    if explicit_score:
        return 100 + explicit_score

    dimension_hits = 0
    dimension_score = 0
    for dimension in master.dimensions:
        matched_markers = _matched_markers(
            markers=dimension.markers,
            normalized_text=normalized_text,
            compact_text=compact_text,
        )
        if matched_markers:
            dimension_hits += 1
            dimension_score += min(sum(len(marker.replace(" ", "")) for marker in matched_markers), 12)

    if dimension_hits < master.minimum_dimension_hits:
        return 0
    return dimension_score


def _explicit_score(*, master: KnowledgeReference, normalized_text: str, compact_text: str) -> int:
    return _explicit_score_for_terms(
        terms=master.explicit_terms,
        normalized_text=normalized_text,
        compact_text=compact_text,
    )


def _explicit_score_for_terms(
    *,
    terms: Sequence[str],
    normalized_text: str,
    compact_text: str,
) -> int:
    return sum(
        max(1, min(len(marker.replace(" ", "")), 12))
        for marker in _matched_markers(
            markers=terms,
            normalized_text=normalized_text,
            compact_text=compact_text,
        )
    )


def _matched_markers(*, markers: Sequence[str], normalized_text: str, compact_text: str) -> list[str]:
    matched = []
    for marker in markers:
        normalized_marker = _normalize(marker)
        if not normalized_marker:
            continue

        compact_marker = normalized_marker.replace(" ", "")
        if normalized_marker in normalized_text or compact_marker in compact_text:
            matched.append(normalized_marker)
    return matched


def _selection_text(*, task_type: str, assigned_agents: Sequence[str], query: str) -> str:
    return "\n".join(
        [
            task_type,
            " ".join(assigned_agents),
            query,
        ]
    )


def _normalize(text: str) -> str:
    return " ".join(text.casefold().split())
