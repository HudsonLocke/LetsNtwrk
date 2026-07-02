#!/usr/bin/env bash
# Double-click this file in Finder to start LetsNtwrk.
# It runs ./run.sh (starts Docker, database, backend, frontend) and opens the site.
cd "$(dirname "$0")" || exit 1

if ./run.sh; then
  echo
  echo "LetsNtwrk is up — your browser should have opened. You can close this window."
else
  echo
  echo "Something went wrong (see the messages above). This window will stay open."
  echo "Press Return to close it."
  read -r
fi
