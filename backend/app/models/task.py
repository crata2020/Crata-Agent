from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models._time import utcnow


class Task(Base):
    __tablename__ = "tasks"
    __table_args__ = (UniqueConstraint("candidate_task_id", name="uq_tasks_candidate_task_id"),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: uuid4().hex)
    candidate_task_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("candidate_tasks.id"), nullable=True
    )
    task_type: Mapped[str] = mapped_column(String(64), index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(64), index=True, default="draft")
    priority: Mapped[str] = mapped_column(String(64), default="normal")
    assigned_agents: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)
