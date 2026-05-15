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
        "settings",
    }

    assert expected_tables.issubset(set(Base.metadata.tables))
    assert expected_tables.issubset(set(inspect(db_session.bind).get_table_names()))


def test_metadata_uses_plan_columns() -> None:
    assert set(Base.metadata.tables["knowledge_items"].columns.keys()) == {
        "id",
        "knowledge_type",
        "title",
        "content",
        "status",
        "source_artifact_id",
        "source_approval_id",
        "metadata",
        "created_at",
        "updated_at",
    }
    assert set(Base.metadata.tables["documents"].columns.keys()) == {
        "id",
        "title",
        "document_type",
        "path",
        "content_text",
        "metadata",
        "created_at",
    }
    assert set(Base.metadata.tables["embeddings"].columns.keys()) == {
        "id",
        "owner_type",
        "owner_id",
        "embedding",
        "text_chunk",
        "metadata",
        "created_at",
    }
    assert set(Base.metadata.tables["settings"].columns.keys()) == {
        "id",
        "key",
        "value",
        "is_secret",
        "updated_at",
    }


def test_metadata_uses_plan_indexes() -> None:
    index_names_by_table = {
        table_name: {index.name for index in table.indexes}
        for table_name, table in Base.metadata.tables.items()
    }

    assert {"ix_knowledge_items_knowledge_type", "ix_knowledge_items_status"}.issubset(
        index_names_by_table["knowledge_items"]
    )
    assert {"ix_embeddings_owner_type", "ix_embeddings_owner_id"}.issubset(index_names_by_table["embeddings"])
    assert "ix_settings_key" in index_names_by_table["settings"]
