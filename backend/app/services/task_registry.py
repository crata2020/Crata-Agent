import json
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class OutputTypeDefinition:
    id: str
    markers: list[str]
    audience: str | None = None


@dataclass(frozen=True)
class TaskDefinition:
    id: str
    name: str
    legacy_task_types: list[str]
    intent_markers: list[str]
    output_types: list[OutputTypeDefinition]
    default_output_type: str | None
    primary_agent: str
    gates: dict[str, str]
    default_knowledge_scope: list[str]
    requires_type_hypothesis: bool
    allow_uncertain_type: bool
    requires_anonymization: bool
    approval_required: bool
    action_policy: dict[str, Any]
    playbook: str | None = None
    operations: list[str] = field(default_factory=list)


def resolve_task_type(task_type: str) -> str:
    registry = _load_task_registry()
    normalized = _normalize_task_type(task_type)
    if normalized in registry:
        return normalized

    for task in registry.values():
        if normalized in task.legacy_task_types:
            return task.id

    return "general_agent_task"


def get_task_definition(task_type: str) -> TaskDefinition:
    registry = _load_task_registry()
    return registry[resolve_task_type(task_type)]


def build_workflow_plan(*, task_type: str, query: str = "") -> dict[str, Any]:
    task = get_task_definition(task_type)
    output_type, audience = _infer_output_type(task=task, query=query)
    action_policy = _infer_action_policy(task=task, query=query)
    legacy_task_type = _normalize_task_type(task_type)

    return {
        "task_type": task.id,
        "legacy_task_type": legacy_task_type if legacy_task_type != task.id else None,
        "output_type": output_type,
        "audience": audience,
        "primary_agent": task.primary_agent,
        "gates": task.gates,
        "knowledge_scope": task.default_knowledge_scope,
        "requires_type_hypothesis": task.requires_type_hypothesis,
        "allow_uncertain_type": task.allow_uncertain_type,
        "requires_anonymization": task.requires_anonymization,
        "approval_required": task.approval_required,
        "action_policy": action_policy,
        "playbook": task.playbook,
    }


def _infer_output_type(*, task: TaskDefinition, query: str) -> tuple[str | None, str | None]:
    normalized_query = _normalize(query)
    for output_type in task.output_types:
        if any(_normalize(marker) in normalized_query for marker in output_type.markers):
            return output_type.id, output_type.audience
    return task.default_output_type, None


def _infer_action_policy(*, task: TaskDefinition, query: str) -> dict[str, Any]:
    policy = dict(task.action_policy)
    normalized_query = _normalize(query)
    persist_markers = ("저장", "반영", "승인대기", "승인 대기", "공식", "학습")
    if task.approval_required or any(marker in normalized_query for marker in persist_markers):
        policy["default"] = "create_approval" if policy.get("persist_requires_approval") else "save_draft"
    return policy


@lru_cache(maxsize=1)
def _load_task_registry() -> dict[str, TaskDefinition]:
    path = _repo_root() / "backend" / "app" / "config" / "task_registry.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    registry: dict[str, TaskDefinition] = {}
    for task_id, raw_task in data.get("tasks", {}).items():
        output_types = [
            OutputTypeDefinition(
                id=str(raw_output.get("id", "")),
                markers=[str(marker) for marker in raw_output.get("markers", [])],
                audience=raw_output.get("audience"),
            )
            for raw_output in raw_task.get("output_types", [])
        ]
        registry[task_id] = TaskDefinition(
            id=task_id,
            name=str(raw_task.get("name", task_id)),
            legacy_task_types=[str(value) for value in raw_task.get("legacy_task_types", [])],
            intent_markers=[str(value) for value in raw_task.get("intent_markers", [])],
            output_types=output_types,
            default_output_type=raw_task.get("default_output_type"),
            primary_agent=str(raw_task.get("primary_agent", "crata_ceo")),
            gates={str(key): str(value) for key, value in raw_task.get("gates", {}).items()},
            default_knowledge_scope=[str(value) for value in raw_task.get("default_knowledge_scope", [])],
            requires_type_hypothesis=bool(raw_task.get("requires_type_hypothesis", False)),
            allow_uncertain_type=bool(raw_task.get("allow_uncertain_type", False)),
            requires_anonymization=bool(raw_task.get("requires_anonymization", False)),
            approval_required=bool(raw_task.get("approval_required", False)),
            action_policy=dict(raw_task.get("action_policy", {})),
            playbook=raw_task.get("playbook"),
            operations=[str(value) for value in raw_task.get("operations", [])],
        )
    return registry


def _normalize_task_type(task_type: str) -> str:
    return _normalize(task_type).replace(" ", "_") or "general_agent_task"


def _normalize(text: str) -> str:
    return " ".join(str(text).casefold().split())


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]
