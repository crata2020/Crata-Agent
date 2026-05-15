import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Agent, CandidateTask, IntakeItem, Task, WorkflowRun


def test_agent_minimal_insert_uses_empty_text_defaults(db_session: Session) -> None:
    agent = Agent(name="concept_guardian", display_name="Concept Guardian", role="Knowledge guard")

    db_session.add(agent)
    db_session.commit()
    db_session.refresh(agent)

    assert agent.description == ""
    assert agent.prompt == ""


def test_workflow_run_minimal_insert_uses_empty_text_defaults(db_session: Session) -> None:
    workflow_run = WorkflowRun(workflow_type="approval_generation")

    db_session.add(workflow_run)
    db_session.commit()
    db_session.refresh(workflow_run)

    assert workflow_run.current_step == ""
    assert workflow_run.error == ""


def test_sqlite_fixture_enforces_foreign_keys(db_session: Session) -> None:
    workflow_run = WorkflowRun(
        workflow_type="approval_generation",
        task_id="missing-task",
        current_step="",
        error="",
    )

    db_session.add(workflow_run)

    with pytest.raises(IntegrityError) as exc_info:
        db_session.commit()

    assert "FOREIGN KEY constraint failed" in str(exc_info.value)


def test_task_candidate_task_id_is_unique_when_present(db_session: Session) -> None:
    intake_item = IntakeItem(title="Memo", input_type="memo", raw_content="content")
    db_session.add(intake_item)
    db_session.flush()
    candidate_task = CandidateTask(
        intake_item_id=intake_item.id,
        task_type="general_agent_task",
        title="Candidate",
        summary="summary",
        recommended_agents=["crata_ceo"],
    )
    db_session.add(candidate_task)
    db_session.flush()
    db_session.add(
        Task(
            candidate_task_id=candidate_task.id,
            task_type="general_agent_task",
            title="First",
        )
    )
    db_session.add(
        Task(
            candidate_task_id=candidate_task.id,
            task_type="general_agent_task",
            title="Second",
        )
    )

    with pytest.raises(IntegrityError):
        db_session.commit()
