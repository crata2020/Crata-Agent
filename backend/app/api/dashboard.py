from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Agent, Approval, Artifact, CandidateTask, Task
from app.schemas.dashboard import DashboardSummary

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


def _count(db: Session, statement) -> int:
    return int(db.scalar(statement) or 0)
