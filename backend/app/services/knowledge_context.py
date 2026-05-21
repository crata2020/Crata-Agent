from dataclasses import dataclass, field
from typing import Sequence

from app.services.application_maps import ApplicationMap, load_application_map
from app.services.evidence_retriever import EvidenceChunk, retrieve_evidence
from app.services.exam_knowledge_router import (
    select_official_references,
)
from app.services.knowledge_scope_planner import KnowledgeScopePlan, plan_knowledge_scope
from app.services.planning_context_builder import PlanningContext, build_planning_context
from app.services.task_playbooks import TaskPlaybook, load_task_playbook

AGENT_GUIDE_REFERENCE = "knowledge/agent-guides/agent-operating-guides.md"

SPECIALIST_TASK_TYPES = {
    "business_planning",
    "planning",
    "content_marketing",
    "content_strategy",
    "report_phrase_revision",
    "counseling_case_learning",
    "case_learning",
    "relationship_pattern_analysis",
    "knowledge_update_review",
}
SPECIALIST_AGENTS = {
    "business_designer",
    "content_strategist",
    "report_editor",
    "counseling_coach",
    "case_learning_agent",
    "relationship_analyst",
    "quality_inspector",
}
AGENT_GUIDE_QUERY_MARKERS = (
    "에이전트",
    "작업 절차",
    "전문 프로세스",
    "검수",
    "승인",
    "승인대기함",
    "결과지 문구",
    "상담 사례",
    "사업 기획",
    "콘텐츠",
)


@dataclass(frozen=True)
class KnowledgeContext:
    text: str
    references: list[str]
    evidence_keys: list[str] = field(default_factory=list)
    evidence_bundle: list[EvidenceChunk] = field(default_factory=list)
    workflow_plan: dict = field(default_factory=dict)
    playbook: TaskPlaybook | None = None
    application_map: ApplicationMap | None = None
    planning_context: PlanningContext | None = None
    needs_clarification: bool = False
    clarifying_questions: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def load_task_knowledge_context(
    *,
    task_type: str,
    assigned_agents: Sequence[str],
    query: str = "",
) -> KnowledgeContext:
    assigned_agent_list = [agent for agent in assigned_agents if agent]
    knowledge_scope = plan_knowledge_scope(task_type=task_type, query=query)
    workflow_plan = dict(knowledge_scope.workflow_plan)
    playbook = load_task_playbook(workflow_plan.get("playbook"))
    application_map = load_application_map(
        exam=knowledge_scope.exam,
        output_type=knowledge_scope.output_type,
    )
    planning_context = None
    if knowledge_scope.task_type == "planning":
        planning_context = build_planning_context(
            exam=knowledge_scope.exam,
            audience=knowledge_scope.audience,
            output_type=knowledge_scope.output_type,
            query=query,
        )
        workflow_plan["exam"] = knowledge_scope.exam
        workflow_plan["output_type"] = knowledge_scope.output_type
        workflow_plan["audience"] = planning_context.audience if planning_context else knowledge_scope.audience
        if planning_context:
            workflow_plan["planning_topic"] = planning_context.topic
            workflow_plan["planning_constraints"] = planning_context.constraints
    official_references = _select_official_references(
        task_type=task_type,
        assigned_agents=assigned_agent_list,
        query=query,
        knowledge_scope=knowledge_scope,
    )
    references = list(official_references)
    if _should_include_agent_guide(
        task_type=task_type,
        assigned_agents=assigned_agent_list,
        query=query,
    ):
        references.append(AGENT_GUIDE_REFERENCE)

    references = _dedupe(references)
    evidence_bundle = retrieve_evidence(knowledge_scope.evidence_keys)
    needs_clarification = knowledge_scope.needs_clarification and not evidence_bundle
    if not references and not evidence_bundle:
        needs_clarification = True

    clarifying_questions = knowledge_scope.clarifying_questions
    if needs_clarification and not clarifying_questions:
        clarifying_questions = ["어떤 검사나 유형 기준으로 볼지 조금 더 구체적으로 알려주세요."]

    warnings: list[str] = []
    if not references:
        warnings.append("명확히 연결된 공식 지식 파일이 없어 전체 MASTER를 넣지 않았습니다.")

    return KnowledgeContext(
        text=_build_context_text(
            task_type=task_type,
            assigned_agents=assigned_agent_list,
            knowledge_scope=knowledge_scope,
            workflow_plan=workflow_plan,
            playbook=playbook,
            application_map=application_map,
            planning_context=planning_context,
            references=references,
            evidence_bundle=evidence_bundle,
            needs_clarification=needs_clarification,
            clarifying_questions=clarifying_questions,
            warnings=warnings,
        ),
        references=references,
        evidence_keys=[chunk.key for chunk in evidence_bundle],
        evidence_bundle=evidence_bundle,
        workflow_plan=workflow_plan,
        playbook=playbook,
        application_map=application_map,
        planning_context=planning_context,
        needs_clarification=needs_clarification,
        clarifying_questions=clarifying_questions,
        warnings=warnings,
    )


