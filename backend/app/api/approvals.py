from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Approval, Artifact, CandidateTask, Task
from app.schemas.approval import ApprovalComparisonRead, ApprovalDecision, ApprovalRead
from app.schemas.intake import CandidateTaskRead
from app.services.knowledge_context import AGENT_GUIDE_REFERENCE

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
    original_metadata = original_candidate.item_metadata or {}
    existing_answers = original_metadata.get("clarifying_answers", "")
    revision_answers = f"수정요청 사유: {reason}".strip()
    if isinstance(existing_answers, str) and existing_answers.strip():
        revision_answers = f"{existing_answers.strip()}\n\n{revision_answers}"

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
            **original_metadata,
            "source": "approval_revision",
            "source_approval_id": approval.id,
            "source_candidate_task_id": original_candidate.id,
            "source_task_id": task.id,
            "revision_reason": reason,
            "clarifying_answers": revision_answers,
            "review_flags": [
                *original_metadata.get("review_flags", []),
                "수정요청 재작업",
            ],
        },
    )


def _candidate_to_read(candidate: CandidateTask) -> CandidateTaskRead:
    metadata = candidate.item_metadata or {}
    return CandidateTaskRead(
        id=candidate.id,
        task_type=candidate.task_type,
        title=candidate.title,
        summary=candidate.summary,
        evidence_excerpt=candidate.evidence_excerpt,
        recommended_agents=candidate.recommended_agents,
        status=candidate.status,
        rule_hint_task_type=metadata.get("rule_hint_task_type"),
        ai_task_type=metadata.get("ai_task_type", candidate.task_type),
        classification_source=metadata.get("classification_source", "approval_revision"),
        classification_status=metadata.get("classification_status", "needs_review"),
        confidence=metadata.get("confidence", 0.5),
        classification_reason=metadata.get("classification_reason", "수정요청으로 생성된 재작업 후보입니다."),
        approval_required=metadata.get("approval_required", True),
        rule_hints=metadata.get("rule_hints", []),
        review_flags=metadata.get("review_flags", []),
        clarifying_questions=metadata.get("clarifying_questions", []),
        clarifying_answers=metadata.get("clarifying_answers", ""),
    )


def _revision_candidate_for(item: Approval, db: Session) -> CandidateTask | None:
    candidates = db.scalars(select(CandidateTask)).all()
    return next(
        (
            candidate
            for candidate in candidates
            if (candidate.item_metadata or {}).get("source_approval_id") == item.id
        ),
        None,
    )


def _read(item: Approval, db: Session) -> ApprovalRead:
    revision_candidate = _revision_candidate_for(item, db)
    artifact = db.get(Artifact, item.artifact_id)
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
        knowledge_references=_knowledge_references_for(artifact),
        revision_candidate_task=_candidate_to_read(revision_candidate)
        if revision_candidate is not None
        else None,
        comparison=_comparison_for(item, revision_candidate, db),
    )


def _comparison_for(
    item: Approval,
    revision_candidate: CandidateTask | None,
    db: Session,
) -> ApprovalComparisonRead | None:
    current_revision_candidate = _current_revision_candidate_for(item, db)
    if current_revision_candidate is not None:
        metadata = current_revision_candidate.item_metadata or {}
        source_approval_id = _metadata_string(metadata, "source_approval_id")
        if source_approval_id is None:
            return None

        source_approval = db.get(Approval, source_approval_id)
        if source_approval is None:
            return None

        return _comparison_read(
            source_approval=source_approval,
            revision_candidate=current_revision_candidate,
            revision_task=db.get(Task, item.task_id),
            revision_approval=item,
        )

    if revision_candidate is None:
        return None

    revision_task = db.scalar(select(Task).where(Task.candidate_task_id == revision_candidate.id))
    revision_approval = (
        db.scalar(select(Approval).where(Approval.task_id == revision_task.id))
        if revision_task is not None
        else None
    )
    return _comparison_read(
        source_approval=item,
        revision_candidate=revision_candidate,
        revision_task=revision_task,
        revision_approval=revision_approval,
    )


def _current_revision_candidate_for(item: Approval, db: Session) -> CandidateTask | None:
    task = db.get(Task, item.task_id)
    if task is None or task.candidate_task_id is None:
        return None

    candidate = db.get(CandidateTask, task.candidate_task_id)
    if candidate is None:
        return None

    metadata = candidate.item_metadata or {}
    return candidate if metadata.get("source") == "approval_revision" else None


def _comparison_read(
    *,
    source_approval: Approval,
    revision_candidate: CandidateTask,
    revision_task: Task | None,
    revision_approval: Approval | None,
) -> ApprovalComparisonRead:
    metadata = revision_candidate.item_metadata or {}
    revision_reason = _metadata_string(metadata, "revision_reason") or ""

    return ApprovalComparisonRead(
        source_approval_id=source_approval.id,
        source_task_id=source_approval.task_id,
        source_title=source_approval.title,
        source_status=source_approval.status,
        source_after_content=source_approval.after_content,
        revision_reason=revision_reason,
        revision_candidate_id=revision_candidate.id,
        revision_candidate_status=(
            revision_approval.status
            if revision_approval is not None
            else revision_task.status
            if revision_task is not None
            else revision_candidate.status
        ),
        revision_task_id=revision_task.id if revision_task is not None else None,
        revision_approval_id=revision_approval.id if revision_approval is not None else None,
        revision_title=revision_approval.title if revision_approval is not None else None,
        revision_status=revision_approval.status if revision_approval is not None else None,
        revision_after_content=revision_approval.after_content if revision_approval is not None else None,
    )


def _metadata_string(metadata: dict, key: str) -> str | None:
    value = metadata.get(key)
    return value if isinstance(value, str) and value else None


def _knowledge_references_for(artifact: Artifact | None) -> list[str]:
    if artifact is not None:
        references = (artifact.item_metadata or {}).get("knowledge_references", [])
        if isinstance(references, list) and references:
            return [reference for reference in references if isinstance(reference, str)]

    return [AGENT_GUIDE_REFERENCE]
