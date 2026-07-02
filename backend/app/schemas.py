from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    name: str
    headline: str
    company: str
    linkedin_connected: bool
    linkedin_url: str
    avatar_data: str
    avatar_url: str
    profile_completed: bool
    created_at: datetime


class UserUpdate(BaseModel):
    name: Optional[str] = None
    headline: Optional[str] = None
    company: Optional[str] = None
    linkedin_connected: Optional[bool] = None
    linkedin_url: Optional[str] = None
    avatar_data: Optional[str] = None
    profile_completed: Optional[bool] = None


class LoginIn(BaseModel):
    # Placeholder auth: the values are accepted but never checked.
    username: str = ""
    password: str = ""
    name: Optional[str] = None


class EventCreate(BaseModel):
    title: str
    description: str = ""
    category: str = "Social"
    venue: str = ""
    address: str = ""
    lat: float
    lng: float
    starts_at: datetime
    duration_minutes: int = 120
    capacity: int = 50
    cover_url: str = ""
    # Which company's dashboard created it; the host user is derived from this.
    host_company: Optional[str] = None


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    venue: Optional[str] = None
    address: Optional[str] = None
    starts_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    capacity: Optional[int] = None
    cover_url: Optional[str] = None


class EventOut(BaseModel):
    id: int
    title: str
    description: str
    category: str
    venue: str
    address: str
    lat: float
    lng: float
    starts_at: datetime
    duration_minutes: int
    capacity: int
    cover_url: str
    going: int
    is_registered: bool
    distance_km: Optional[float] = None
    host: Optional[Dict[str, Any]] = None
    attendees: List[Dict[str, Any]] = []
    companies: List[Dict[str, Any]] = []
    schedule: List[Dict[str, Any]] = []
    content_blocks: List[Dict[str, Any]] = []
