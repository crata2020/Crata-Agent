from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models import Approval, Artifact, Task, WorkflowRun, WorkflowStep
from app.services.model_gateway import ModelGateway


@dataclass(frozen=True)
class WorkflowResult:
    workflow_run_id: str
    artifact_id: str
    approval_id: str
    status: str


def run_task_workflow(db: Session, task_id: str) -> WorkflowResult:
    task = db.get(Task, task_id)
    if task is None:
        raise ValueError(f"Task not found: {task_id}")

    run = WorkflowRun(
        workflow_type="agent_operation",
        task_id=task.id,
        status="running",
        current_step="ceo_routing",
        checkpoint={
            "task_type": task.task_type,
            "assigned_agents": task.assigned_agents,
        },
    )
    db.add(run)
    db.flush()

    for step_name, agent_id in (
        ("ceo_routing", "crata_ceo"),
        ("context_retrieval", "concept_guardian"),
        ("specialist_draft", _primary_agent(task.task_type)),
        ("quality_review", "quality_inspector"),
    ):
        db.add(
            WorkflowStep(
                workflow_run_id=run.id,
                step_name=step_name,
                agent_id=agent_id,
                input_summary=task.title,
                output_summary="completed",
                status="completed",
                completed_at=_utcnow(),
                item_metadata={},
            )
        )

    draft = ModelGateway().draft(
        task_title=task.title,
        task_type=task.task_type,
        context=task.description,
    )
    artifact = Artifact(
        task_id=task.id,
        workflow_run_id=run.id,
        artifact_type="draft",
        title=f"{task.title} 초안",
        content=draft,
        status="pending_approval",
        item_metadata={"generated_by": "workflow_runner"},
    )
    db.add(artifact)
    db.flush()

    approval = Approval(
        task_id=task.id,
        artifact_id=artifact.id,
        approval_type=_approval_type(task.task_type),
        status="pending_approval",
        title=f"{task.title} 승인 요청",
        summary="에이전트 작업 결과가 승인대기 상태입니다.",
        before_content="",
        after_content=draft,
        affected_area=task.task_type,
        reviewer_note="공식 반영 전 청하님 검토가 필요합니다.",
    )
    db.add(approval)
    db.flush()

    task.status = "pending_approval"
    run.status = "pending_approval"
    run.current_step = "approval_pending"
    run.completed_at = _utcnow()
    db.commit()

    return WorkflowResult(
        workflow_run_id=run.id,
        artifact_id=artifact.id,
        approval_id=approval.id,
        status="pending_approval",
    )


def _primary_agent(task_type: str) -> str:
    return {
        "report_phrase_revision": "report_editor",
        "counseling_case_learning": "case_learner",
        "relationship_pattern_analysis": "relationship_analyst",
        "business_planning": "business_designer",
        "content_marketing": "content_strategist",
    }.get(task_type, "crata_ceo")


def _approval_type(task_type: str) -> str:
    return {
        "report_phrase_revision": "report_phrase_change",
        "counseling_case_learning": "learning_candidate",
    }.get(task_type, "general_review")


def _utcnow() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)
