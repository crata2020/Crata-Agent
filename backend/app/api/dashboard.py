from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Agent, Approval, Artifact, CandidateTask, IntakeItem, Task, WorkflowRun, WorkflowStep
from app.schemas.dashboard import (
    AgentActivityRead,
    AgentActivityResponse,
    AgentWorkItemRead,
    DashboardSummary,
    RequestMapAgentRead,
    RequestMapItemRead,
    RequestMapResponse,
    RequestMapTaskRead,
    WorkflowActivityResponse,
    WorkflowRunRead,
    WorkflowStepRead,
)
from app.services.agent_seed import AGENT_SEEDS, seed_agents

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

WORKFLOW_STEP_ORDER = [
    "ceo_routing",
    "context_retrieval",
    "question_gate",
    "specialist_draft",
    "quality_review",
    "approval_pending",
]


@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(db: Session = Depends(get_db)) -> DashboardSummary:
    seed_agents(db)

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
    approvals_by_task_id = {approval.task_id: approval for approval in approvals}
    seed_order = {seed["id"]: index for index, seed in enumerate(AGENT_SEEDS)}

    return AgentActivityResponse(
        agents=[
            _agent_activity(
                agent=agent,
                tasks=tasks,
                pending_approval_task_ids=pending_approval_task_ids,
                approvals_by_task_id=approvals_by_task_id,
                candidate_tasks=candidate_tasks,
            )
            for agent in sorted(agents, key=lambda agent: seed_order.get(agent.id, 999))
        ]
    )


@router.get("/workflow-activity", response_model=WorkflowActivityResponse)
def get_workflow_activity(db: Session = Depends(get_db)) -> WorkflowActivityResponse:
    runs = db.scalars(
        select(WorkflowRun)
        .order_by(WorkflowRun.started_at.desc())
        .limit(12)
    ).all()
    run_ids = [run.id for run in runs]
    steps_by_run_id: dict[str, list[WorkflowStep]] = {run_id: [] for run_id in run_ids}

    if run_ids:
        steps = db.scalars(
            select(WorkflowStep)
            .where(WorkflowStep.workflow_run_id.in_(run_ids))
            .order_by(WorkflowStep.started_at.asc())
        ).all()
        for step in steps:
            steps_by_run_id.setdefault(step.workflow_run_id, []).append(step)

    task_ids = [run.task_id for run in runs if run.task_id is not None]
    tasks_by_id = {
        task.id: task
        for task in db.scalars(select(Task).where(Task.id.in_(task_ids))).all()
    } if task_ids else {}

    return WorkflowActivityResponse(
        runs=[
            _workflow_run_read(
                run=run,
                task=tasks_by_id.get(run.task_id or ""),
                steps=steps_by_run_id.get(run.id, []),
            )
            for run in runs
        ]
    )


