from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import CandidateTask, IntakeItem
from app.schemas.intake import CandidateTaskRead, CandidateTaskUpdate, IntakeCreate, IntakeRead
from app.services.agent_seed import AGENT_IDS
from app.services.intake_decomposition import detect_input_type
from app.services.intake_decomposition_graph import GRAPH_NAME, run_intake_decomposition_graph

router = APIRouter(prefix="/intake", tags=["intake"])


def _candidate_to_read(candidate_task: CandidateTask) -> CandidateTaskRead:
    metadata = candidate_task.item_metadata or {}
    return CandidateTaskRead(
        id=candidate_task.id,
        task_type=candidate_task.task_type,
        title=candidate_task.title,
        summary=candidate_task.summary,
        evidence_excerpt=candidate_task.evidence_excerpt,
        recommended_agents=candidate_task.recommended_agents,
        status=candidate_task.status,
        rule_hint_task_type=metadata.get("rule_hint_task_type"),
        ai_task_type=metadata.get("ai_task_type", candidate_task.task_type),
        classification_source=metadata.get("classification_source", "legacy"),
        classification_status=metadata.get("classification_status", "needs_review"),
        confidence=metadata.get("confidence", 0.5),
        classification_reason=metadata.get("classification_reason", "기존 후보라 분류 근거가 기록되어 있지 않습니다."),
        approval_required=metadata.get("approval_required", False),
        rule_hints=metadata.get("rule_hints", []),
        review_flags=metadata.get("review_flags", []),
    )


@router.post("", response_model=IntakeRead, status_code=status.HTTP_201_CREATED)
def create_intake(payload: IntakeCreate, db: Session = Depends(get_db)) -> IntakeRead:
    input_type = payload.input_type
    if not input_type or input_type == "auto":
        input_type = detect_input_type(payload.title, payload.raw_content)

    decomposition_result = run_intake_decomposition_graph(payload.raw_content)
    intake_item = IntakeItem(
        title=payload.title,
        input_type=input_type,
        raw_content=payload.raw_content,
        source=payload.source,
        item_metadata=decomposition_result.metadata(),
    )
    db.add(intake_item)
    db.flush()

    candidate_tasks = [
        CandidateTask(
            intake_item_id=intake_item.id,
            task_type=draft.task_type,
            title=draft.title,
            summary=draft.summary,
            evidence_excerpt=draft.evidence_excerpt,
            recommended_agents=draft.recommended_agents,
            status="draft",
            item_metadata={
                "rule_hint_task_type": draft.rule_hint_task_type,
                "ai_task_type": draft.ai_task_type,
                "classification_source": draft.classification_source,
                "classification_status": draft.classification_status,
                "confidence": draft.confidence,
                "classification_reason": draft.classification_reason,
                "approval_required": draft.approval_required,
                "rule_hints": draft.rule_hints,
                "review_flags": draft.review_flags,
                "origin_graph": GRAPH_NAME,
                "origin_node": "build_candidates",
            },
        )
        for draft in decomposition_result.candidate_drafts
    ]
    db.add_all(candidate_tasks)
    db.commit()
    db.refresh(intake_item)
    for candidate_task in candidate_tasks:
        db.refresh(candidate_task)

    return IntakeRead(
        id=intake_item.id,
        title=intake_item.title,
        input_type=intake_item.input_type,
        raw_content=intake_item.raw_content,
        candidate_tasks=[_candidate_to_read(candidate_task) for candidate_task in candidate_tasks],
    )


@router.get("/candidates", response_model=list[CandidateTaskRead])
def list_candidate_tasks(db: Session = Depends(get_db)) -> list[CandidateTaskRead]:
    candidate_tasks = db.scalars(
        select(CandidateTask).order_by(CandidateTask.updated_at.desc())
    ).all()

    return [_candidate_to_read(candidate_task) for candidate_task in candidate_tasks]


@router.patch("/candidates/{candidate_id}", response_model=CandidateTaskRead)
def update_candidate_task(
    candidate_id: str,
    payload: CandidateTaskUpdate,
    db: Session = Depends(get_db),
) -> CandidateTaskRead:
    candidate = db.get(CandidateTask, candidate_id)
    if candidate is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate task not found")
    if candidate.status != "draft":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Candidate task already started")

    unknown_agents = [agent for agent in payload.recommended_agents if agent not in AGENT_IDS]
    if unknown_agents:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unknown recommended agents: {', '.join(unknown_agents)}",
        )

    candidate.title = payload.title
    candidate.summary = payload.summary
    candidate.recommended_agents = payload.recommended_agents
    db.commit()
    db.refresh(candidate)

    return _candidate_to_read(candidate)
