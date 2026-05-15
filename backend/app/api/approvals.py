from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Approval, Artifact, CandidateTask, Task
from app.schemas.approval import ApprovalDecision, ApprovalRead

router = APIRouter(prefix="/approvals", tags=["approvals"])


@router.get("", response_model=list[ApprovalRead])
def list_approvals(db: Session = Depends(get_db)) -> list[ApprovalRead]:
    approvals = db.scalars(select(Approval).order_by(Approval.created_at.desc())).all()
    return [_read(approval) for approval in approvals]


@router.post("/{approval_id}/decide", response_model=ApprovalRead)
def decide_approval(
    approval_id: str, payload: ApprovalDecision, db: Session = Depends(get_db)
) -> ApprovalRead:
    approval = db.get(Approval, approval_id)
    if approval is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approval not found")
    if approval.status != "pending_approval":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Approval already decided")

    approval.status = payload.decision
    approval.decision_reason = payload.reason
    approval.decided_at = datetime.now(UTC).replace(tzinfo=None)

    artifact = db.get(Artifact, approval.artifact_id)
    if artifact is not None:
        artifact.status = payload.decision

    task = db.get(Task, approval.task_id)
    if task is not None:
        task.status = payload.decision
        if task.candidate_task_id is not None:
            candidate = db.get(CandidateTask, task.candidate_task_id)
            if candidate is not None:
                candidate.status = payload.decision

    db.commit()
    db.refresh(approval)
    return _read(approval)


def _read(item: Approval) -> ApprovalRead:
    return ApprovalRead(
        id=item.id,
        task_id=item.task_id,
        artifact_id=item.artifact_id,
        approval_type=item.approval_type,
        status=item.status,
        title=item.title,
        summary=item.summary,
        before_content=item.before_content,
        after_content=item.after_content,
        affected_area=item.affected_area,
        reviewer_note=item.reviewer_note,
    )