@router.get("/request-map", response_model=RequestMapResponse)
def get_request_map(
    request_id: str | None = Query(default=None, alias="requestId"),
    task_id: str | None = Query(default=None, alias="taskId"),
    candidate_id: str | None = Query(default=None, alias="candidateId"),
    db: Session = Depends(get_db),
) -> RequestMapResponse:
    seed_agents(db)
    focused_intake_ids = _focused_intake_ids(
        db,
        request_id=request_id,
        task_id=task_id,
        candidate_id=candidate_id,
    )

    intake_items = db.scalars(
        select(IntakeItem)
        .order_by(IntakeItem.created_at.desc())
        .limit(10)
    ).all()
    current_intake_ids = {item.id for item in intake_items}
    missing_focused_ids = [intake_id for intake_id in focused_intake_ids if intake_id not in current_intake_ids]
    if missing_focused_ids:
        focused_items = db.scalars(
            select(IntakeItem).where(IntakeItem.id.in_(missing_focused_ids))
        ).all()
        focused_by_id = {item.id: item for item in focused_items}
        intake_items = [
            focused_by_id[intake_id]
            for intake_id in missing_focused_ids
            if intake_id in focused_by_id
        ] + intake_items
    intake_ids = [item.id for item in intake_items]

    candidates = (
        db.scalars(
            select(CandidateTask)
            .where(CandidateTask.intake_item_id.in_(intake_ids))
            .order_by(CandidateTask.created_at.asc())
        ).all()
        if intake_ids
        else []
    )
    candidates_by_intake_id: dict[str, list[CandidateTask]] = {intake_id: [] for intake_id in intake_ids}
    for candidate in candidates:
        candidates_by_intake_id.setdefault(candidate.intake_item_id, []).append(candidate)
    revision_candidates_by_approval_id = _revision_candidates_by_approval_id(candidates)

    candidate_ids = [candidate.id for candidate in candidates]
    tasks = (
        db.scalars(select(Task).where(Task.candidate_task_id.in_(candidate_ids))).all()
        if candidate_ids
        else []
    )
    tasks_by_candidate_id = {task.candidate_task_id: task for task in tasks if task.candidate_task_id}
    task_ids = [task.id for task in tasks]

    approvals = (
        db.scalars(select(Approval).where(Approval.task_id.in_(task_ids))).all()
        if task_ids
        else []
    )
    approvals_by_task_id = {approval.task_id: approval for approval in approvals}

    runs = (
        db.scalars(
            select(WorkflowRun)
            .where(WorkflowRun.task_id.in_(task_ids))
            .order_by(WorkflowRun.started_at.desc())
        ).all()
        if task_ids
        else []
    )
    runs_by_task_id: dict[str, WorkflowRun] = {}
    for run in runs:
        if run.task_id and run.task_id not in runs_by_task_id:
            runs_by_task_id[run.task_id] = run

    run_ids = [run.id for run in runs]
    steps_by_run_id: dict[str, list[WorkflowStep]] = {run_id: [] for run_id in run_ids}
    if run_ids:
        steps = db.scalars(
            select(WorkflowStep)
            .where(WorkflowStep.workflow_run_id.in_(run_ids))
            .order_by(WorkflowStep.started_at.asc())
        ).all()
        for step in steps:
            steps_by_run_id.setdefault(step.workflow_run_id, []).append(step)

    agents_by_id = {agent.id: agent for agent in db.scalars(select(Agent)).all()}

    return RequestMapResponse(
        items=[
            RequestMapItemRead(
                id=intake.id,
                title=intake.title,
                input_type=intake.input_type,
                raw_preview=_preview(intake.raw_content),
                created_at=intake.created_at,
                decomposition_trace=_safe_node_trace((intake.item_metadata or {}).get("node_trace", [])),
                candidates=[
                    _request_map_task_read(
                        candidate=candidate,
                        task=tasks_by_candidate_id.get(candidate.id),
                        approval=approvals_by_task_id.get(tasks_by_candidate_id.get(candidate.id).id)
                        if tasks_by_candidate_id.get(candidate.id) is not None
                        else None,
                        run=runs_by_task_id.get(tasks_by_candidate_id.get(candidate.id).id)
                        if tasks_by_candidate_id.get(candidate.id) is not None
                        else None,
                        steps_by_run_id=steps_by_run_id,
                        agents_by_id=agents_by_id,
                        revision_candidates_by_approval_id=revision_candidates_by_approval_id,
                        tasks_by_candidate_id=tasks_by_candidate_id,
                        approvals_by_task_id=approvals_by_task_id,
                        runs_by_task_id=runs_by_task_id,
                    )
                    for candidate in candidates_by_intake_id.get(intake.id, [])
                ],
            )
            for intake in intake_items
        ]
    )


def _focused_intake_ids(
    db: Session,
    *,
    request_id: str | None,
    task_id: str | None,
    candidate_id: str | None,
) -> list[str]:
    intake_ids: list[str] = []

    def add_intake_id(value: str | None) -> None:
        if value and value not in intake_ids:
            intake_ids.append(value)

    add_intake_id(request_id)

    if candidate_id:
        candidate = db.get(CandidateTask, candidate_id)
        if candidate is not None:
            add_intake_id(candidate.intake_item_id)

    if task_id:
        task = db.get(Task, task_id)
        if task is not None and task.candidate_task_id:
            candidate = db.get(CandidateTask, task.candidate_task_id)
            if candidate is not None:
                add_intake_id(candidate.intake_item_id)

    return intake_ids