def _select_official_references(
    *,
    task_type: str,
    assigned_agents: Sequence[str],
    query: str,
    knowledge_scope: KnowledgeScopePlan,
) -> list[str]:
    references = select_official_references(
        task_type=task_type,
        assigned_agents=assigned_agents,
        query=query,
    )
    if knowledge_scope.reference:
        references.append(knowledge_scope.reference)
    return _dedupe(references)


def _should_include_agent_guide(
    *,
    task_type: str,
    assigned_agents: Sequence[str],
    query: str,
) -> bool:
    normalized_query = _normalize(query)
    return (
        task_type in SPECIALIST_TASK_TYPES
        or any(agent in SPECIALIST_AGENTS for agent in assigned_agents)
        or any(_normalize(marker) in normalized_query for marker in AGENT_GUIDE_QUERY_MARKERS)
    )


def _build_context_text(
    *,
    task_type: str,
    assigned_agents: list[str],
    knowledge_scope: KnowledgeScopePlan,
    workflow_plan: dict,
    playbook: TaskPlaybook | None,
    application_map: ApplicationMap | None,
    planning_context: PlanningContext | None,
    references: list[str],
    evidence_bundle: list[EvidenceChunk],
    needs_clarification: bool,
    clarifying_questions: list[str],
    warnings: list[str],
) -> str:
    blocks = [
        "# CRATA 지식 컨텍스트",
        "",
        "요청과 직접 연결된 공식 지식의 reference와 필요한 evidence 조각만 제공합니다. MASTER 전문은 포함하지 않습니다.",
        f"작업 유형: {task_type}",
        f"배정 에이전트: {', '.join(assigned_agents) if assigned_agents else '미정'}",
        f"지식 범위: {', '.join(knowledge_scope.scope) if knowledge_scope.scope else '미정'}",
        "",
    ]

    action_policy = workflow_plan.get("action_policy", {})
    if workflow_plan:
        blocks.extend(
            [
                "# 워크플로우 계획",
                "",
                f"canonical_task_type: {workflow_plan.get('task_type') or '미정'}",
                f"output_type: {workflow_plan.get('output_type') or '미정'}",
                f"audience: {workflow_plan.get('audience') or '미정'}",
                f"primary_agent: {workflow_plan.get('primary_agent') or '미정'}",
                f"knowledge_gate: {workflow_plan.get('gates', {}).get('knowledge') or '없음'}",
                f"quality_gate: {workflow_plan.get('gates', {}).get('quality') or '없음'}",
                f"approval_required: {bool(workflow_plan.get('approval_required'))}",
                f"action_policy: {action_policy.get('default') or 'respond_only'}",
                "",
            ]
        )

    if playbook:
        blocks.extend(["# 작업 플레이북", "", f"playbook: {playbook.name}", ""])
        if playbook.default_sections:
            blocks.extend(["## 출력 섹션", ""])
            blocks.extend(f"- {section}" for section in playbook.default_sections)
            blocks.append("")
        if playbook.required_inputs:
            blocks.extend(["## 필요 입력", ""])
            blocks.extend(f"- {required_input}" for required_input in playbook.required_inputs)
            blocks.append("")
        if playbook.operations:
            blocks.extend(["## 작업 연산", ""])
            blocks.extend(f"- {operation}" for operation in playbook.operations)
            blocks.append("")
        if playbook.rules:
            blocks.extend(["## 작성 규칙", ""])
            blocks.extend(f"- {rule}" for rule in playbook.rules)
            blocks.append("")

    if application_map:
        blocks.extend(["# 적용 지도", "", f"application_map: {application_map.name}", ""])
        blocks.extend(
            [
                f"exam: {application_map.exam}",
                f"application: {application_map.application}",
                f"audience: {application_map.audience or '미정'}",
                "",
                "## 전환 포인트",
                "",
            ]
        )
        for value in application_map.value_propositions:
            blocks.extend(
                [
                    f"- {value.title}",
                    f"  - based_on: {value.based_on}",
                    f"  - program_use: {value.program_use}",
                    f"  - module: {value.module}",
                ]
            )
        blocks.append("")
        if application_map.rules:
            blocks.extend(["## 적용 규칙", ""])
            blocks.extend(f"- {rule}" for rule in application_map.rules)
            blocks.append("")

    if planning_context:
        blocks.extend([planning_context.text, ""])

    if references:
        blocks.extend(["# 선택된 공식 지식", ""])
        for reference in references:
            blocks.extend([f"## 참조 파일: {reference}", ""])

    if evidence_bundle:
        blocks.extend(["# 공식 근거 조각", ""])
        for chunk in evidence_bundle:
            blocks.extend(
                [
                    f"## evidence: {chunk.key}",
                    f"source: {chunk.source}",
                    f"heading: {chunk.heading}",
                    chunk.text,
                    "",
                ]
            )

    if needs_clarification:
        blocks.extend(["# 먼저 확인할 질문", ""])
        blocks.extend(f"- {question}" for question in clarifying_questions)
        blocks.append("")

    if warnings:
        blocks.extend(["# 내부 경고", ""])
        blocks.extend(f"- {warning}" for warning in warnings)

    return "\n".join(blocks).strip()


def _normalize(text: str) -> str:
    return " ".join(text.casefold().split())


def _dedupe(values: Sequence[str]) -> list[str]:
    deduped: list[str] = []
    for value in values:
        if value and value not in deduped:
            deduped.append(value)
    return deduped
