"""ensure one task per candidate task

Revision ID: 0002_unique_task_candidate
Revises: 0001_initial
Create Date: 2026-05-15
"""

from alembic import op


revision = "0002_unique_task_candidate"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_unique_constraint("uq_tasks_candidate_task_id", "tasks", ["candidate_task_id"])


def downgrade() -> None:
    op.drop_constraint("uq_tasks_candidate_task_id", "tasks", type_="unique")
