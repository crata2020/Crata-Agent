from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import CandidateTask, Task
from app.schemas.workflow import RunTaskResponse
from app.services.agent_seed import seed_agents
from app.services.workflow_runner import run_task_workflow

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post(
    "/from-candidate/{candidate_id}/run",
    response_model=RunTaskResponse,
    status_code=status.HTTP_201_CREATED,
)
def run_candidate_task(candidate_id: str, db: Session = Depends(get_db)) -> RunTaskResponse:
    candidate = db.get(CandidateTask, candidate_id)
    if candidate is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate task not found")
    if candidate.status != "draft":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Candidate task already started")
    existing_task = db.scalar(select(Task).where(Task.candidate_task_id == candidate.id))
    if existing_task is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Candidate task already has a task")
    seed_agents(db)

    task = Task(
        candidate_task_id=candidate.id,
        task_type=candidate.task_type,
        title=candidate.title,
        description=candidate.summary,
        status="running",
        assigned_agents=candidate.recommended_agents,
    )
    candidate.status = "running"
    db.add(task)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Candidate task already has a task") from exc
    db.refresh(task)
    db.refresh(candidate)
    task_id = task.id

    try:
        result = run_task_workflow(db, task_id)
    except Exception as exc:
        db.rollback()
        candidate = db.get(CandidateTask, candidate_id)
        task = db.get(Task, task_id)
        if candidate is not None:
            candidate.status = "failed"
        if task is not None:
            task.status = "failed"
        db.commit()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Task workflow failed") from exc

    candidate = db.get(CandidateTask, candidate_id)
    if candidate is not None:
        candidate.status = result.status or "pending_approval"
        db.commit()

    return RunTaskResponse(
        task_id=task_id,
        workflow_run_id=result.workflow_run_id,
        artifact_id=result.artifact_id,
        approval_id=result.approval_id,
        status=result.status,
    )
