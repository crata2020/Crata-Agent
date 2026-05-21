from dataclasses import dataclass
from typing import Any

from app.services.concept_router import classify_concept
from app.services.exam_knowledge_router import (
    GROUP_MASTER_REFERENCE,
    ORGANIZATION_MASTER_REFERENCE,
    PERSONAL_MASTER_REFERENCE,
    infer_primary_official_reference,
)
from app.services.task_registry import build_workflow_plan


REFERENCE_TO_EXAM = {
    GROUP_MASTER_REFERENCE: "group_behavior",
    PERSONAL_MASTER_REFERENCE: "personal_behavior_motivation",
    ORGANIZATION_MASTER_REFERENCE: "organizational_behavior",
}

GROUP_BEHAVIOR_SCOPE_EVIDENCE = {
    "exam_definition": ["group_behavior.definition"],
    "exam_purpose": ["group_behavior.short_definition"],
    "axes_summary": [
        "group_behavior.solo_vs_group.difference",
        "group_behavior.competitive_vs_comparison.difference",
    ],
    "strengths": [
        "group_behavior.short_definition",
        "group_behavior.cautions.not_execution_power",
    ],
    "application_points": [
        "group_behavior.short_definition",
        "group_behavior.cautions.not_execution_power",
    ],
    "cautions": [
        "group_behavior.cautions.not_execution_power",
        "group_behavior.solo_vs_group.difference",
        "group_behavior.competitive_vs_comparison.difference",
    ],
    "official_definition": ["group_behavior.definition"],
    "type_description": [],
    "forbidden_interpretations": [
        "group_behavior.cautions.not_execution_power",
        "group_behavior.solo_vs_group.difference",
        "group_behavior.competitive_vs_comparison.difference",
    ],
    "current_definition": ["group_behavior.definition"],
    "related_evidence": ["group_behavior.short_definition"],
    "conflict_check": [
        "group_behavior.cautions.not_execution_power",
        "group_behavior.solo_vs_group.difference",
        "group_behavior.competitive_vs_comparison.difference",
    ],
    "definition": ["group_behavior.definition"],
    "difference": [
        "group_behavior.solo_vs_group.difference",
        "group_behavior.competitive_vs_comparison.difference",
    ],
    "signals": [],
    "confused_with": [],
    "clarifying_questions": [],
    "type_candidates": [],
}

PERSONAL_BEHAVIOR_SCOPE_EVIDENCE = {
    "exam_definition": ["personal_behavior_motivation.definition"],
    "exam_purpose": [
        "personal_behavior_motivation.motivation_position.definition",
        "personal_behavior_motivation.motivation_tendency.definition",
    ],
    "axes_summary": [
        "personal_behavior_motivation.motivation_position.definition",
        "personal_behavior_motivation.motivation_tendency.definition",
        "personal_behavior_motivation.genuine_current.definition",
    ],
    "strengths": [
        "personal_behavior_motivation.motivation_position.definition",
        "personal_behavior_motivation.motivation_tendency.definition",
        "personal_behavior_motivation.genuine_current.definition",
    ],
    "application_points": [
        "personal_behavior_motivation.motivation_position.definition",
        "personal_behavior_motivation.motivation_tendency.definition",
        "personal_behavior_motivation.genuine_current.definition",
        "personal_behavior_motivation.position.internal.definition",
        "personal_behavior_motivation.position.external.definition",
        "personal_behavior_motivation.tendency.growth.definition",
        "personal_behavior_motivation.tendency.diffusion.definition",
        "personal_behavior_motivation.tendency.balance.definition",
        "personal_behavior_motivation.tendency.harvest.definition",
        "personal_behavior_motivation.tendency.accumulation.definition",
    ],
    "cautions": ["personal_behavior_motivation.genuine_current.definition"],
    "official_definition": ["personal_behavior_motivation.definition"],
    "current_definition": ["personal_behavior_motivation.definition"],
    "related_evidence": [
        "personal_behavior_motivation.motivation_position.definition",
        "personal_behavior_motivation.motivation_tendency.definition",
    ],
    "definition": ["personal_behavior_motivation.definition"],
    "difference": ["personal_behavior_motivation.genuine_current.definition"],
}


@dataclass(frozen=True)
class KnowledgeScopePlan:
    task_type: str
    legacy_task_type: str | None
    output_type: str | None
    audience: str | None
    exam: str | None
    reference: str | None
    scope: list[str]
    evidence_keys: list[str]
    requires_type_hypothesis: bool
    allow_uncertain_type: bool
    requires_anonymization: bool
    approval_required: bool
    needs_clarification: bool
    clarifying_questions: list[str]
    workflow_plan: dict[str, Any]


def plan_knowledge_scope(*, task_type: str, query: str = "") -> KnowledgeScopePlan:
    workflow_plan = build_workflow_plan(task_type=task_type, query=query)
    concept_result = classify_concept(query=query, task_type=workflow_plan["task_type"])
    reference = concept_result.reference or infer_primary_official_reference(query or "")
    exam = concept_result.exam or REFERENCE_TO_EXAM.get(reference or "")
    scope = list(workflow_plan.get("knowledge_scope", []))

    evidence_keys: list[str] = []
    evidence_keys.extend(_scope_evidence_keys(exam=exam, scope=scope))

    if workflow_plan.get("requires_type_hypothesis") or concept_result.type_candidates:
        evidence_keys.extend(concept_result.evidence_keys)

    needs_clarification = concept_result.needs_clarification
    if not query.strip():
        needs_clarification = True
    elif workflow_plan["task_type"] in {"planning", "content_strategy"} and reference:
        needs_clarification = False

    return KnowledgeScopePlan(
        task_type=workflow_plan["task_type"],
        legacy_task_type=workflow_plan.get("legacy_task_type"),
        output_type=workflow_plan.get("output_type"),
        audience=workflow_plan.get("audience"),
        exam=exam,
        reference=reference,
        scope=scope,
        evidence_keys=_dedupe(evidence_keys),
        requires_type_hypothesis=bool(workflow_plan.get("requires_type_hypothesis")),
        allow_uncertain_type=bool(workflow_plan.get("allow_uncertain_type")),
        requires_anonymization=bool(workflow_plan.get("requires_anonymization")),
        approval_required=bool(workflow_plan.get("approval_required")),
        needs_clarification=needs_clarification,
        clarifying_questions=concept_result.clarifying_questions,
        workflow_plan=workflow_plan,
    )


def _scope_evidence_keys(*, exam: str | None, scope: list[str]) -> list[str]:
    scope_map = _scope_map_for_exam(exam)
    evidence_keys: list[str] = []
    for scope_item in scope:
        evidence_keys.extend(scope_map.get(scope_item, []))
    return evidence_keys


def _scope_map_for_exam(exam: str | None) -> dict[str, list[str]]:
    if exam == "group_behavior":
        return GROUP_BEHAVIOR_SCOPE_EVIDENCE
    if exam == "personal_behavior_motivation":
        return PERSONAL_BEHAVIOR_SCOPE_EVIDENCE
    return {}


def _dedupe(values: list[str]) -> list[str]:
    deduped: list[str] = []
    for value in values:
        if value and value not in deduped:
            deduped.append(value)
    return deduped
