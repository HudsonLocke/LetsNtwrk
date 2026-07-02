from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    name: Mapped[str] = mapped_column(String(120), default="")
    headline: Mapped[str] = mapped_column(String(160), default="")
    company: Mapped[str] = mapped_column(String(120), default="")
    linkedin_connected: Mapped[bool] = mapped_column(Boolean, default=False)
    linkedin_url: Mapped[str] = mapped_column(String(255), default="")
    # Placeholder avatar storage: uploaded photos live as a small data-URL on
    # the row; seeded attendees just point at a generated-avatar URL.
    avatar_data: Mapped[str] = mapped_column(Text, default="")
    avatar_url: Mapped[str] = mapped_column(String(500), default="")
    profile_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    registrations: Mapped[List["Registration"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(50), default="Social")
    venue: Mapped[str] = mapped_column(String(200), default="")
    address: Mapped[str] = mapped_column(String(255), default="")
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    starts_at: Mapped[datetime] = mapped_column(DateTime)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=120)
    capacity: Mapped[int] = mapped_column(Integer, default=50)
    cover_url: Mapped[str] = mapped_column(String(500), default="")
    host_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    # Rich page content, kept as JSON while everything is placeholder:
    # schedule = [{"time": "6:00 PM", "title": "..."}]
    # content_blocks = [{"type": "text"|"image", "text"|"url", "caption"}]
    schedule: Mapped[list] = mapped_column(JSON, default=list)
    content_blocks: Mapped[list] = mapped_column(JSON, default=list)
    is_placeholder: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    registrations: Mapped[List["Registration"]] = relationship(
        back_populates="event", cascade="all, delete-orphan"
    )
    host: Mapped[Optional["User"]] = relationship(foreign_keys=[host_id])


class Registration(Base):
    __tablename__ = "registrations"
    __table_args__ = (UniqueConstraint("user_id", "event_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    user: Mapped["User"] = relationship(back_populates="registrations")
    event: Mapped["Event"] = relationship(back_populates="registrations")
