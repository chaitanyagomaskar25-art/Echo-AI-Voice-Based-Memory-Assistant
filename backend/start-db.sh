#!/bin/bash
DBPATH="/tmp/echo_mongodb_data"
LOGPATH="/tmp/echo_mongodb.log"
PORT=27018

mkdir -p "$DBPATH"

if ss -tuln | grep -q ":$PORT "; then
  echo "[MongoDB] Already running on port $PORT"
else
  echo "[MongoDB] Starting MongoDB daemon on port $PORT..."
  mongod --dbpath "$DBPATH" --port $PORT --nounixsocket --fork --logpath "$LOGPATH"
  echo "[MongoDB] Server started successfully."
fi
