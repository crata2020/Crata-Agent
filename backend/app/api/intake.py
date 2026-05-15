from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import CandidateTask, IntakeItem
from app.schemas.intake import CandidateTaskRead, CandidateTaskUpdate, IntakeCreate, IntakeRead
from app.services.intake_decomposition import decompose_input, detect_input_type

router = APIRouter(prefix="/intake", tags=["intake"])


def _candidate_to_read(candidate_task: CandidateTask) -> CandidateTaskRead:
    return CandidateTaskRead(
        id=candidate_task.id,
        task_type=candidate_task.task_type,
        title=candidate_task.title,
        summary=candidate_task.summary,
        evidence_excerpt=candidate_task.evidence_excerpt,
        recommended_agents=candidate_task.recommended_agents,
        status=candidate_task.status,
    )


@router.post("", response_model=IntakeRead, status_code=status.HTTP_201_CREATED)
def create_intake(payload: IntakeCreate, db: Session = Depends(get_db)) -> IntakeRead:
    input_type = payload.input_type
    if not input_type or input_type == "auto":
        input_type = detect_input_type(payload.title, payload.raw_content)

    intake_item = IntakeItem(
        title=payload.title,
        input_type=input_type,
        raw_content=payload.raw_content,
        source=payload.source,
        item_metadata={},
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
            item_metadata={},
        )
        for draft in decompose_input(payload.raw_content)
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

    candidate.title = payload.title
    candidate.summary = payload.summary
    candidate.recommended_agents = payload.recommended_agents
    db.commit()
    db.refresh(candidate)

    return _candidate_to_read(candidate)