def _request_map_task_read(
    *,
    candidate: CandidateTask,
    task: Task | None,
    approval: Approval | None,
    run: WorkflowRun | None,
    steps_by_run_id: dict[str, list[WorkflowStep]],
    agents_by_id: dict[str, Agent],
    revision_candidates_by_approval_id: dict[str, CandidateTask],
    tasks_by_candidate_id: dict[str, Task],
    approvals_by_task_id: dict[str, Approval],
    runs_by_task_id: dict[str, WorkflowRun],
) -> RequestMapTaskRead:
    steps = steps_by_run_id.get(run.id, []) if run is not None else []
    status = approval.status if approval is not None else task.status if task is not None else candidate.status
    agent_ids = _unique_agents(candidate.recommended_agents, steps)
    metadata = candidate.item_metadata or {}
    is_revision_candidate = metadata.get("source") == "approval_revision"
    revision_candidate = (
        revision_candidates_by_approval_id.get(approval.id)
        if approval is not None
        else None
    )
    revision_candidate_task = (
        tasks_by_candidate_id.get(revision_candidate.id)
        if revision_candidate is not None
        else None
    )
    revision_candidate_run = (
        runs_by_task_id.get(revision_candidate_task.id)
        if revision_candidate_task is not None
        else None
    )
    revision_candidate_approval = (
        approvals_by_task_id.get(revision_candidate_task.id)
        if revision_candidate_task is not None
        else None
    )
    revision_candidate_status = _candidate_status(
        candidate=revision_candidate,
        task=revision_candidate_task,
        approval=revision_candidate_approval,
    )
    revision_reason = (
        _metadata_string(metadata, "revision_reason") if is_revision_candidate else None
    )
    if revision_reason is None and revision_candidate is not None:
        revision_reason = _metadata_string(revision_candidate.item_metadata or {}, "revision_reason")

    return RequestMapTaskRead(
        id=candidate.id,
        task_id=task.id if task is not None else None,
        workflow_run_id=run.id if run is not None else None,
        approval_id=approval.id if approval is not None else None,
        revision_source_approval_id=(
            _metadata_string(metadata, "source_approval_id") if is_revision_candidate else None
        ),
        revision_source_candidate_id=(
            _metadata_string(metadata, "source_candidate_task_id") if is_revision_candidate else None
        ),
        revision_source_task_id=(
            _metadata_string(metadata, "source_task_id") if is_revision_candidate else None
        ),
        revision_reason=revision_reason,
        revision_candidate_id=revision_candidate.id if revision_candidate is not None else None,
        revision_candidate_title=revision_candidate.title if revision_candidate is not None else None,
        revision_candidate_href=(
            f"/?candidateId={revision_candidate.id}" if revision_candidate is not None else None
        ),
        revision_candidate_status=revision_candidate_status,
        revision_candidate_task_id=revision_candidate_task.id if revision_candidate_task is not None else None,
        revision_candidate_workflow_run_id=revision_candidate_run.id if revision_candidate_run is not None else None,
        revision_candidate_activity_href=(
            f"/activity?taskId={revision_candidate_task.id}" if revision_candidate_task is not None else None
        ),
        revision_candidate_approval_id=(
            revision_candidate_approval.id if revision_candidate_approval is not None else None
        ),
        revision_candidate_approval_href=(
            f"/approvals?approvalId={revision_candidate_approval.id}"
            if revision_candidate_approval is not None
            else None
        ),
        task_type=candidate.task_type,
        title=candidate.title,
        summary=candidate.summary,
        status=status,
        current_step=run.current_step if run is not None else None,
        current_step_index=_workflow_step_index(run.current_step if run is not None else None, status),
        total_steps=len(WORKFLOW_STEP_ORDER) - 1,
        href=(
            f"/approvals?approvalId={approval.id}"
            if approval is not None
            else f"/?candidateId={candidate.id}"
        ),
        activity_href=f"/activity?taskId={task.id}" if task is not None else None,
        agents=[
            RequestMapAgentRead(
                id=agent_id,
                display_name=agents_by_id[agent_id].display_name if agent_id in agents_by_id else agent_id,
                color=agents_by_id[agent_id].color if agent_id in agents_by_id else "#38BDF8",
                status=agents_by_id[agent_id].status if agent_id in agents_by_id else "active",
            )
            for agent_id in agent_ids
        ],
        steps=[
            WorkflowStepRead(
                id=step.id,
                step_name=step.step_name,
                agent_id=step.agent_id,
                input_summary=step.input_summary,
                output_summary=step.output_summary,
                status=step.status,
                started_at=step.started_at,
                completed_at=step.completed_at,
            )
            for step in steps
        ],
    )


def _candidate_status(
    *,
    candidate: CandidateTask | None,
    task: Task | None,
    approval: Approval | None,
) -> str | None:
    if approval is not None:
        return approval.status
    if task is not None:
        return task.status
    if candidate is not None:
        return candidate.status
    return None


def _revision_candidates_by_approval_id(candidates: list[CandidateTask]) -> dict[str, CandidateTask]:
    revision_candidates: dict[str, CandidateTask] = {}
    for candidate in candidates:
        metadata = candidate.item_metadata or {}
        if metadata.get("source") != "approval_revision":
            continue

        source_approval_id = _metadata_string(metadata, "source_approval_id")
        if source_approval_id is not None:
            revision_candidates[source_approval_id] = candidate

    return revision_candidates


def _metadata_string(metadata: dict, key: str) -> str | None:
    value = metadata.get(key)
    return value if isinstance(value, str) and value else None


def _unique_agents(recommended_agents: list | None, steps: list[WorkflowStep]) -> list[str]:
    agent_ids: list[str] = []
    for agent_id in recommended_agents or []:
        if isinstance(agent_id, str) and agent_id and agent_id not in agent_ids:
            agent_ids.append(agent_id)

    for step in steps:
        if step.agent_id and step.agent_id not in agent_ids:
            agent_ids.append(step.agent_id)

    return agent_ids


