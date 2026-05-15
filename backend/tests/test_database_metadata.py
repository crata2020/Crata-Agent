from sqlalchemy import inspect
from sqlalchemy.orm import Session

from app.core.database import Base


def test_db_session_fixture_creates_mvp_tables(db_session: Session) -> None:
    expected_tables = {
        "agents",
        "intake_items",
        "candidate_tasks",
        "tasks",
        "workflow_runs",
        "workflow_steps",
        "artifacts",
        "approvals",
        "knowledge_items",
        "documents",
        "embeddings",
        "office_settings",
    }

    assert expected_tables.issubset(set(Base.metadata.tables))
    assert expected_tables.issubset(set(inspect(db_session.bind).get_table_names()))
