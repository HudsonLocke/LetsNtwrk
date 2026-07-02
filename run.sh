#!/usr/bin/env bash
# LetsNtwrk — one-command run: ./run.sh
# Starts Postgres (Docker), the FastAPI backend, and the Vite frontend,
# then opens the site in your default browser. Safe to re-run: anything
# already running is left alone. Use ./run.sh stop to shut the servers down.
set -euo pipefail
cd "$(dirname "$0")"

DB_CONTAINER=letsnetwrk-postgres
BACKEND_PORT=8000
FRONTEND_PORT=5174
RUN_DIR=.run
mkdir -p "$RUN_DIR"

port_in_use() { lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }

if [ "${1:-}" = "stop" ]; then
  for port in $BACKEND_PORT $FRONTEND_PORT; do
    pids=$(lsof -nP -tiTCP:"$port" -sTCP:LISTEN || true)
    if [ -n "$pids" ]; then
      echo "Stopping server on port $port"
      kill $pids
    fi
  done
  echo "Servers stopped. (Postgres container left running; 'docker stop $DB_CONTAINER' if you want it down too.)"
  exit 0
fi

# ---- 1. Database ----------------------------------------------------------
# Make sure the Docker daemon is up (start Docker Desktop if it isn't).
if ! docker info >/dev/null 2>&1; then
  echo -n "Starting Docker Desktop"
  open -a Docker 2>/dev/null || open -a "Docker Desktop" 2>/dev/null || {
    echo; echo "Docker Desktop isn't installed — get it from https://www.docker.com/products/docker-desktop/"; exit 1; }
  until docker info >/dev/null 2>&1; do
    echo -n "."
    sleep 1
  done
  echo " ready."
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
  if docker ps -a --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
    echo "Starting Postgres container..."
    docker start "$DB_CONTAINER" >/dev/null
  else
    echo "Creating Postgres container..."
    docker run -d --name "$DB_CONTAINER" \
      -e POSTGRES_USER=letsnetwrk -e POSTGRES_PASSWORD=letsnetwrk -e POSTGRES_DB=letsnetwrk \
      -p 127.0.0.1:5433:5432 -v letsnetwrk_pgdata:/var/lib/postgresql/data \
      --restart unless-stopped postgres:16-alpine >/dev/null
  fi
fi

echo -n "Waiting for Postgres"
until docker exec "$DB_CONTAINER" pg_isready -U letsnetwrk -q 2>/dev/null; do
  echo -n "."
  sleep 0.5
done
echo " ready."

# ---- 2. Dependencies ------------------------------------------------------
if [ ! -x backend/.venv/bin/python ]; then
  echo "Setting up Python venv..."
  python3 -m venv backend/.venv
  backend/.venv/bin/pip install --upgrade pip -q
fi
if ! backend/.venv/bin/python -c 'import fastapi, uvicorn, sqlalchemy, psycopg2' 2>/dev/null; then
  echo "Installing backend dependencies..."
  backend/.venv/bin/pip install -q -r backend/requirements.txt
fi

if [ ! -d frontend/node_modules ]; then
  echo "Installing frontend dependencies..."
  npm --prefix frontend install --no-fund --no-audit
fi

# ---- 3. Backend -----------------------------------------------------------
if port_in_use $BACKEND_PORT; then
  echo "Backend already running on port $BACKEND_PORT."
else
  echo "Starting backend on port $BACKEND_PORT..."
  nohup backend/.venv/bin/python -m uvicorn app.main:app \
    --app-dir backend --port $BACKEND_PORT --reload \
    >"$RUN_DIR/backend.log" 2>&1 &
fi

echo -n "Waiting for the API"
for _ in $(seq 1 60); do
  if curl -sf "http://127.0.0.1:$BACKEND_PORT/api/health" >/dev/null; then break; fi
  echo -n "."
  sleep 0.5
done
curl -sf "http://127.0.0.1:$BACKEND_PORT/api/health" >/dev/null || {
  echo " backend failed to start — see $RUN_DIR/backend.log"; exit 1; }
echo " ready."

# ---- 4. Frontend ----------------------------------------------------------
if port_in_use $FRONTEND_PORT; then
  echo "Frontend already running on port $FRONTEND_PORT."
else
  echo "Starting frontend on port $FRONTEND_PORT..."
  nohup npm --prefix frontend run dev >"$RUN_DIR/frontend.log" 2>&1 &
fi

echo -n "Waiting for the site"
for _ in $(seq 1 60); do
  if curl -sf "http://localhost:$FRONTEND_PORT" >/dev/null; then break; fi
  echo -n "."
  sleep 0.5
done
curl -sf "http://localhost:$FRONTEND_PORT" >/dev/null || {
  echo " frontend failed to start — see $RUN_DIR/frontend.log"; exit 1; }
echo " ready."

# ---- 5. Open --------------------------------------------------------------
echo "LetsNtwrk is up → http://localhost:$FRONTEND_PORT"
open "http://localhost:$FRONTEND_PORT"
