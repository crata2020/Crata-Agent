from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models import Approval, Artifact, CandidateTask, Task, WorkflowRun, WorkflowStep
from app.services.agent_operation_graph import run_agent_operation_graph
from app.services.knowledge_context import load_task_knowledge_context
from app.services.model_gateway import ModelGateway
from app.services.output_guard import validate_output


@dataclass(frozen=True)
class WorkflowResult:
    workflow_run_id: str
    artifact_id: str
    approval_id: str
    status: str


def run_task_workflow(db: Session, task_id: str) -> WorkflowResult:
    task = db.get(Task, task_id)
    if task is None:
        raise ValueError(f"Task not found: {task_id}")

    run = WorkflowRun(
        workflow_type="agent_operation",
        task_id=task.id,
        status="running",
        current_step="ceo_routing",
        checkpoint={
            "task_type": task.task_type,
            "assigned_agents": task.assigned_agents,
        },
    )
    db.add(run)
    db.flush()

    knowledge_context = load_task_knowledge_context(
        task_type=task.task_type,
        assigned_agents=task.assigned_agents,
        query=_knowledge_query(task),
    )
    operation_graph = run_agent_operation_graph(
        task_type=task.task_type,
        assigned_agents=task.assigned_agents or [],
        knowledge_references=knowledge_context.references,
    )
    run.checkpoint = {
        "task_type": task.task_type,
        "assigned_agents": task.assigned_agents,
        **operation_graph.metadata(),
    }

    for planned_step in operation_graph.steps:
        step_metadata = {}
        if planned_step.step_name == "context_retrieval":
            step_metadata = {"knowledge_references": knowledge_context.references}

        db.add(
            WorkflowStep(
                workflow_run_id=run.id,
                step_name=planned_step.step_name,
                agent_id=planned_step.agent_id,
                input_summary=task.title,
                output_summary=planned_step.output_summary,
                status="completed",
                completed_at=_utcnow(),
                item_metadata=step_metadata,
            )
        )

    draft = ModelGateway().draft(
        task_title=task.title,
        task_type=task.task_type,
        context=_build_model_context(db=db, task=task, knowledge_context=knowledge_context.text),
    )
    quality_guard = validate_output(
        task_type=task.task_type,
        workflow_plan=knowledge_context.workflow_plan,
        draft=draft,
    )
    artifact = Artifact(
        task_id=task.id,
        workflow_run_id=run.id,
        artifact_type="draft",
        title=f"{task.title} 초안",
        content=draft,
        status="pending_approval",
        item_metadata={
            "generated_by": "workflow_runner",
            "knowledge_references": knowledge_context.references,
            "workflow_plan": knowledge_context.workflow_plan,
            "quality_guard": quality_guard.to_dict(),
        },
    )
    db.add(artifact)
    db.flush()

    approval = Approval(
        task_id=task.id,
        artifact_id=artifact.id,
        approval_type=_approval_type(task.task_type),
        status="pending_approval",
        title=f"{task.title} 승인 요청",
        summary="에이전트 작업 결과가 승인 대기 상태입니다.",
        before_content="",
        after_content=draft,
        affected_area=task.task_type,
        reviewer_note=_reviewer_note(quality_guard.to_dict()),
    )
    db.add(approval)
    db.flush()

    task.status = "pending_approval"
    run.status = "pending_approval"
    run.current_step = "approval_pending"
    run.completed_at = _utcnow()
    db.commit()

    return WorkflowResult(
        workflow_run_id=run.id,
        artifact_id=artifact.id,
        approval_id=approval.id,
        status="pending_approval",
    )


def _approval_type(task_type: str) -> str:
    return {
        "report_phrase_revision": "report_phrase_change",
        "counseling_case_learning": "learning_candidate",
    }.get(task_type, "general_review")


def _reviewer_note(quality_guard: dict) -> str:
    issues = quality_guard.get("issues") or []
    if issues:
        return "검수 이슈: " + "; ".join(str(issue) for issue in issues)
    return "공식 반영 전 청하님 검토가 필요합니다."


def _knowledge_query(task: Task) -> str:
    return "\n".join(
        part
        for part in (
            task.title,
            task.description,
            task.task_type,
            " ".join(task.assigned_agents or []),
        )
        if part
    )


def _build_model_context(*, db: Session, task: Task, knowledge_context: str) -> str:
    clarifying_questions = _candidate_clarifying_questions(db, task)
    clarifying_answers = _candidate_clarifying_answers(db, task)
    question_context = ""
    if clarifying_questions:
        formatted_questions = "\n".join(
            f"{index}. {question}"
            for index, question in enumerate(clarifying_questions, start=1)
        )
        question_context = f"\n# 먼저 확인할 질문\n\n{formatted_questions}\n"
    if clarifying_answers:
        question_context += f"\n# 질문 답변 / 추가 메모\n\n{clarifying_answers}\n"

    return (
        "# 사용자 작업\n\n"
        f"제목: {task.title}\n"
        f"작업 유형: {task.task_type}\n"
        f"설명: {task.description}\n"
        f"배정 에이전트: {', '.join(task.assigned_agents or [])}\n\n"
        f"{question_context}"
        f"{knowledge_context}"
    )


def _candidate_clarifying_questions(db: Session, task: Task) -> list[str]:
    if not task.candidate_task_id:
        return []

    candidate = db.get(CandidateTask, task.candidate_task_id)
    if candidate is None:
        return []

    questions = (candidate.item_metadata or {}).get("clarifying_questions", [])
    if not isinstance(questions, list):
        return []

    return [question for question in questions if isinstance(question, str) and question.strip()]


def _candidate_clarifying_answers(db: Session, task: Task) -> str:
    if not task.candidate_task_id:
        return ""

    candidate = db.get(CandidateTask, task.candidate_task_id)
    if candidate is None:
        return ""

    answers = (candidate.item_metadata or {}).get("clarifying_answers", "")
    return answers.strip() if isinstance(answers, str) else ""


def _utcnow() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)
