"""Placeholder data seeding.

Events are generated around whatever location the visitor loads the map from,
so the demo always has dots "in your area". A pool of seeded people (with
companies, headlines, and generated avatars) hosts and attends the events so
the platform feels inhabited. Each area also gets a few past events — and the
test account gets registered to a handful the first time — so the profile page
has attendance history. Generation is idempotent per area.
"""

import math
import random
from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .models import Event, Registration, User

TEST_USER_EMAIL = "test@letsntwrk.com"
SEED_EMAIL_DOMAIN = "seed.letsntwrk.com"

# (name, headline, company)
FAKE_PEOPLE = [
    ("Maya Chen", "Product Manager", "Notion"),
    ("Derek Okafor", "Founding Engineer", "Stripe"),
    ("Priya Raman", "Growth Lead", "Figma"),
    ("Sam Delgado", "UX Designer", "Airbnb"),
    ("Hannah Kim", "Data Scientist", "OpenAI"),
    ("Marcus Webb", "Sales Director", "Salesforce"),
    ("Alina Petrova", "Founder & CEO", "Loopwork"),
    ("Jordan Silva", "iOS Engineer", "Duolingo"),
    ("Grace Liu", "Marketing Manager", "HubSpot"),
    ("Tom Becker", "Associate", "Foundry Group"),
    ("Nia Thompson", "Technical Recruiter", "Rippling"),
    ("Leo Martinez", "Developer Relations", "Vercel"),
    ("Sofia Rossi", "Brand Designer", "Canva"),
    ("Ethan Park", "CTO", "Brightlane"),
    ("Ivy Nguyen", "Account Executive", "Datadog"),
    ("Ben Fischer", "Product Designer", "Linear"),
    ("Carmen Ortiz", "Operations Lead", "DoorDash"),
    ("Noah Stein", "ML Engineer", "Anthropic"),
    ("Tara Singh", "Content Strategist", "Substack"),
    ("Felix Wagner", "Finance Manager", "Ramp"),
    ("Rosa Mendes", "Community Manager", "Discord"),
    ("Kai Tanaka", "Solutions Architect", "AWS"),
    ("Lucy Alvarez", "Freelance Writer", "Self-employed"),
    ("Omar Haddad", "Managing Partner", "Haddad Capital"),
    ("Elena Volkov", "Angel Investor", "Volkov Ventures"),
    ("Will Turner", "Business Development", "Shopify"),
    ("Zoe Laurent", "Illustrator", "Freelance"),
    ("Andre Boateng", "Startup Advisor", "Boateng & Co"),
]

