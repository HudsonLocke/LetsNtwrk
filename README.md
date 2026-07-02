# LetsNtwrk

Find networking events near you. The homepage is a LinkedIn-style feed: a left
rail with your event calendar and upcoming registrations, and a main column
that starts with a map (fullscreen-able, dots for every event near your
location) followed by recommended events and a filterable list of everything
nearby. Your profile page shows upcoming registrations, attended history, and
the companies you've networked with.

## Stack

- **Frontend** — React (Vite) + Leaflet, plain CSS. Runs on port **5174**.
- **Backend** — FastAPI + SQLAlchemy. Runs on port **8000**.
- **Database** — PostgreSQL 16 in Docker (container `letsnetwrk-postgres`, host port **5433**).

## Running it

One command — starts the database, backend, and frontend (installing anything
missing) and opens the site in your browser:

```bash
./run.sh        # ./run.sh stop shuts the servers down
```

Or manually:

```bash
# 1. Database (already created; restart it any time with)
docker start letsnetwrk-postgres

# 2. Backend
backend/.venv/bin/python -m uvicorn app.main:app --app-dir backend --port 8000 --reload

# 3. Frontend
npm --prefix frontend run dev
```

Then open http://localhost:5174.

First-time setup, if you ever need to recreate it:

```bash
docker run -d --name letsnetwrk-postgres \
  -e POSTGRES_USER=letsnetwrk -e POSTGRES_PASSWORD=letsnetwrk -e POSTGRES_DB=letsnetwrk \
  -p 127.0.0.1:5433:5432 -v letsnetwrk_pgdata:/var/lib/postgresql/data \
  --restart unless-stopped postgres:16-alpine

python3 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements.txt
npm --prefix frontend install
```

## What's on an event

Hovering a map dot shows a preview card; opening an event takes over the full
screen with cover art, an image + text description, a schedule timeline, the
host, the attendee list (with LinkedIn links), and the companies attending.
The sidebar filters by category, date (today / weekend / next 7 days),
distance, open spots, and sorts by soonest / closest / most popular.

## How the placeholder data works

- On startup the backend creates the tables, a default test account
  (`test@letsntwrk.com`), and a first batch of events in SF, NYC, and Austin.
- When the map loads with your coordinates, `GET /api/events?lat=&lng=` checks
  whether your area already has upcoming events — if not, it seeds ~12
  placeholder events scattered within a few miles of you. So the map always has
  dots wherever you open it from.

## What's intentionally placeholder

- **Auth** — the site starts logged out with a sign-in / create-account page,
  but none of it is real yet: any username + password signs you in as the
  seeded test account (a regular member). Below the form is a **Testing mode**
  section for previewing the other seats:
  - **LetsNtwrk admin** — platform dashboard: member stats, signups-per-day
    chart, the member list, and every event with edit/delete.
  - **Company admin** — pick a company (seeded ones host events already) and
    get its dashboard: create events, edit them, and watch the signup lists.
  The chosen session sticks in localStorage; "Sign out" (profile page or
  dashboard top bar) returns to the auth page. The admin/company endpoints do
  no authorization checks — the gate is client-side only, like the rest of the
  placeholder auth.
  The "Set up your account" modal (name, headline, profile photo, LinkedIn)
  appears the first time you try to register for an event.
- **LinkedIn connect** — a fake OAuth flow that just flips a flag and fills in
  a profile URL.
- **Profile photos** — downscaled client-side and stored as a data-URL on the
  user row in Postgres.

## API

| Method | Path | What it does |
| --- | --- | --- |
| POST | `/api/auth/login`, `/api/auth/signup` | Placeholder: any credentials → the test account |
| GET | `/api/events?lat=&lng=&radius_km=` | Upcoming events near a point (seeds the area on first visit) |
| GET | `/api/events/{id}` | One event |
| POST | `/api/events` | Create an event (company dashboard; `host_company` picks the host) |
| PATCH | `/api/events/{id}` | Edit an event (admin / company dashboards) |
| DELETE | `/api/events/{id}` | Delete an event |
| POST | `/api/events/{id}/register` | Register the signed-in user |
| DELETE | `/api/events/{id}/register` | Cancel registration |
| GET | `/api/me` | The signed-in (test) user |
| PATCH | `/api/me` | Update name / headline / avatar / LinkedIn |
| GET | `/api/me/events` | Events the user registered for |
| GET | `/api/companies` | Companies (with hosted-event counts) for the testing-mode picker |
| GET | `/api/company/events?company=` | A company's events, with attendee lists |
| GET | `/api/admin/stats` | Platform totals, signups per day, categories, member list |
| GET | `/api/admin/events` | Every event, past and upcoming |
