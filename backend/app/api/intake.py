from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import CandidateTask, IntakeItem
from app.schemas.intake import (
    CandidateChatMessageCreate,
    CandidateTaskRead,
    CandidateTaskSplit,
    CandidateTaskSplitRead,
    CandidateTaskUpdate,
    IntakeCreate,
    IntakeRead,
)
from app.services.agent_seed import AGENT_IDS
from app.services.concept_router import ConceptResult, classify_concept
from app.services.intake_decomposition import detect_input_type
from app.services.intake_decomposition_graph import GRAPH_NAME, run_intake_decomposition_graph
from app.services.knowledge_context import KnowledgeContext, load_task_knowledge_context
from app.services.model_gateway import ModelGateway
from app.services.output_guard import validate_output

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
        clarifying_questions=metadata.get("clarifying_questions", []),
        clarifying_answers=metadata.get("clarifying_answers", ""),
        chat_messages=_chat_messages_from_metadata(metadata),
        workflow_plan=metadata.get("workflow_plan", {}),
    )


def _chat_messages_from_metadata(metadata: dict) -> list[dict[str, str]]:
    raw_messages = metadata.get("chat_messages", [])
    if not isinstance(raw_messages, list):
        return []

    messages: list[dict[str, str]] = []
    for raw_message in raw_messages:
        if not isinstance(raw_message, dict):
            continue

        role = raw_message.get("role")
        content = raw_message.get("content")
        if role not in {"user", "assistant"} or not isinstance(content, str):
            continue

        stripped_content = content.strip()
        if stripped_content:
            messages.append({"role": role, "content": stripped_content})

    return messages


def _intake_graph_metadata(intake_item: IntakeItem) -> dict:
    metadata = intake_item.item_metadata or {}
    return {
        "decomposition_graph_name": metadata.get("graph_name"),
        "human_review_required": metadata.get("human_review_required", False),
        "decomposition_trace": metadata.get("node_trace", []),
    }


