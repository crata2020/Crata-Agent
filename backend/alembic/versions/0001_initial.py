"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-05-15
"""

from alembic import op
import sqlalchemy as sa


revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


JSON_OBJECT_DEFAULT = sa.text("'{}'::json")
JSON_ARRAY_DEFAULT = sa.text("'[]'::json")


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "agents",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("display_name", sa.String(length=128), nullable=False),
        sa.Column("role", sa.String(length=128), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(length=64), nullable=False, server_default="idle"),
        sa.Column("default_model_provider", sa.String(length=64), nullable=False, server_default="openai"),
        sa.Column("default_model_name", sa.String(length=128), nullable=False, server_default="gpt-4.1-mini"),
        sa.Column("prompt", sa.Text(), nullable=False, server_default=""),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("color", sa.String(length=32), nullable=False, server_default="#1F6B57"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_agents_status"), "agents", ["status"], unique=False)

    op.create_table(
        "intake_items",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("input_type", sa.String(length=64), nullable=False),
        sa.Column("raw_content", sa.Text(), nullable=False),
        sa.Column("source", sa.String(length=128), nullable=False, server_default="manual"),
        sa.Column("metadata", sa.JSON(), nullable=False, server_default=JSON_OBJECT_DEFAULT),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "settings",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("key", sa.String(length=160), nullable=False),
        sa.Column("value", sa.Text(), nullable=False, server_default=""),
        sa.Column("is_secret", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_settings_key", "settings", ["key"], unique=True)

    op.create_table(
        "documents",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("document_type", sa.String(length=80), nullable=False),
        sa.Column("path", sa.String(length=500), nullable=False, server_default=""),
        sa.Column("content_text", sa.Text(), nullable=False, server_default=""),
        sa.Column("metadata", sa.JSON(), nullable=False, server_default=JSON_OBJECT_DEFAULT),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "candidate_tasks",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("intake_item_id", sa.String(length=64), nullable=False),
        sa.Column("task_type", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("evidence_excerpt", sa.Text(), nullable=False, server_default=""),
        sa.Column("recommended_agents", sa.JSON(), nullable=False, server_default=JSON_ARRAY_DEFAULT),
        sa.Column("status", sa.String(length=64), nullable=False, server_default="draft"),
        sa.Column("metadata", sa.JSON(), nullable=False, server_default=JSON_OBJECT_DEFAULT),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["intake_item_id"], ["intake_items.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_candidate_tasks_intake_item_id"), "candidate_tasks", ["intake_item_id"], unique=False)
    op.create_index(op.f("ix_candidate_tasks_status"), "candidate_tasks", ["status"], unique=False)
    op.create_index(op.f("ix_candidate_tasks_task_type"), "candidate_tasks", ["task_type"], unique=False)

    op.create_table(
        "embeddings",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("owner_type", sa.String(length=80), nullable=False),
        sa.Column("owner_id", sa.String(length=64), nullable=False),
        sa.Column("embedding", sa.JSON(), nullable=True),
        sa.Column("text_chunk", sa.Text(), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=False, server_default=JSON_OBJECT_DEFAULT),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_embeddings_owner_id", "embeddings", ["owner_id"], unique=False)
    op.create_index("ix_embeddings_owner_type", "embeddings", ["owner_type"], unique=False)

    op.create_table(
        "tasks",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("candidate_task_id", sa.String(length=64), nullable=True),
        sa.Column("task_type", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(length=64), nullable=False, server_default="draft"),
        sa.Column("priority", sa.String(length=64), nullable=False, server_default="normal"),
        sa.Column("assigned_agents", sa.JSON(), nullable=False, server_default=JSON_ARRAY_DEFAULT),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["candidate_task_id"], ["candidate_tasks.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_tasks_status"), "tasks", ["status"], unique=False)
    op.create_index(op.f("ix_tasks_task_type"), "tasks", ["task_type"], unique=False)

    op.create_table(
        "workflow_runs",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("workflow_type", sa.String(length=64), nullable=False),
        sa.Column("task_id", sa.String(length=64), nullable=True),
        sa.Column("status", sa.String(length=64), nullable=False, server_default="running"),
        sa.Column("current_step", sa.String(length=128), nullable=False, server_default=""),
        sa.Column("checkpoint", sa.JSON(), nullable=False, server_default=JSON_OBJECT_DEFAULT),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("error", sa.Text(), nullable=False, server_default=""),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_workflow_runs_status"), "workflow_runs", ["status"], unique=False)
    op.create_index(op.f("ix_workflow_runs_task_id"), "workflow_runs", ["task_id"], unique=False)

    op.create_table(
        "artifacts",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("task_id", sa.String(length=64), nullable=False),
        sa.Column("workflow_run_id", sa.String(length=64), nullable=True),
        sa.Column("artifact_type", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=64), nullable=False, server_default="draft"),
        sa.Column("metadata", sa.JSON(), nullable=False, server_default=JSON_OBJECT_DEFAULT),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"]),
        sa.ForeignKeyConstraint(["workflow_run_id"], ["workflow_runs.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_artifacts_status"), "artifacts", ["status"], unique=False)
    op.create_index(op.f("ix_artifacts_task_id"), "artifacts", ["task_id"], unique=False)

    op.create_table(
        "workflow_steps",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("workflow_run_id", sa.String(length=64), nullable=False),
        sa.Column("step_name", sa.String(length=128), nullable=False),
        sa.Column("agent_id", sa.String(length=64), nullable=True),
        sa.Column("input_summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("output_summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(length=64), nullable=False, server_default="completed"),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=False, server_default=JSON_OBJECT_DEFAULT),
        sa.ForeignKeyConstraint(["agent_id"], ["agents.id"]),
        sa.ForeignKeyConstraint(["workflow_run_id"], ["workflow_runs.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_workflow_steps_workflow_run_id"), "workflow_steps", ["workflow_run_id"], unique=False)

    op.create_table(
        "approvals",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("task_id", sa.String(length=64), nullable=False),
        sa.Column("artifact_id", sa.String(length=64), nullable=False),
        sa.Column("approval_type", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=64), nullable=False, server_default="pending_approval"),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("before_content", sa.Text(), nullable=False, server_default=""),
        sa.Column("after_content", sa.Text(), nullable=False, server_default=""),
        sa.Column("affected_area", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("reviewer_note", sa.Text(), nullable=False, server_default=""),
        sa.Column("decision_reason", sa.Text(), nullable=False, server_default=""),
        sa.Column("decided_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["artifact_id"], ["artifacts.id"]),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_approvals_artifact_id"), "approvals", ["artifact_id"], unique=False)
    op.create_index(op.f("ix_approvals_status"), "approvals", ["status"], unique=False)
    op.create_index(op.f("ix_approvals_task_id"), "approvals", ["task_id"], unique=False)

    op.create_table(
        "knowledge_items",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("knowledge_type", sa.String(length=80), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="draft"),
        sa.Column("source_artifact_id", sa.String(length=64), nullable=True),
        sa.Column("source_approval_id", sa.String(length=64), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=False, server_default=JSON_OBJECT_DEFAULT),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["source_approval_id"], ["approvals.id"]),
        sa.ForeignKeyConstraint(["source_artifact_id"], ["artifacts.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_knowledge_items_knowledge_type", "knowledge_items", ["knowledge_type"], unique=False)
    op.create_index("ix_knowledge_items_status", "knowledge_items", ["status"], unique=False)


def downgrade() -> None:
    op.drop_table("knowledge_items")
    op.drop_table("approvals")
    op.drop_table("workflow_steps")
    op.drop_table("artifacts")
    op.drop_table("workflow_runs")
    op.drop_table("tasks")
    op.drop_table("embeddings")
    op.drop_table("candidate_tasks")
    op.drop_table("documents")
    op.drop_table("settings")
    op.drop_table("intake_items")
    op.drop_table("agents")
    op.execute("DROP EXTENSION IF EXISTS vector")
