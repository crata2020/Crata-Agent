import json
import re
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class PlanningContext:
    exam: str | None
    audience: str | None
    output_type: str | None
    topic: str
    constraints: dict[str, Any] = field(default_factory=dict)
    text: str = ""


def build_planning_context(
    *,
    exam: str | None,
    audience: str | None,
    output_type: str | None,
    query: str,
) -> PlanningContext | None:
    if exam != "personal_behavior_motivation":
        return None

    normalized_query = _normalize(query)
    effective_audience = _infer_audience(audience=audience, query=normalized_query)
    topic = _infer_topic(normalized_query)
    constraints = _extract_constraints(normalized_query)

    value_map = _load_json(_repo_root() / "knowledge" / "application_maps" / "personal_behavior_value_map.json")
    audience_context = _audience_registry().get(effective_audience or "", _audience_registry().get("participants", {}))
    topic_rule = _topic_rules().get(topic, _topic_rules()["general"])

    text = _render_context(
        exam=exam,
        audience=effective_audience,
        output_type=output_type,
        topic=topic,
        value_map=value_map,
        audience_context=audience_context,
        topic_rule=topic_rule,
        constraints=constraints,
    )

    return PlanningContext(
        exam=exam,
        audience=effective_audience,
        output_type=output_type,
        topic=topic,
        constraints=constraints,
        text=text,
    )


def _render_context(
    *,
    exam: str,
    audience: str | None,
    output_type: str | None,
    topic: str,
    value_map: dict[str, Any],
    audience_context: dict[str, Any],
    topic_rule: dict[str, Any],
    constraints: dict[str, Any],
) -> str:
    blocks = [
        "# 기획 변환 컨텍스트",
        "",
        "이 블록은 상황별 지도를 무한히 만들기 위한 것이 아니라, 검사 핵심 메리트와 대상/주제 맥락을 조합해 기획안을 만들기 위한 내부 작성 기준입니다.",
        "",
        "## 검사 핵심 메리트",
        "",
        f"application_map: {value_map.get('id', 'personal_behavior_value_map')}",
        f"exam: {exam}",
        f"output_type: {output_type or '미정'}",
        "",
        "개인행동 동기검사는 단순 성향/강점 검사가 아니라, 행동의 시작 조건과 행동 지속 조건을 함께 보는 검사입니다.",
        "동기위치 = 행동 시작 조건",
        "동기성향 = 행동 지속 조건",
        "고유/현재 = 본래 자연스럽게 오래 가는 방식과 현재 환경에서 실제로 사용하는 방식의 연결 또는 차이",
        "",
    ]

    for value in value_map.get("value_propositions", []):
        blocks.extend(
            [
                f"- {value.get('title', '')}",
                f"  - based_on: {value.get('based_on', '')}",
                f"  - planning_use: {value.get('program_use', '')}",
                f"  - module: {value.get('module', '')}",
            ]
        )

    blocks.extend(
        [
            "",
            "## 대상 맥락",
            "",
            f"audience: {audience or '미정'}",
            f"name: {audience_context.get('name', '참여자')}",
            f"default_focus: {audience_context.get('default_focus', '')}",
            f"language_level: {audience_context.get('language_level', '')}",
            "common_contexts:",
        ]
    )
    blocks.extend(f"- {context}" for context in audience_context.get("common_contexts", []))

    blocks.extend(
        [
            "",
            "## 주제 변환",
            "",
            f"topic: {topic}",
            f"name: {topic_rule.get('name', '')}",
            f"start_action: {topic_rule.get('start_action', '')}",
            f"sustain_action: {topic_rule.get('sustain_action', '')}",
            "program_focus:",
        ]
    )
    blocks.extend(f"- {focus}" for focus in topic_rule.get("program_focus", []))

    blocks.extend(["", "## 운영 조건", ""])
    if constraints.get("duration_minutes"):
        minutes = constraints["duration_minutes"]
        blocks.append(f"- 시간 조건: {minutes}분")
    else:
        blocks.append("- 시간 조건: 사용자 요청에 명시된 범위가 있으면 세부 활동 총합을 맞춘다.")

    if constraints.get("budget_requested"):
        blocks.append("- 예산안: 요청됨. 검사비, 강사비, 자료 제작비, 운영비를 분리해 제안한다.")
    else:
        blocks.append("- 예산안: 요청된 경우에만 별도 섹션으로 제안한다.")

    blocks.extend(
        [
            "",
            "## 작성 지시",
            "",
            "- 검사 특징을 그대로 소개하지 말고 대상과 주제에 맞는 활동 구조로 변환한다.",
            "- 개인행동 동기검사의 차별점은 행동 시작 조건, 행동 지속 조건, 고유/현재 비교에서 나온다.",
            "- 기획안의 세부 활동과 기대효과는 동기위치, 동기성향, 고유/현재 중 최소 두 가지와 연결한다.",
        ]
    )
    if topic == "career":
        blocks.append("- 주제가 진로이므로 직업명 추천보다 진로 탐색 행동을 시작하고 지속하는 전략을 설계한다.")
    elif topic == "study":
        blocks.append("- 주제가 학업이므로 공부 시작과 학습 루틴 유지로 변환한다.")
    elif topic == "self_understanding":
        blocks.append("- 주제가 자기이해이므로 현재 생활과 본래 동기 구조의 연결을 다룬다.")

    return "\n".join(block for block in blocks if block is not None).strip()


def _infer_audience(*, audience: str | None, query: str) -> str | None:
    if any(marker in query for marker in ("고등학생", "고등학교", "고교")):
        return "high_school_students"
    if any(marker in query for marker in ("중학생", "중학교")):
        return "middle_school_students"
    if any(marker in query for marker in ("대학생", "대학교", "전공")):
        return "university_students"
    if any(marker in query for marker in ("성인", "개인", "일반인")):
        return "adults"
    if any(marker in query for marker in ("직장인", "직원", "구성원")):
        return "employees"
    if any(marker in query for marker in ("기업", "회사")):
        return "company"
    if any(marker in query for marker in ("학교", "학생", "청소년")):
        return "school_students"
    return audience


def _infer_topic(query: str) -> str:
    for topic_id, rule in _topic_rules().items():
        if topic_id == "general":
            continue
        markers = [str(marker) for marker in rule.get("markers", [])]
        if any(_normalize(marker) in query for marker in markers):
            return topic_id
    return "general"


def _extract_constraints(query: str) -> dict[str, Any]:
    constraints: dict[str, Any] = {
        "duration_minutes": None,
        "budget_requested": any(marker in query for marker in ("예산", "비용", "견적", "제안가", "금액")),
    }

    hour_match = re.search(r"(\d+)\s*시간", query)
    minute_match = re.search(r"(\d+)\s*분", query)
    if hour_match:
        constraints["duration_minutes"] = int(hour_match.group(1)) * 60
    elif minute_match:
        constraints["duration_minutes"] = int(minute_match.group(1))

    return constraints


@lru_cache(maxsize=1)
def _audience_registry() -> dict[str, dict[str, Any]]:
    return _load_json(_repo_root() / "backend" / "app" / "config" / "audience_context_registry.json")


@lru_cache(maxsize=1)
def _topic_rules() -> dict[str, dict[str, Any]]:
    return _load_json(_repo_root() / "backend" / "app" / "config" / "topic_transform_rules.json")


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _normalize(text: str) -> str:
    return " ".join(str(text).casefold().split())


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]
