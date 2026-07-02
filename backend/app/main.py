from collections import Counter
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import List, Optional, Tuple

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from .database import Base, SessionLocal, engine, get_db
from .models import Event, Registration, User
from .schemas import EventCreate, EventOut, EventUpdate, LoginIn, UserOut, UserUpdate
from .seed import (
    TEST_USER_EMAIL,
    ensure_events_near,
    haversine_km,
    seed_baseline,
    slugify,
)

EVENT_LOADS = (
    selectinload(Event.registrations).selectinload(Registration.user),
    selectinload(Event.host),
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed_baseline(db)
    yield


app = FastAPI(title="LetsNtwrk API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_current_user(db: Session) -> User:
    """Placeholder auth: every request acts as the seeded test account."""
    user = db.scalar(select(User).where(User.email == TEST_USER_EMAIL))
    if user is None:
        raise HTTPException(status_code=500, detail="Test user is not seeded")
    return user


def get_event_or_404(db: Session, event_id: int) -> Event:
    event = db.get(Event, event_id, options=list(EVENT_LOADS))
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


def person_payload(person: User) -> dict:
    return {
        "id": person.id,
        "name": person.name,
        "headline": person.headline,
        "company": person.company,
        "avatar_url": person.avatar_url,
        "avatar_data": person.avatar_data,
        "linkedin_url": person.linkedin_url,
    }


def companies_going(event: Event) -> list:
    people = {}
    for reg in event.registrations:
        if reg.user is not None:
            people[reg.user.id] = reg.user
    if event.host is not None:
        people.setdefault(event.host.id, event.host)
    counter = Counter(p.company for p in people.values() if p.company)
    return [{"name": name, "count": count} for name, count in counter.most_common(12)]


def event_payload(
    event: Event, user: User, origin: Optional[Tuple[float, float]] = None
) -> dict:
    distance_km = None
    if origin is not None:
        distance_km = round(haversine_km(origin[0], origin[1], event.lat, event.lng), 2)
    return {
        "id": event.id,
        "title": event.title,
        "description": event.description,
        "category": event.category,
        "venue": event.venue,
        "address": event.address,
        "lat": event.lat,
        "lng": event.lng,
        "starts_at": event.starts_at,
        "duration_minutes": event.duration_minutes,
        "capacity": event.capacity,
        "cover_url": event.cover_url,
        "going": len(event.registrations),
        "is_registered": any(r.user_id == user.id for r in event.registrations),
        "distance_km": distance_km,
        "host": person_payload(event.host) if event.host is not None else None,
        "attendees": [
            person_payload(r.user) for r in event.registrations if r.user is not None
        ],
        "companies": companies_going(event),
        "schedule": event.schedule or [],
        "content_blocks": event.content_blocks or [],
    }


def parse_origin(lat: Optional[float], lng: Optional[float]) -> Optional[Tuple[float, float]]:
    if lat is None or lng is None:
        return None
    return (lat, lng)


@app.get("/api/health")
def health():
    return {"ok": True}


@app.post("/api/auth/login", response_model=UserOut)
@app.post("/api/auth/signup", response_model=UserOut)
def auth_login(credentials: LoginIn, db: Session = Depends(get_db)):
    """Placeholder auth: accepts any username/password (existing account or
    not) and signs the visitor in as the regular test account. Real
    credential checks come later."""
    return get_current_user(db)


@app.get("/api/companies")
def list_companies(db: Session = Depends(get_db)):
    """Companies of seeded members with how many events each hosts — feeds the
    testing-mode company picker on the sign-in page."""
    rows = db.execute(
        select(User.company, func.count(func.distinct(Event.id)))
        .join(Event, Event.host_id == User.id, isouter=True)
        .where(User.company != "")
        .group_by(User.company)
    ).all()
    companies = [{"name": name, "events": int(count)} for name, count in rows]
    companies.sort(key=lambda c: (-c["events"], c["name"].lower()))
    return companies


@app.get("/api/me", response_model=UserOut)
def get_me(db: Session = Depends(get_db)):
    return get_current_user(db)


@app.patch("/api/me", response_model=UserOut)
def update_me(update: UserUpdate, db: Session = Depends(get_db)):
    user = get_current_user(db)
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@app.get("/api/events", response_model=List[EventOut])
def list_events(
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius_km: float = 80,
    db: Session = Depends(get_db),
):
    user = get_current_user(db)
    origin = parse_origin(lat, lng)
    if origin is not None:
        ensure_events_near(db, origin[0], origin[1])

    events = db.scalars(
        select(Event)
        .options(*EVENT_LOADS)
        .where(Event.starts_at > datetime.now())
        .order_by(Event.starts_at)
    ).all()

    payloads = [event_payload(e, user, origin) for e in events]
    if origin is not None:
        payloads = [p for p in payloads if p["distance_km"] <= radius_km]
    return payloads


@app.get("/api/events/{event_id}", response_model=EventOut)
def get_event(
    event_id: int,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    db: Session = Depends(get_db),
):
    user = get_current_user(db)
    event = get_event_or_404(db, event_id)
    return event_payload(event, user, parse_origin(lat, lng))


@app.post("/api/events/{event_id}/register", response_model=EventOut)
def register(
    event_id: int,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    db: Session = Depends(get_db),
):
    user = get_current_user(db)
    event = get_event_or_404(db, event_id)
    already = any(r.user_id == user.id for r in event.registrations)
    if not already:
        if len(event.registrations) >= event.capacity:
            raise HTTPException(status_code=409, detail="Event is full")
        db.add(Registration(user_id=user.id, event_id=event.id))
        db.commit()
        db.refresh(event)
    return event_payload(event, user, parse_origin(lat, lng))


@app.delete("/api/events/{event_id}/register", response_model=EventOut)
def unregister(
    event_id: int,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    db: Session = Depends(get_db),
):
    user = get_current_user(db)
    event = get_event_or_404(db, event_id)
    registration = db.scalar(
        select(Registration).where(
            Registration.user_id == user.id, Registration.event_id == event.id
        )
    )
    if registration is not None:
        db.delete(registration)
        db.commit()
        db.refresh(event)
    return event_payload(event, user, parse_origin(lat, lng))


@app.get("/api/me/events", response_model=List[EventOut])
def my_events(
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    db: Session = Depends(get_db),
):
    """All events the user registered for — past and upcoming."""
    user = get_current_user(db)
    events = db.scalars(
        select(Event)
        .join(Registration, Registration.event_id == Event.id)
        .options(*EVENT_LOADS)
        .where(Registration.user_id == user.id)
        .order_by(Event.starts_at)
    ).all()
    origin = parse_origin(lat, lng)
    return [event_payload(e, user, origin) for e in events]


# ---------------------------------------------------------------------------
# Event management + admin. Placeholder authorization: these endpoints are
# open, and the dashboards are gated client-side by the testing-mode role
# picked on the sign-in page. Real role checks come with real auth.
# ---------------------------------------------------------------------------


@app.post("/api/events", response_model=EventOut)
def create_event(payload: EventCreate, db: Session = Depends(get_db)):
    """Create an event, hosted on behalf of a company (company dashboard)."""
    user = get_current_user(db)
    host = user
    if payload.host_company:
        company = payload.host_company.strip()
        host = db.scalar(
            select(User).where(User.company == company).order_by(User.id)
        )
        if host is None:
            # Unknown company: give it a lightweight host account so its
            # dashboard can find the event again.
            slug = slugify(company) or "company"
            email = "events@{}.letsntwrk.com".format(slug)
            host = db.scalar(select(User).where(User.email == email))
            if host is None:
                host = User(
                    email=email,
                    name="{} Events".format(company),
                    company=company,
                    headline="Event host",
                    profile_completed=True,
                    avatar_url=(
                        "https://api.dicebear.com/9.x/notionists/svg"
                        "?seed={}&backgroundColor=f5f6f7".format(slug)
                    ),
                )
                db.add(host)
                db.flush()

    event = Event(
        title=payload.title.strip(),
        description=payload.description.strip(),
        category=payload.category,
        venue=payload.venue.strip(),
        address=payload.address.strip(),
        lat=payload.lat,
        lng=payload.lng,
        starts_at=payload.starts_at,
        duration_minutes=payload.duration_minutes,
        capacity=payload.capacity,
        cover_url=payload.cover_url
        or "https://picsum.photos/seed/{}-cover/1200/500".format(
            slugify(payload.title) or "event"
        ),
        host_id=host.id,
        schedule=[],
        content_blocks=(
            [{"type": "text", "text": payload.description.strip()}]
            if payload.description.strip()
            else []
        ),
        is_placeholder=False,
    )
    db.add(event)
    db.commit()
    return event_payload(get_event_or_404(db, event.id), user)


@app.patch("/api/events/{event_id}", response_model=EventOut)
def update_event(
    event_id: int, update: EventUpdate, db: Session = Depends(get_db)
):
    user = get_current_user(db)
    event = get_event_or_404(db, event_id)
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(event, field, value)
    db.commit()
    db.refresh(event)
    return event_payload(event, user)


@app.delete("/api/events/{event_id}")
def delete_event(event_id: int, db: Session = Depends(get_db)):
    event = get_event_or_404(db, event_id)
    db.delete(event)  # registrations go with it (delete-orphan cascade)
    db.commit()
    return {"ok": True}


@app.get("/api/admin/events", response_model=List[EventOut])
def admin_events(db: Session = Depends(get_db)):
    """Every event on the platform — upcoming and past — for the admin table."""
    user = get_current_user(db)
    events = db.scalars(
        select(Event).options(*EVENT_LOADS).order_by(Event.starts_at.desc())
    ).all()
    return [event_payload(e, user) for e in events]


@app.get("/api/admin/stats")
def admin_stats(db: Session = Depends(get_db)):
    """Aggregate platform numbers for the LetsNtwrk admin dashboard."""
    now = datetime.now()
    users = db.scalars(select(User).order_by(User.id)).all()
    events = db.scalars(select(Event).options(*EVENT_LOADS)).all()
    reg_times = db.scalars(select(Registration.created_at)).all()

    upcoming = [e for e in events if e.starts_at > now]
    upcoming_capacity = sum(e.capacity for e in upcoming)
    upcoming_going = sum(len(e.registrations) for e in upcoming)

    week_ago = now - timedelta(days=7)
    signup_days = []
    day_counts = Counter(t.date() for t in reg_times)
    for offset in range(13, -1, -1):
        day = (now - timedelta(days=offset)).date()
        signup_days.append(
            {"date": day.isoformat(), "count": day_counts.get(day, 0)}
        )

    reg_counts = dict(
        db.execute(
            select(Registration.user_id, func.count()).group_by(Registration.user_id)
        ).all()
    )

    return {
        "totals": {
            "users": len(users),
            "new_users_7d": sum(1 for u in users if u.created_at >= week_ago),
            "events": len(events),
            "upcoming_events": len(upcoming),
            "registrations": len(reg_times),
            "signups_7d": sum(1 for t in reg_times if t >= week_ago),
            "fill_rate": (
                round(100 * upcoming_going / upcoming_capacity)
                if upcoming_capacity
                else 0
            ),
        },
        "signups_by_day": signup_days,
        "events_by_category": [
            {"category": cat, "count": count}
            for cat, count in Counter(e.category for e in events).most_common()
        ],
        "top_events": [
            {
                "id": e.id,
                "title": e.title,
                "venue": e.venue,
                "category": e.category,
                "starts_at": e.starts_at.isoformat(),
                "going": len(e.registrations),
                "capacity": e.capacity,
            }
            for e in sorted(upcoming, key=lambda e: -len(e.registrations))[:5]
        ],
        "users": [
            {
                "id": u.id,
                "name": u.name or u.email,
                "email": u.email,
                "headline": u.headline,
                "company": u.company,
                "avatar_url": u.avatar_url,
                "joined": u.created_at.isoformat(),
                "events": int(reg_counts.get(u.id, 0)),
            }
            for u in sorted(users, key=lambda u: -reg_counts.get(u.id, 0))
        ],
    }


@app.get("/api/company/events", response_model=List[EventOut])
def company_events(company: str, db: Session = Depends(get_db)):
    """Events hosted by a company's members, newest first, with attendees."""
    user = get_current_user(db)
    events = db.scalars(
        select(Event)
        .join(User, Event.host_id == User.id)
        .options(*EVENT_LOADS)
        .where(User.company == company.strip())
        .order_by(Event.starts_at.desc())
    ).all()
    return [event_payload(e, user) for e in events]
