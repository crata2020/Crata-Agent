from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Approval, Artifact, CandidateTask, IntakeItem, Task, WorkflowRun, WorkflowStep
from app.services.agent_seed import seed_agents
from app.services.workflow_runner import run_task_workflow


def test_run_task_workflow_creates_artifact_and_approval(db_session: Session) -> None:
    seed_agents(db_session)
    intake_item = IntakeItem(
        title="결과지 문구 회의록",
        input_type="memo",
        raw_content="결과지 공식 문구를 더 부드럽게 수정하고 승인 후 반영한다.",
    )
    db_session.add(intake_item)
    db_session.flush()
    candidate_task = CandidateTask(
        intake_item_id=intake_item.id,
        task_type="report_phrase_revision",
        title="결과지 문구 수정",
        summary="결과지 문구를 수정한다.",
        evidence_excerpt="결과지 공식 문구",
        recommended_agents=["report_editor"],
    )
    db_session.add(candidate_task)
    db_session.flush()
    task = Task(
        candidate_task_id=candidate_task.id,
        task_type=candidate_task.task_type,
        title=candidate_task.title,
        description=candidate_task.summary,
        status="running",
        assigned_agents=candidate_task.recommended_agents,
    )
    db_session.add(task)
    db_session.commit()

    result = run_task_workflow(db_session, task.id)

    assert result.status == "pending_approval"

    artifacts = db_session.scalars(select(Artifact)).all()
    approvals = db_session.scalars(select(Approval)).all()
    assert len(artifacts) == 1
    assert len(approvals) == 1

    artifact = artifacts[0]
    approval = approvals[0]
    db_session.refresh(task)
    workflow_run = db_session.get(WorkflowRun, result.workflow_run_id)

    assert artifact.id == result.artifact_id
    assert approval.id == result.approval_id
    assert artifact.status == "pending_approval"
    assert approval.status == "pending_approval"
    assert task.status == "pending_approval"
    assert workflow_run is not None
    assert workflow_run.status == "pending_approval"
    assert workflow_run.current_step == "approval_pending"

    steps = db_session.scalars(
        select(WorkflowStep)
        .where(WorkflowStep.workflow_run_id == workflow_run.id)
        .order_by(WorkflowStep.started_at)
    ).all()
    assert [(step.step_name, step.agent_id) for step in steps] == [
        ("ceo_routing", "crata_ceo"),
        ("context_retrieval", "concept_guardian"),
        ("specialist_draft", "report_editor"),
        ("quality_review", "quality_inspector"),
    ]
    assert task.title in approval.title