EVENT_TEMPLATES = [
    {
        "title": "Founders & Coffee",
        "category": "Startup",
        "venue": "The Grind House",
        "duration": 120,
        "intro": "A casual early-morning coffee for founders and operators to swap "
        "stories, struggles, and warm intros. No pitches, no name tags — just good "
        "conversation before the workday starts.",
        "about": [
            "We keep the format deliberately loose: grab a coffee, find a table, and "
            "join whichever conversation pulls you in. Regulars range from first-time "
            "founders still validating an idea to operators who have exited twice.",
            "If you're new, tell the person at the door what you're working on and "
            "they'll point you to the right table. Most people leave with two or three "
            "follow-ups on the calendar.",
        ],
        "schedule": [
            (0, "Doors open — grab a coffee"),
            (20, "Round-table introductions"),
            (45, "Open conversation"),
            (100, "Wrap up & swap contacts"),
        ],
    },
    {
        "title": "Tech Networking Night",
        "category": "Tech",
        "venue": "Circuit Lounge",
        "duration": 150,
        "intro": "An open evening mixer for engineers, product managers, and anyone "
        "building software. Lightning intros at the top of the hour, then open "
        "networking. All experience levels welcome.",
        "about": [
            "Expect a healthy mix: senior engineers comparing notes on architecture, "
            "juniors looking for their next role, and hiring managers quietly doing "
            "both. The lightning intros are optional but the fastest way to be found "
            "by the right people.",
            "Bring nothing but yourself — name tags and drink tickets are at the door. "
            "A quiet side room is reserved for deeper one-on-one conversations.",
        ],
        "schedule": [
            (0, "Doors & drinks"),
            (30, "Lightning intros — 30 seconds each"),
            (60, "Open networking"),
            (120, "Last call & goodbyes"),
        ],
    },
    {
        "title": "AI Builders Meetup",
        "category": "Tech",
        "venue": "The Signal Room",
        "duration": 150,
        "intro": "Demos and conversation with people shipping AI products right now. "
        "Bring a laptop if you want to show something — five-minute demo slots are "
        "first come, first served.",
        "about": [
            "Every month a handful of builders demo what they've shipped: agents, "
            "eval harnesses, fine-tunes, weird experiments. The bar for demos is "
            "refreshingly low — half the fun is seeing things break live.",
            "After demos, the room splits into loose circles by topic. Whether you're "
            "deep in production RAG or just AI-curious, you'll find your people.",
        ],
        "schedule": [
            (0, "Doors open"),
            (25, "Live demos — 5 minutes each"),
            (85, "Topic circles & open networking"),
            (135, "Wind down"),
        ],
    },
    {
        "title": "Young Professionals Mixer",
        "category": "Social",
        "venue": "Union Hall",
        "duration": 150,
        "intro": "A low-pressure after-work mixer for anyone in the first decade of "
        "their career. Icebreaker bingo for the shy, and the first drink is on the "
        "house.",
        "about": [
            "This one is about breadth: marketers meet engineers meet nurses meet "
            "analysts. The icebreaker bingo card sounds silly and works annoyingly "
            "well — most squares require talking to a stranger.",
            "Come alone on purpose. Groups tend to splinter within twenty minutes "
            "anyway, and the hosts make a point of introducing solo arrivals around.",
        ],
        "schedule": [
            (0, "Doors — first drink on us"),
            (20, "Icebreaker bingo begins"),
            (75, "Open mixing"),
            (130, "Bingo winners & wrap"),
        ],
    },
    {
        "title": "Women in Business Brunch",
        "category": "Business",
        "venue": "Harbor House",
        "duration": 120,
        "intro": "A monthly brunch connecting women across industries. Mentorship "
        "tables, open networking, and a short talk from a local leader.",
        "about": [
            "Each brunch seats mentorship tables by theme — negotiating comp, first "
            "leadership roles, starting a company — anchored by someone a few years "
            "ahead of the conversation. You can switch tables between courses.",
            "The short talk is capped at fifteen minutes, on purpose. The point is "
            "the table you're sitting at, and the one you join after.",
        ],
        "schedule": [
            (0, "Seating & coffee"),
            (20, "Featured talk"),
            (35, "Mentorship tables — first seating"),
            (75, "Table switch & open brunch"),
        ],
    },
    {
        "title": "Startup Pitch & Pints",
        "category": "Startup",
        "venue": "The Keg & Compass",
        "duration": 150,
        "intro": "Five local startups pitch for five minutes each, the room votes, "
        "and then everyone talks it out over pints. Great place to meet founders, "
        "angels, and early hires.",
        "about": [
            "Pitches are scored by the whole room on a one-tap ballot — no judges' "
            "table, no sponsor slides. Winners get bragging rights and a bar tab; "
            "everyone else gets brutally useful hallway feedback.",
            "Investors show up because the format is fast, founders because the "
            "audience is honest. Job seekers: every pitching team is hiring, ask.",
        ],
        "schedule": [
            (0, "Doors & first pints"),
            (30, "Five pitches, five minutes each"),
            (70, "Room vote & winner announced"),
            (80, "Open networking"),
        ],
    },
    {
        "title": "Marketing Pros Happy Hour",
        "category": "Marketing",
        "venue": "Neon Garden",
        "duration": 120,
        "intro": "Growth, brand, content, and lifecycle folks talking shop over "
        "happy-hour prices. Monthly theme table if you want a prompt, free-form "
        "mingling if you don't.",
        "about": [
            "This month's theme table: what's actually working in paid channels "
            "right now. Bring one number you're proud of and one you're confused by "
            "— the table runs on real dashboards, not hot takes.",
            "Agency folks, in-house teams, and fractional CMOs all show up. It's the "
            "cheapest competitive research you'll do all quarter.",
        ],
        "schedule": [
            (0, "Happy hour begins"),
            (30, "Theme table kicks off"),
            (90, "Open mingling"),
        ],
    },
    {
        "title": "Finance & FinTech Forum",
        "category": "Finance",
        "venue": "Ledger Rooftop",
        "duration": 150,
        "intro": "A short panel followed by open networking for finance "
        "professionals and fintech builders. CPE-friendly, suit optional.",
        "about": [
            "The panel pairs a traditional-finance operator with a fintech founder "
            "on the same question — this quarter: where underwriting is actually "
            "getting better. Twenty minutes, then straight to the rooftop.",
            "Attendees skew senior: controllers, VPs of finance, founders, and the "
            "occasional regulator off the clock. Cards get exchanged early here.",
        ],
        "schedule": [
            (0, "Check-in & drinks"),
            (25, "Panel: 20 sharp minutes"),
            (50, "Audience Q&A"),
            (65, "Rooftop networking"),
        ],
    },
    {
        "title": "Product & Design Meetup",
        "category": "Creative",
        "venue": "Studio North",
        "duration": 150,
        "intro": "Show-and-tell for designers and product people. Two teams walk "
        "through recent work, then open critique and networking. Portfolios "
        "welcome.",
        "about": [
            "Two teams present real, shipped work — including the messy middle "
            "versions that never make it to Dribbble. The critique that follows is "
            "structured and kind, but it is critique.",
            "Bring your portfolio on whatever device you like; there's a projector "
            "corner for impromptu reviews and a hiring board by the door.",
        ],
        "schedule": [
            (0, "Doors open"),
            (25, "Team show-and-tell #1"),
            (55, "Team show-and-tell #2"),
            (85, "Open critique & networking"),
        ],
    },
    {
        "title": "Freelancers Coworking Social",
        "category": "Creative",
        "venue": "The Commons",
        "duration": 180,
        "intro": "Co-work all afternoon with fellow freelancers and independents, "
        "then stick around for snacks and structured introductions at five.",
        "about": [
            "The afternoon is quiet, headphones-on coworking — good wifi, good "
            "coffee, and enough desks. At five the laptops close and the structured "
            "intros begin: thirty seconds on what you do and what work you're "
            "looking for.",
            "Half the room has hired the other half at some point. If you're new to "
            "freelancing, this is where subcontracts and referrals actually happen.",
        ],
        "schedule": [
            (0, "Coworking begins"),
            (150, "Laptops down — intros"),
            (165, "Snacks & referrals"),
        ],
    },
    {
        "title": "Sales Leaders Roundtable",
        "category": "Business",
        "venue": "Summit Club",
        "duration": 120,
        "intro": "A roundtable on pipeline, hiring, and comp for sales leaders and "
        "aspiring ones. Chatham House rules, open networking after.",
        "about": [
            "The table talks numbers you won't see on LinkedIn: real quota "
            "attainment, real ramp times, real comp bands. Chatham House rules keep "
            "it honest — take the insight, leave the attribution.",
            "ICs eyeing their first leadership role are explicitly welcome; there's "
            "a reserved seat rotation so new voices get table time.",
        ],
        "schedule": [
            (0, "Arrivals"),
            (15, "Roundtable — moderated"),
            (75, "Open networking"),
        ],
    },
    {
        "title": "Real Estate Investors Network",
        "category": "Finance",
        "venue": "Brick & Beam",
        "duration": 120,
        "intro": "Local investors, agents, and lenders trading market notes and "
        "deal leads. New-member introductions at the top of the hour.",
        "about": [
            "The room is a working market: buy-and-hold investors, flippers, agents "
            "with pocket listings, and lenders who'll tell you what's actually "
            "getting funded this quarter.",
            "New members introduce themselves and their buy box at the top of the "
            "hour — be specific, because deal flow here moves by word of mouth.",
        ],
        "schedule": [
            (0, "Doors & coffee"),
            (30, "New-member introductions"),
            (45, "Market notes & deal talk"),
            (105, "Wrap up"),
        ],
    },
]

