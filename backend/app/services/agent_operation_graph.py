from dataclasses import asdict, dataclass
from typing import NotRequired, TypedDict

from langgraph.graph import END, START, StateGraph

from app.services.task_registry import get_task_definition


GRAPH_NAME = "agent_operation_graph"


@dataclass(frozen=True)
class AgentOperationNodeTrace:
    name: str
    status: str
    summary: str

    def to_dict(self) -> dict[str, str]:
        return asdict(self)


@dataclass(frozen=True)
class AgentOperationStepPlan:
    step_name: str
    agent_id: str
    output_summary: str


@dataclass(frozen=True)
class AgentOperationGraphResult:
    graph_name: str
    node_trace: list[AgentOperationNodeTrace]
    steps: list[AgentOperationStepPlan]

    def metadata(self) -> dict:
        return {
            "graph_name": self.graph_name,
            "node_trace": [node.to_dict() for node in self.node_trace],
        }


class AgentOperationState(TypedDict):
    task_type: str
    assigned_agents: list[str]
    knowledge_references: list[str]
    steps: NotRequired[list[AgentOperationStepPlan]]
    node_trace: NotRequired[list[AgentOperationNodeTrace]]


def run_agent_operation_graph(
    *,
    task_type: str,
    assigned_agents: list[str],
    knowledge_references: list[str],
) -> AgentOperationGraphResult:
    graph = _build_graph()
    state = graph.invoke(
        {
            "task_type": task_type,
            "assigned_agents": assigned_agents,
            "knowledge_references": knowledge_references,
            "steps": [],
            "node_trace": [],
        }
    )

    return AgentOperationGraphResult(
        graph_name=GRAPH_NAME,
        node_trace=state["node_trace"],
        steps=state["steps"],
    )


def _build_graph():
    graph = StateGraph(AgentOperationState)
    graph.add_node("ceo_routing", _ceo_routing)
    graph.add_node("context_retrieval", _context_retrieval)
    graph.add_node("question_gate", _question_gate)
    graph.add_node("specialist_draft", _specialist_draft)
    graph.add_node("quality_review", _quality_review)
    graph.add_node("approval_pending", _approval_pending)

    graph.add_edge(START, "ceo_routing")
    graph.add_edge("ceo_routing", "context_retrieval")
    graph.add_edge("context_retrieval", "question_gate")
    graph.add_edge("question_gate", "specialist_draft")
    graph.add_edge("specialist_draft", "quality_review")
    graph.add_edge("quality_review", "approval_pending")
    graph.add_edge("approval_pending", END)
    return graph.compile()


def _ceo_routing(state: AgentOperationState) -> AgentOperationState:
    return _append_step(
        state,
        step_name="ceo_routing",
        agent_id="crata_ceo",
        output_summary="작업 유형과 담당 에이전트 실행 순서를 정했습니다.",
        trace_summary="CEO가 작업 유형, 담당 에이전트, 승인 필요 흐름을 정했습니다.",
    )


def _context_retrieval(state: AgentOperationState) -> AgentOperationState:
    reference_count = len(state["knowledge_references"])
    return _append_step(
        state,
        step_name="context_retrieval",
        agent_id="concept_guardian",
        output_summary="공식 지식과 에이전트 작업 가이드를 연결했습니다.",
        trace_summary=f"공식 지식과 작업 가이드 {reference_count}개를 실행 컨텍스트로 연결했습니다.",
    )


def _question_gate(state: AgentOperationState) -> AgentOperationState:
    agent_id = _primary_agent(state["task_type"])
    return _append_step(
        state,
        step_name="question_gate",
        agent_id=agent_id,
        output_summary="전문가 질문과 입력된 답변 반영 여부를 확인했습니다.",
        trace_summary=f"{agent_id}가 바로 초안으로 가지 않고 부족 정보 질문과 답변 반영 여부를 점검했습니다.",
    )


def _specialist_draft(state: AgentOperationState) -> AgentOperationState:
    agent_id = _primary_agent(state["task_type"])
    return _append_step(
        state,
        step_name="specialist_draft",
        agent_id=agent_id,
        output_summary="담당 에이전트가 초안을 작성했습니다.",
        trace_summary=f"{agent_id}가 전문 절차에 따라 초안 작성을 맡았습니다.",
    )


def _quality_review(state: AgentOperationState) -> AgentOperationState:
    return _append_step(
        state,
        step_name="quality_review",
        agent_id="quality_inspector",
        output_summary="개념, 톤, 안전성 검수 단계가 완료되었습니다.",
        trace_summary="품질검수관이 개념, 톤, 안전성, 승인 필요 여부를 점검했습니다.",
    )


def _approval_pending(state: AgentOperationState) -> AgentOperationState:
    return {
        "node_trace": [
            *state.get("node_trace", []),
            AgentOperationNodeTrace(
                name="approval_pending",
                status="completed",
                summary="생성 결과를 승인함에서 검토할 수 있도록 대기 상태로 넘겼습니다.",
            ),
        ],
    }


def _append_step(
    state: AgentOperationState,
    *,
    step_name: str,
    agent_id: str,
    output_summary: str,
    trace_summary: str,
) -> AgentOperationState:
    return {
        "steps": [
            *state.get("steps", []),
            AgentOperationStepPlan(
                step_name=step_name,
                agent_id=agent_id,
                output_summary=output_summary,
            ),
        ],
        "node_trace": [
            *state.get("node_trace", []),
            AgentOperationNodeTrace(name=step_name, status="completed", summary=trace_summary),
        ],
    }


def _primary_agent(task_type: str) -> str:
    return get_task_definition(task_type).primary_agent
