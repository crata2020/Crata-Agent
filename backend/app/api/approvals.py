from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Approval, Artifact, CandidateTask, Task
from app.schemas.approval import ApprovalDecision, ApprovalRead
from app.schemas.intake import CandidateTaskRead

router = APIRouter(prefix="/approvals", tags=["approvals"])


@router.get("", response_model=list[ApprovalRead])
def list_approvals(db: Session = Depends(get_db)) -> list[ApprovalRead]:
    approvals = db.scalars(select(Approval).order_by(Approval.created_at.desc())).all()
    return [_read(approval, db) for approval in approvals]


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
    revision_candidate: CandidateTask | None = None
    if task is not None:
        task.status = payload.decision
        if task.candidate_task_id is not None:
            candidate = db.get(CandidateTask, task.candidate_task_id)
            if candidate is not None:
                candidate.status = payload.decision
                if payload.decision == "revise_requested":
                    revision_candidate = _create_revision_candidate(
                        approval=approval,
                        original_candidate=candidate,
                        task=task,
                        reason=payload.reason,
                    )
                    db.add(revision_candidate)

    db.commit()
    db.refresh(approval)
    if revision_candidate is not None:
        db.refresh(revision_candidate)
    return _read(approval, db)


def _create_revision_candidate(
    *,
    approval: Approval,
    original_candidate: CandidateTask,
    task: Task,
    reason: str,
) -> CandidateTask:
    return CandidateTask(
        intake_item_id=original_candidate.intake_item_id,
        task_type=original_candidate.task_type,
        title=f"{original_candidate.title} 재작업 후보",
        summary=f"수정요청 사유를 반영해 다시 실행할 후보입니다.\n수정 사유: {reason}",
        evidence_excerpt=(
            f"수정 사유: {reason}\n\n"
            f"기존 승인 초안:\n{approval.after_content[:1200]}"
        ),
        recommended_agents=original_candidate.recommended_agents or task.assigned_agents,
        status="draft",
        item_metadata={
            "source": "approval_revision",
            "source_approval_id": approval.id,
            "source_candidate_task_id": original_candidate.id,
            "source_task_id": task.id,
            "revision_reason": reason,
        },
    )


def _candidate_to_read(candidate: CandidateTask) -> CandidateTaskRead:
    return CandidateTaskRead(
        id=candidate.id,
        task_type=candidate.task_type,
        title=candidate.title,
        summary=candidate.summary,
        evidence_excerpt=candidate.evidence_excerpt,
        recommended_agents=candidate.recommended_agents,
        status=candidate.status,
    )


def _revision_candidate_for(item: Approval, db: Session) -> CandidateTask | None:
    candidates = db.scalars(select(CandidateTask)).all()
    return next(
        (
            candidate
            for candidate in candidates
            if candidate.item_metadata.get("source_approval_id") == item.id
        ),
        None,
    )


def _read(item: Approval, db: Session) -> ApprovalRead:
    revision_candidate = _revision_candidate_for(item, db)
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
        revision_candidate_task=_candidate_to_read(revision_candidate)
        if revision_candidate is not None
        else None,
    )
