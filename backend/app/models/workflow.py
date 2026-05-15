from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class WorkflowRun(Base):
    __tablename__ = "workflow_runs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: uuid4().hex)
    workflow_type: Mapped[str] = mapped_column(String(64))
    task_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("tasks.id"), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(64), index=True, default="running")
    current_step: Mapped[str] = mapped_column(String(128), default="")
    checkpoint: Mapped[dict] = mapped_column(JSON, default=dict)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    error: Mapped[str] = mapped_column(Text, default="")


class WorkflowStep(Base):
    __tablename__ = "workflow_steps"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: uuid4().hex)
    workflow_run_id: Mapped[str] = mapped_column(String(64), ForeignKey("workflow_runs.id"), index=True)
    step_name: Mapped[str] = mapped_column(String(128))
    agent_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("agents.id"), nullable=True)
    input_summary: Mapped[str] = mapped_column(Text, default="")
    output_summary: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(64), default="completed")
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    item_metadata: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
