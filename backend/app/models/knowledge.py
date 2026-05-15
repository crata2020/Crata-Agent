from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class KnowledgeItem(Base):
    __tablename__ = "knowledge_items"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: uuid4().hex)
    knowledge_type: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="draft", index=True)
    source_artifact_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("artifacts.id"), nullable=True
    )
    source_approval_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("approvals.id"), nullable=True
    )
    item_metadata: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: uuid4().hex)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    document_type: Mapped[str] = mapped_column(String(80), nullable=False)
    path: Mapped[str] = mapped_column(String(500), default="")
    content_text: Mapped[str] = mapped_column(Text, default="")
    item_metadata: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Embedding(Base):
    __tablename__ = "embeddings"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: uuid4().hex)
    owner_type: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    owner_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    embedding: Mapped[list[float] | None] = mapped_column(JSON, nullable=True)
    text_chunk: Mapped[str] = mapped_column(Text, nullable=False)
    item_metadata: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