def _workflow_step_index(current_step: str | None, status: str) -> int:
    if current_step in WORKFLOW_STEP_ORDER:
        return WORKFLOW_STEP_ORDER.index(current_step)
    if status == "draft":
        return 1
    if status == "pending_approval":
        return len(WORKFLOW_STEP_ORDER) - 1
    if status in {"approved", "rejected", "revise_requested"}:
        return len(WORKFLOW_STEP_ORDER)
    return 0


def _safe_node_trace(value: object) -> list[dict]:
    if not isinstance(value, list):
        return []

    return [
        node
        for node in value
        if isinstance(node, dict)
        and isinstance(node.get("name"), str)
        and isinstance(node.get("status"), str)
        and isinstance(node.get("summary"), str)
    ]


def _preview(value: str, limit: int = 140) -> str:
    normalized = " ".join(value.split())
    if len(normalized) <= limit:
        return normalized
    return f"{normalized[:limit].rstrip()}..."


def _count(db: Session, statement) -> int:
    return int(db.scalar(statement) or 0)


def _agent_activity(
    *,
    agent: Agent,
    tasks: list[Task],
    pending_approval_task_ids: set[str],
    approvals_by_task_id: dict[str, Approval],
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
    work_items = _work_items(
        running_tasks=running_tasks,
        waiting_tasks=waiting_tasks,
        queued_candidates=queued_candidates,
        approvals_by_task_id=approvals_by_task_id,
    )

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
        work_items=work_items,
    )


def _contains(agent_id: str, values: list | None) -> bool:
    return agent_id in (values or [])


def _workflow_run_read(
    *,
    run: WorkflowRun,
    task: Task | None,
    steps: list[WorkflowStep],
) -> WorkflowRunRead:
    checkpoint = run.checkpoint or {}
    node_trace = checkpoint.get("node_trace", [])
    return WorkflowRunRead(
        id=run.id,
        workflow_type=run.workflow_type,
        task_id=run.task_id,
        task_title=task.title if task is not None else None,
        task_type=task.task_type if task is not None else None,
        status=run.status,
        current_step=run.current_step,
        graph_name=checkpoint.get("graph_name") if isinstance(checkpoint.get("graph_name"), str) else None,
        started_at=run.started_at,
        completed_at=run.completed_at,
        node_trace=[
            node
            for node in node_trace
            if isinstance(node, dict)
            and isinstance(node.get("name"), str)
            and isinstance(node.get("status"), str)
            and isinstance(node.get("summary"), str)
        ],
        steps=[
            WorkflowStepRead(
                id=step.id,
                step_name=step.step_name,
                agent_id=step.agent_id,
                input_summary=step.input_summary,
                output_summary=step.output_summary,
                status=step.status,
                started_at=step.started_at,
                completed_at=step.completed_at,
            )
            for step in steps
        ],
    )


def _work_items(
    *,
    running_tasks: list[Task],
    waiting_tasks: list[Task],
    queued_candidates: list[CandidateTask],
    approvals_by_task_id: dict[str, Approval],
) -> list[AgentWorkItemRead]:
    items: list[AgentWorkItemRead] = []

    for task in waiting_tasks:
        approval = approvals_by_task_id.get(task.id)
        if approval is not None:
            items.append(
                AgentWorkItemRead(
                    id=approval.id,
                    source_type="approval",
                    title=approval.title,
                    summary=approval.summary,
                    task_type=task.task_type,
                    status=approval.status,
                    href=f"/approvals?approvalId={approval.id}",
                    activity_href=f"/activity?taskId={task.id}",
                )
            )
        else:
            task_href = (
                f"/?candidateId={task.candidate_task_id}"
                if task.candidate_task_id
                else f"/?taskId={task.id}"
            )
            items.append(
                AgentWorkItemRead(
                    id=task.id,
                    source_type="task",
                    title=task.title,
                    summary=task.description,
                    task_type=task.task_type,
                    status=task.status,
                    href=task_href,
                    activity_href=f"/activity?taskId={task.id}",
                )
            )

    for task in running_tasks:
        task_href = (
            f"/?candidateId={task.candidate_task_id}"
            if task.candidate_task_id
            else f"/?taskId={task.id}"
        )
        items.append(
            AgentWorkItemRead(
                id=task.id,
                source_type="task",
                title=task.title,
                summary=task.description,
                task_type=task.task_type,
                status=task.status,
                href=task_href,
                activity_href=f"/activity?taskId={task.id}",
            )
        )

    for candidate in queued_candidates:
        items.append(
            AgentWorkItemRead(
                id=candidate.id,
                source_type="candidate",
                title=candidate.title,
                summary=candidate.summary,
                task_type=candidate.task_type,
                status=candidate.status,
                href=f"/?candidateId={candidate.id}",
                activity_href=None,
            )
        )

    return items[:6]
