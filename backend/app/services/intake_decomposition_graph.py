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
    from app.services.intake_decomposition import decompose_input

    candidate_drafts = decompose_input(raw_content)

    node_trace = [
        GraphNodeTrace(name="preserve_input", status="completed", summary="원문을 보존하고 앞뒤 공백만 정리했습니다."),
        GraphNodeTrace(name="split_semantic_units", status="completed", summary="입력문을 의미 단위로 분리했습니다."),
        GraphNodeTrace(name="collect_rule_hints", status="completed", summary="각 단위에서 규칙 기반 작업 단서를 수집했습니다."),
        GraphNodeTrace(name="judge_with_ai_context", status="completed", summary="규칙 단서와 문맥을 함께 보고 작업 유형을 판단했습니다."),
        GraphNodeTrace(name="build_candidates", status="completed", summary=f"{len(candidate_drafts)}개의 작업 후보로 분리했습니다."),
        GraphNodeTrace(name="prepare_human_review", status="completed", summary="사람 검토 화면에서 확인할 수 있도록 준비했습니다."),
    ]

    return IntakeDecompositionGraphResult(
        graph_name=GRAPH_NAME,
        node_trace=node_trace,
        candidate_drafts=candidate_drafts,
        human_review_required=bool(candidate_drafts),
    )
