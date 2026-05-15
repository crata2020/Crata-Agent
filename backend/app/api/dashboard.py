from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Agent, Approval, Artifact, CandidateTask, Task
from app.schemas.dashboard import AgentActivityRead, AgentActivityResponse, DashboardSummary
from app.services.agent_seed import AGENT_SEEDS, seed_agents

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(db: Session = Depends(get_db)) -> DashboardSummary:
    return DashboardSummary(
        agent_count=_count(db, select(func.count()).select_from(Agent)),
        active_agent_count=_count(
            db, select(func.count()).select_from(Agent).where(Agent.enabled.is_(True))
        ),
        candidate_task_count=_count(db, select(func.count()).select_from(CandidateTask)),
        running_task_count=_count(
            db, select(func.count()).select_from(Task).where(Task.status == "running")
        ),
        pending_approval_count=_count(
            db,
            select(func.count()).select_from(Approval).where(Approval.status == "pending_approval"),
        ),
        artifact_count=_count(db, select(func.count()).select_from(Artifact)),
    )


@router.get("/agent-activity", response_model=AgentActivityResponse)
def get_agent_activity(db: Session = Depends(get_db)) -> AgentActivityResponse:
    seed_agents(db)

    agents = db.scalars(select(Agent)).all()
    tasks = db.scalars(select(Task).order_by(Task.updated_at.desc())).all()
    approvals = db.scalars(
        select(Approval)
        .where(Approval.status == "pending_approval")
        .order_by(Approval.created_at.desc())
    ).all()
    candidate_tasks = db.scalars(
        select(CandidateTask).order_by(CandidateTask.updated_at.desc())
    ).all()
    pending_approval_task_ids = {approval.task_id for approval in approvals}
    seed_order = {seed["id"]: index for index, seed in enumerate(AGENT_SEEDS)}

    return AgentActivityResponse(
        agents=[
            _agent_activity(
                agent=agent,
                tasks=tasks,
                pending_approval_task_ids=pending_approval_task_ids,
                candidate_tasks=candidate_tasks,
            )
            for agent in sorted(agents, key=lambda agent: seed_order.get(agent.id, 999))
        ]
    )


def _count(db: Session, statement) -> int:
    return int(db.scalar(statement) or 0)


def _agent_activity(
    *,
    agent: Agent,
    tasks: list[Task],
    pending_approval_task_ids: set[str],
    candidate_tasks: list[CandidateTask],
) -> AgentActivityRead:
    assigned_tasks = [task for task in tasks if _contains(agent.id, task.assigned_agents)]
    running_tasks = [task for task in assigned_tasks if task.status == "running"]
    waiting_tasks = [
        task
        for task in assigned_tasks
        if task.status == "pending_approval" or task.id in pending_approval_task_ids
    ]
    queued_candidates = [
        candidate
        for candidate in candidate_tasks
        if candidate.status == "draft" and _contains(agent.id, candidate.recommended_agents)
    ]

    if not agent.enabled:
        activity_status = "planned"
        focus = "2차 확장 준비"
        current_task = None
    elif running_tasks:
        activity_status = "working"
        current_task = running_tasks[0]
        focus = current_task.title
    elif waiting_tasks:
        activity_status = "waiting_approval"
        current_task = waiting_tasks[0]
        focus = current_task.title
    elif queued_candidates:
        activity_status = "queued"
        current_task = queued_candidates[0]
        focus = current_task.title
    else:
        activity_status = "idle"
        focus = "새 요청 대기"
        current_task = None

    return AgentActivityRead(
        id=agent.id,
        display_name=agent.display_name,
        role=agent.role,
        color=agent.color,
        enabled=agent.enabled,
        status=agent.status,
        activity_status=activity_status,
        current_focus=focus,
        current_task_title=current_task.title if current_task is not None else None,
        current_task_type=current_task.task_type if current_task is not None else None,
        workload_count=len(running_tasks) + len(waiting_tasks) + len(queued_candidates),
        pending_approval_count=len(waiting_tasks),
        candidate_count=len(queued_candidates),
    )


def _contains(agent_id: str, values: list | None) -> bool:
    return agent_id in (values or [])
