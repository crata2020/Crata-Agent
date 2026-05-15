from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AppSetting(Base):
    __tablename__ = "settings"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: uuid4().hex)
    key: Mapped[str] = mapped_column(String(160), nullable=False, unique=True, index=True)
    value: Mapped[str] = mapped_column(Text, default="")
    is_secret: Mapped[bool] = mapped_column(Boolean, default=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
