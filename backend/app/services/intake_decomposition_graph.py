from dataclasses import asdict, dataclass
from typing import NotRequired, TypedDict

from langgraph.graph import END, START, StateGraph

from app.services.intake_decomposition import (
    _CATEGORY_BY_TYPE,
    CandidateTaskDraft,
    _ai_judgment,
    _confidence,
    _clarifying_questions,
    _general_task,
    _review_flags,
    _rule_hint,
    _semantic_units,
)


GRAPH_NAME = "intake_decomposition_graph"


@dataclass(frozen=True)
class GraphNodeTrace:
    name: str
    status: str
    summary: str

    def to_dict(self) -> dict[str, str]:
        return asdict(self)


@dataclass(frozen=True)
class IntakeDecompositionGraphResult:
    graph_name: str
    node_trace: list[GraphNodeTrace]
    candidate_drafts: list[CandidateTaskDraft]
    human_review_required: bool

    def metadata(self) -> dict:
        return {
            "graph_name": self.graph_name,
            "human_review_required": self.human_review_required,
            "node_trace": [node.to_dict() for node in self.node_trace],
        }


class RuleHint(TypedDict):
    unit: str
    rule_hint_task_type: str | None
    rule_hints: list[str]


class AIJudgment(TypedDict):
    unit: str
    rule_hint_task_type: str | None
    rule_hints: list[str]
    ai_task_type: str | None
    reason: str


class IntakeDecompositionState(TypedDict):
    raw_content: str
    text: NotRequired[str]
    semantic_units: NotRequired[list[str]]
    rule_hint_results: NotRequired[list[RuleHint]]
    ai_judgments: NotRequired[list[AIJudgment]]
    candidate_drafts: NotRequired[list[CandidateTaskDraft]]
    node_trace: NotRequired[list[GraphNodeTrace]]
    human_review_required: NotRequired[bool]


def run_intake_decomposition_graph(raw_content: str) -> IntakeDecompositionGraphResult:
    graph = _build_graph()
    state = graph.invoke({"raw_content": raw_content, "node_trace": []})

    return IntakeDecompositionGraphResult(
        graph_name=GRAPH_NAME,
        node_trace=state["node_trace"],
        candidate_drafts=state["candidate_drafts"],
        human_review_required=state["human_review_required"],
    )


def _build_graph():
    graph = StateGraph(IntakeDecompositionState)
    graph.add_node("preserve_input", _preserve_input)
    graph.add_node("split_semantic_units", _split_semantic_units)
    graph.add_node("collect_rule_hints", _collect_rule_hints)
    graph.add_node("judge_with_ai_context", _judge_with_ai_context)
    graph.add_node("build_candidates", _build_candidates)
    graph.add_node("prepare_human_review", _prepare_human_review)

    graph.add_edge(START, "preserve_input")
    graph.add_edge("preserve_input", "split_semantic_units")
    graph.add_edge("split_semantic_units", "collect_rule_hints")
    graph.add_edge("collect_rule_hints", "judge_with_ai_context")
    graph.add_edge("judge_with_ai_context", "build_candidates")
    graph.add_edge("build_candidates", "prepare_human_review")
    graph.add_edge("prepare_human_review", END)
    return graph.compile()


def _preserve_input(state: IntakeDecompositionState) -> IntakeDecompositionState:
    text = state["raw_content"].strip()
    return {
        "text": text,
        "node_trace": _append_trace(state, "preserve_input", "원문을 보존하고 앞뒤 공백만 정리했습니다."),
    }


def _split_semantic_units(state: IntakeDecompositionState) -> IntakeDecompositionState:
    units = _semantic_units(state["text"])
    return {
        "semantic_units": units,
        "node_trace": _append_trace(state, "split_semantic_units", f"{len(units)}개 의미 단위로 분리했습니다."),
    }