def _candidate_from_draft(
    *,
    intake_item_id: str,
    draft,
    metadata_extra: dict | None = None,
) -> CandidateTask:
    metadata = {
        "rule_hint_task_type": draft.rule_hint_task_type,
        "ai_task_type": draft.ai_task_type,
        "classification_source": draft.classification_source,
        "classification_status": draft.classification_status,
        "confidence": draft.confidence,
        "classification_reason": draft.classification_reason,
        "approval_required": draft.approval_required,
        "rule_hints": draft.rule_hints,
        "review_flags": draft.review_flags,
        "clarifying_questions": draft.clarifying_questions,
        "workflow_plan": draft.workflow_plan,
        "origin_graph": GRAPH_NAME,
        "origin_node": "build_candidates",
    }
    if metadata_extra:
        metadata.update(metadata_extra)

    return CandidateTask(
        intake_item_id=intake_item_id,
        task_type=draft.task_type,
        title=draft.title,
        summary=draft.summary,
        evidence_excerpt=draft.evidence_excerpt,
        recommended_agents=draft.recommended_agents,
        status="draft",
        item_metadata=metadata,
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
        _candidate_from_draft(intake_item_id=intake_item.id, draft=draft)
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
        **_intake_graph_metadata(intake_item),
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
    metadata = dict(candidate.item_metadata or {})
    metadata["clarifying_answers"] = payload.clarifying_answers
    candidate.item_metadata = metadata
    db.commit()
    db.refresh(candidate)

    return _candidate_to_read(candidate)


@router.post("/candidates/{candidate_id}/messages", response_model=CandidateTaskRead)
def create_candidate_message(
    candidate_id: str,
    payload: CandidateChatMessageCreate,
    db: Session = Depends(get_db),
) -> CandidateTaskRead:
    candidate = db.get(CandidateTask, candidate_id)
    if candidate is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate task not found")

    intake_item = db.get(IntakeItem, candidate.intake_item_id)
    if intake_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Intake item not found")

    metadata = dict(candidate.item_metadata or {})
    messages = _chat_messages_from_metadata(metadata)
    messages.append({"role": "user", "content": payload.content})

    assistant_content = _rule_based_candidate_chat_reply(
        intake_item=intake_item,
        candidate=candidate,
        messages=messages,
    )
    model_gateway = ModelGateway()
    model_context = ""
    knowledge_context: KnowledgeContext | None = None
    if not assistant_content:
        knowledge_context = _candidate_chat_knowledge_context(
            candidate=candidate,
            messages=messages,
        )
        model_context = _candidate_chat_context(
            intake_item=intake_item,
            candidate=candidate,
            messages=messages,
            knowledge_context=knowledge_context,
        )
        assistant_content = model_gateway.draft(
            task_title=candidate.title,
            task_type=candidate.task_type,
            context=model_context,
        ).strip()
    if not assistant_content:
        assistant_content = "내용을 확인했습니다. 이어서 정리하거나 수정할 부분을 말씀해 주세요."

    guard_result = validate_output(
        task_type=candidate.task_type,
        workflow_plan=(
            knowledge_context.workflow_plan
            if knowledge_context
            else metadata.get("workflow_plan", {})
        ),
        draft=assistant_content,
        enforce_case_learning_requirements=False,
    )
    if guard_result.rewrite_required:
        if not model_context:
            knowledge_context = _candidate_chat_knowledge_context(
                candidate=candidate,
                messages=messages,
            )
            model_context = _candidate_chat_context(
                intake_item=intake_item,
                candidate=candidate,
                messages=messages,
                knowledge_context=knowledge_context,
            )
        assistant_content = model_gateway.fallback_draft(
            task_title=candidate.title,
            task_type=candidate.task_type,
            context=model_context,
        ).strip()

    messages.append({"role": "assistant", "content": assistant_content})
    metadata["chat_messages"] = messages
    candidate.item_metadata = metadata

    db.commit()
    db.refresh(candidate)

    return _candidate_to_read(candidate)


def _rule_based_candidate_chat_reply(
    *,
    intake_item: IntakeItem,
    candidate: CandidateTask,
    messages: list[dict[str, str]],
) -> str:
    latest_user_message = _latest_user_message(messages)
    concept_result = classify_concept(
        query=latest_user_message,
        task_type=candidate.task_type,
        candidate_summary=candidate.summary,
        evidence_excerpt=candidate.evidence_excerpt,
    )
    normalized_latest = _normalize_for_rule(latest_user_message)

    if _asks_exam_or_type(normalized_latest) and concept_result.type_candidates:
        return _concept_based_candidate_chat_reply(concept_result)

    return ""


def _concept_based_candidate_chat_reply(concept_result: ConceptResult) -> str:
    if concept_result.exam != "group_behavior" or not concept_result.type_candidates:
        return ""

    primary = concept_result.type_candidates[0]
    if primary.axis == "decision_style" and primary.type == "group":
        blocks = [
            "이 표현은 CRATA 집단행동검사 쪽 단서가 큽니다.",
            "",
            "그중에서도 의사결정방식 축의 `그룹형` 가능성이 먼저 보입니다. 그룹형은 자신의 상황을 이해하는 주변 사람들과의 대화 속에서 생각과 감정이 정리되고 구별되며, 자신을 잘 아는 사람들의 정보를 신뢰하면서 판단과 결정을 해가는 쪽입니다.",
            "",
            "다만 타인을 찾는 이유가 중요합니다. 관계 속 대화에서 생각과 감정이 정리되는 쪽이면 그룹형 단서가 크고, 수준 차이가 느껴지는 관계에서 거절이나 결정 타이밍이 어려운 쪽이면 자기효능감 향상방식의 `비교형` 요소도 함께 봐야 합니다.",
        ]
        if concept_result.clarifying_questions:
            blocks.extend(["", f"확인 질문: {concept_result.clarifying_questions[0]}"])
        return "\n".join(blocks)

    if primary.axis == "decision_style" and primary.type == "solo":
        return (
            "이 표현은 CRATA 집단행동검사의 의사결정방식 축에서 `혼자형` 단서가 큽니다.\n\n"
            "혼자형은 타인과 말하기 전에 생각이 먼저 정리되어야 편하고, 객관 자료나 정보를 통해 판단을 정리하는 경향으로 봅니다."
        )

    if primary.axis == "self_efficacy" and primary.type == "comparison":
        return (
            "이 표현은 CRATA 집단행동검사의 자기효능감 향상방식 축에서 `비교형` 단서가 큽니다.\n\n"
            "핵심은 타인의 말을 듣는 것 자체보다, 수준 차이·위치 차이·평가 가능성이 있는 관계에서 위축되거나 거절과 선택이 부담스러운지입니다."
        )

    return ""


def _asks_exam_or_type(normalized_text: str) -> bool:
    exam_markers = ("검사", "유형", "무슨", "어떤", "스타일")
    return any(marker in normalized_text for marker in exam_markers)


def _normalize_for_rule(text: str) -> str:
    return " ".join(text.casefold().split())


def _candidate_chat_context(
    *,
    intake_item: IntakeItem,
    candidate: CandidateTask,
    messages: list[dict[str, str]],
    knowledge_context: KnowledgeContext | None = None,
) -> str:
    metadata = candidate.item_metadata or {}
    if knowledge_context is None:
        knowledge_context = _candidate_chat_knowledge_context(candidate=candidate, messages=messages)
    conversation = "\n".join(
        f"{'나' if message['role'] == 'user' else 'CRATA AI'}: {message['content']}"
        for message in messages[-6:]
    )
    clarifying_questions = metadata.get("clarifying_questions", [])
    clarifying_answer = metadata.get("clarifying_answers", "")
    clarifying_block = ""
    if clarifying_questions or clarifying_answer:
        clarifying_block = "\n".join(
            [
                "# 확인된 추가 정보",
                *[f"- {question}" for question in clarifying_questions],
                clarifying_answer,
                "",
            ]
        ).strip()

    return "\n\n".join(
        block
        for block in (
            "# 사용자 원문",
            "후보 대화 단계에서는 원문 전체 대신 후보 요약과 직접 근거 발췌만 사용합니다.",
            "# 현재 요청 후보",
            f"작업 유형: {candidate.task_type}\n제목: {candidate.title}\n설명: {candidate.summary}\n근거: {candidate.evidence_excerpt}",
            clarifying_block,
            "# 지금까지의 대화",
            conversation,
            "# 응답 지침",
            (
                "일반 AI 채팅처럼 바로 답합니다. 내부 라우팅, 배정 에이전트, 작업 후보, 승인대기함, 검수 메모, "
                "참조 파일 목록 같은 운영 정보를 사용자에게 노출하지 않습니다. 사용자가 저장, 등록, 승인, 공식 반영을 "
                "명시하기 전에는 최종 반영 절차로 진행하지 말고 대화 안에서 설명, 질문, 수정 제안을 이어갑니다. "
                "정보가 부족하면 필요한 질문만 1~3개로 짧게 묻습니다."
            ),
            knowledge_context.text,
        )
        if block
    )


def _candidate_chat_knowledge_context(
    *,
    candidate: CandidateTask,
    messages: list[dict[str, str]],
) -> KnowledgeContext:
    latest_user_message = _latest_user_message(messages)
    query = "\n".join(
        part
        for part in (
            candidate.title,
            candidate.summary,
            candidate.evidence_excerpt,
            latest_user_message,
        )
        if part
    )
    return load_task_knowledge_context(
        task_type=candidate.task_type,
        assigned_agents=candidate.recommended_agents,
        query=query,
    )


def _latest_user_message(messages: list[dict[str, str]]) -> str:
    for message in reversed(messages):
        if message.get("role") == "user":
            return message.get("content", "")
    return ""


@router.post(
    "/candidates/{candidate_id}/split",
    response_model=CandidateTaskSplitRead,
    status_code=status.HTTP_201_CREATED,
)
def split_candidate_task(
    candidate_id: str,
    payload: CandidateTaskSplit,
    db: Session = Depends(get_db),
) -> CandidateTaskSplitRead:
    candidate = db.get(CandidateTask, candidate_id)
    if candidate is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate task not found")
    if candidate.status != "draft":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Candidate task already started")

    split_candidates: list[CandidateTask] = []
    for index, part in enumerate(payload.parts, start=1):
        decomposition_result = run_intake_decomposition_graph(part)
        for draft in decomposition_result.candidate_drafts:
            split_candidates.append(
                _candidate_from_draft(
                    intake_item_id=candidate.intake_item_id,
                    draft=draft,
                    metadata_extra={
                        "origin_candidate_id": candidate.id,
                        "origin_action": "split_candidate",
                        "split_part_index": index,
                    },
                )
            )

    if len(split_candidates) < 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Split parts did not produce at least two candidate tasks",
        )

    original_metadata = dict(candidate.item_metadata or {})
    original_metadata.update(
        {
            "split_part_count": len(split_candidates),
            "split_parts": payload.parts,
        }
    )
    candidate.status = "split"
    candidate.item_metadata = original_metadata

    db.add_all(split_candidates)
    db.commit()
    db.refresh(candidate)
    for split_candidate in split_candidates:
        db.refresh(split_candidate)

    return CandidateTaskSplitRead(
        original_candidate=_candidate_to_read(candidate),
        split_candidates=[_candidate_to_read(split_candidate) for split_candidate in split_candidates],
    )