STREETS = [
    "Market St",
    "Oak Ave",
    "5th St",
    "Pine St",
    "Riverside Dr",
    "Main St",
    "Grand Ave",
    "Elm St",
    "Broadway",
    "Harbor Blvd",
]

EVENT_TIMES = [(8, 0), (9, 30), (12, 0), (17, 30), (18, 0), (18, 30), (19, 0)]

# Baseline cities seeded at startup so the DB is never empty: SF, NYC, Austin.
BASE_CITIES = [(37.7749, -122.4194), (40.7128, -74.0060), (30.2672, -97.7431)]


def slugify(text):
    return "".join(c if c.isalnum() else "-" for c in text.lower()).strip("-")


def haversine_km(lat1, lng1, lat2, lng2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def ensure_people(db: Session):
    """Create the pool of seeded attendees once; return them all."""
    existing = db.scalars(
        select(User).where(User.email.like("%@" + SEED_EMAIL_DOMAIN)).order_by(User.id)
    ).all()
    if len(existing) >= len(FAKE_PEOPLE):
        return existing
    have = {u.email for u in existing}
    for name, headline, company in FAKE_PEOPLE:
        slug = slugify(name)
        email = "{}@{}".format(slug, SEED_EMAIL_DOMAIN)
        if email in have:
            continue
        joined = datetime.now() - timedelta(days=random.Random(slug).uniform(3, 120))
        db.add(
            User(
                email=email,
                name=name,
                headline=headline,
                company=company,
                linkedin_connected=True,
                linkedin_url="linkedin.com/in/" + slug,
                avatar_url=(
                    "https://api.dicebear.com/9.x/notionists/svg"
                    "?seed={}&backgroundColor=f5f6f7".format(slug)
                ),
                profile_completed=True,
                created_at=joined,
            )
        )
    db.commit()
    return db.scalars(
        select(User).where(User.email.like("%@" + SEED_EMAIL_DOMAIN)).order_by(User.id)
    ).all()


def build_schedule(starts_at, outline):
    items = []
    for offset_min, title in outline:
        t = starts_at + timedelta(minutes=offset_min)
        items.append({"time": t.strftime("%-I:%M %p"), "title": title})
    return items


def build_content_blocks(tpl, area_key):
    slug = slugify(tpl["title"])
    img = lambda tag: "https://picsum.photos/seed/{}-{}-{}/900/500".format(
        slug, area_key, tag
    )
    blocks = [{"type": "text", "text": tpl["about"][0]}]
    blocks.append(
        {"type": "image", "url": img("a"), "caption": "The space at {}".format(tpl["venue"])}
    )
    for para in tpl["about"][1:]:
        blocks.append({"type": "text", "text": para})
    blocks.append({"type": "image", "url": img("b"), "caption": "A previous edition"})
    return blocks


def _make_event(db, rng, tpl, lat, lng, starts_at, area_slug, people):
    """Create one event scattered near (lat, lng) with a host and a crowd."""
    distance = rng.uniform(1.5, 12.0)  # km from the visitor
    bearing = rng.uniform(0, 2 * math.pi)
    dlat = (distance / 111.32) * math.cos(bearing)
    dlng = (distance / (111.32 * max(0.1, math.cos(math.radians(lat))))) * math.sin(bearing)

    host = rng.choice(people)
    event = Event(
        title=tpl["title"],
        description=tpl["intro"],
        category=tpl["category"],
        venue=tpl["venue"],
        address="{} {}".format(rng.randint(12, 980), rng.choice(STREETS)),
        lat=lat + dlat,
        lng=lng + dlng,
        starts_at=starts_at,
        duration_minutes=tpl["duration"],
        capacity=rng.choice([30, 40, 50, 75, 100]),
        cover_url="https://picsum.photos/seed/{}-{}-cover/1200/500".format(
            slugify(tpl["title"]), area_slug
        ),
        host_id=host.id,
        schedule=build_schedule(starts_at, tpl["schedule"]),
        content_blocks=build_content_blocks(tpl, area_slug),
        is_placeholder=True,
    )
    db.add(event)
    db.flush()  # get event.id for registrations

    crowd = set(rng.sample(people, rng.randint(6, min(16, len(people)))))
    crowd.add(host)
    # Signups trickle in over the weeks before the event (never in the future),
    # so the admin dashboard's signups-per-day chart has a believable shape.
    signup_end = min(datetime.now(), starts_at)
    for person in sorted(crowd, key=lambda u: u.id):
        signed_up = signup_end - timedelta(days=rng.uniform(0, 21), hours=rng.uniform(0, 12))
        db.add(Registration(user_id=person.id, event_id=event.id, created_at=signed_up))
    return event


def _ensure_upcoming(db: Session, lat: float, lng: float) -> int:
    upcoming = db.scalars(select(Event).where(Event.starts_at > datetime.now())).all()
    nearby = [e for e in upcoming if haversine_km(lat, lng, e.lat, e.lng) <= 30]
    if len(nearby) >= 6:
        return 0

    people = ensure_people(db)
    area_key = "{:.2f},{:.2f}".format(lat, lng)
    rng = random.Random(area_key)
    now = datetime.now()
    created = 0
    for tpl in EVENT_TEMPLATES:
        day = now + timedelta(days=rng.randint(1, 21))
        hour, minute = rng.choice(EVENT_TIMES)
        starts_at = day.replace(hour=hour, minute=minute, second=0, microsecond=0)
        _make_event(db, rng, tpl, lat, lng, starts_at, slugify(area_key), people)
        created += 1
    db.commit()
    return created


def _ensure_past(db: Session, lat: float, lng: float) -> int:
    """A few finished events per area; the test account attends its first few."""
    now = datetime.now()
    past = db.scalars(select(Event).where(Event.starts_at <= now)).all()
    nearby = [e for e in past if haversine_km(lat, lng, e.lat, e.lng) <= 30]
    if nearby:
        return 0

    people = ensure_people(db)
    area_key = "{:.2f},{:.2f}".format(lat, lng)
    rng = random.Random("past:" + area_key)

    test_user = db.scalar(select(User).where(User.email == TEST_USER_EMAIL))
    test_past_count = 0
    if test_user is not None:
        test_past_count = db.scalar(
            select(func.count())
            .select_from(Registration)
            .join(Event, Registration.event_id == Event.id)
            .where(Registration.user_id == test_user.id, Event.starts_at <= now)
        )

    created = 0
    for i, tpl in enumerate(rng.sample(EVENT_TEMPLATES, 4)):
        days_ago = rng.randint(6, 50)
        hour, minute = rng.choice(EVENT_TIMES)
        starts_at = (now - timedelta(days=days_ago)).replace(
            hour=hour, minute=minute, second=0, microsecond=0
        )
        event = _make_event(
            db, rng, tpl, lat, lng, starts_at, slugify(area_key) + "-past", people
        )
        if test_user is not None and test_past_count == 0 and i < 3:
            db.add(Registration(user_id=test_user.id, event_id=event.id))
        created += 1
    db.commit()
    return created


def ensure_events_near(db: Session, lat: float, lng: float) -> int:
    """Make sure an area has upcoming events (and some history) within ~30 km."""
    created = _ensure_upcoming(db, lat, lng)
    created += _ensure_past(db, lat, lng)
    return created


def scatter_placeholder_dates(db: Session) -> None:
    """One-time backfill for databases seeded before dates were scattered.

    Early seeds stamped every registration and seeded user with "now", which
    renders the admin charts as a single giant bar. If everything is bunched on
    a couple of days, spread the placeholder rows out (deterministically).
    """
    reg_days = set(db.scalars(select(func.date(Registration.created_at))).all())
    if len(reg_days) > 3:
        return
    now = datetime.now()
    regs = db.scalars(
        select(Registration).join(Event, Registration.event_id == Event.id)
    ).all()
    for reg in regs:
        rng = random.Random("reg:{}".format(reg.id))
        signup_end = min(now, reg.event.starts_at)
        reg.created_at = signup_end - timedelta(
            days=rng.uniform(0, 21), hours=rng.uniform(0, 12)
        )
    seeded_users = db.scalars(
        select(User).where(User.email.like("%@" + SEED_EMAIL_DOMAIN))
    ).all()
    for person in seeded_users:
        rng = random.Random("user:{}".format(person.id))
        person.created_at = now - timedelta(days=rng.uniform(3, 120))
    db.commit()


def seed_baseline(db: Session) -> None:
    """Create the default test account, seeded people, and a first batch of events."""
    user = db.scalar(select(User).where(User.email == TEST_USER_EMAIL))
    if user is None:
        db.add(User(email=TEST_USER_EMAIL, name="Test User"))
        db.commit()

    ensure_people(db)

    if db.scalar(select(func.count()).select_from(Event)) == 0:
        for lat, lng in BASE_CITIES:
            ensure_events_near(db, lat, lng)

    scatter_placeholder_dates(db)