def _collect_rule_hints(state: IntakeDecompositionState) -> IntakeDecompositionState:
    rule_hint_results: list[RuleHint] = []
    for unit in state["semantic_units"]:
        rule_hint_task_type, rule_hints = _rule_hint(unit)
        rule_hint_results.append(
            {
                "unit": unit,
                "rule_hint_task_type": rule_hint_task_type,
                "rule_hints": rule_hints,
            }
        )

    hinted_count = sum(1 for result in rule_hint_results if result["rule_hint_task_type"])
    return {
        "rule_hint_results": rule_hint_results,
        "node_trace": _append_trace(
            state,
            "collect_rule_hints",
            f"{hinted_count}개 단위에서 규칙 기반 힌트를 찾았습니다.",
        ),
    }


def _judge_with_ai_context(state: IntakeDecompositionState) -> IntakeDecompositionState:
    ai_judgments: list[AIJudgment] = []
    for result in state["rule_hint_results"]:
        ai_task_type, reason = _ai_judgment(result["unit"], result["rule_hint_task_type"])
        ai_judgments.append(
            {
                "unit": result["unit"],
                "rule_hint_task_type": result["rule_hint_task_type"],
                "rule_hints": result["rule_hints"],
                "ai_task_type": ai_task_type,
                "reason": reason,
            }
        )

    judged_count = sum(1 for judgment in ai_judgments if judgment["ai_task_type"])
    return {
        "ai_judgments": ai_judgments,
        "node_trace": _append_trace(
            state,
            "judge_with_ai_context",
            f"{judged_count}개 단위를 AI 문맥 판단 후보로 분류했습니다.",
        ),
    }


def _build_candidates(state: IntakeDecompositionState) -> IntakeDecompositionState:
    drafts_by_type: dict[str, CandidateTaskDraft] = {}

    for judgment in state["ai_judgments"]:
        ai_task_type = judgment["ai_task_type"]
        if ai_task_type is None:
            continue

        category = _CATEGORY_BY_TYPE[ai_task_type]
        rule_hint_task_type = judgment["rule_hint_task_type"]
        classification_status = (
            "aligned"
            if rule_hint_task_type == ai_task_type
            else "ai_overrode_rule"
            if rule_hint_task_type
            else "ai_without_rule_hint"
        )
        confidence = _confidence(
            text=judgment["unit"],
            ai_task_type=ai_task_type,
            rule_hint_task_type=rule_hint_task_type,
            rule_hints=judgment["rule_hints"],
            classification_status=classification_status,
        )

        drafts_by_type.setdefault(
            ai_task_type,
            CandidateTaskDraft(
                task_type=ai_task_type,
                title=category["title"],
                summary=category["summary"],
                evidence_excerpt=judgment["unit"][:180],
                recommended_agents=category["recommended_agents"],
                rule_hint_task_type=rule_hint_task_type,
                ai_task_type=ai_task_type,
                classification_source="rule_assisted_ai",
                classification_status=classification_status,
                confidence=confidence,
                classification_reason=judgment["reason"],
                approval_required=category["approval_required"],
                rule_hints=judgment["rule_hints"],
                review_flags=_review_flags(classification_status, confidence),
                clarifying_questions=_clarifying_questions(ai_task_type),
            ),
        )

    candidate_drafts = list(drafts_by_type.values())
    if not candidate_drafts:
        candidate_drafts = [_general_task(state["text"])]

    return {
        "candidate_drafts": candidate_drafts,
        "node_trace": _append_trace(state, "build_candidates", f"{len(candidate_drafts)}개 작업 후보를 만들었습니다."),
    }


def _prepare_human_review(state: IntakeDecompositionState) -> IntakeDecompositionState:
    return {
        "human_review_required": bool(state["candidate_drafts"]),
        "node_trace": _append_trace(
            state,
            "prepare_human_review",
            "사람 검토 화면에서 확인할 수 있도록 후보와 근거를 준비했습니다.",
        ),
    }


def _append_trace(
    state: IntakeDecompositionState,
    name: str,
    summary: str,
) -> list[GraphNodeTrace]:
    return [
        *state.get("node_trace", []),
        GraphNodeTrace(name=name, status="completed", summary=summary),
    ]
