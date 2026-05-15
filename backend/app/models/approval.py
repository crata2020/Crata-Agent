from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Approval(Base):
    __tablename__ = "approvals"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: uuid4().hex)
    task_id: Mapped[str] = mapped_column(String(64), ForeignKey("tasks.id"), index=True)
    artifact_id: Mapped[str] = mapped_column(String(64), ForeignKey("artifacts.id"), index=True)
    approval_type: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(64), index=True, default="pending_approval")
    title: Mapped[str] = mapped_column(String(255))
    summary: Mapped[str] = mapped_column(Text)
    before_content: Mapped[str] = mapped_column(Text)
    after_content: Mapped[str] = mapped_column(Text)
    affected_area: Mapped[str] = mapped_column(String(255))
    reviewer_note: Mapped[str] = mapped_column(Text)
    decision_reason: Mapped[str] = mapped_column(Text)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
