#!/usr/bin/env bash

FILE_NAME="test_100mb.bin"
SERVER_PORT=4099
TARGET_URL="http://localhost:$SERVER_PORT/file.v1.FileService/Upload"
LOG_FILE="memory_log.txt"

if [ ! -f "$FILE_NAME" ]; then
    dd if=/dev/zero of="$FILE_NAME" bs=1M count=100
fi

SERVER_PID=$(lsof -t -i:$SERVER_PORT)
if [ -z "$SERVER_PID" ]; then
    exit 1
fi

INITIAL_RSS=$(ps -o rss= -p "$SERVER_PID" | tr -d ' ')
echo "0" > "$LOG_FILE"

monitor_mem() {
    while kill -0 "$1" 2>/dev/null; do
        ps -o rss= -p "$SERVER_PID" >> "$LOG_FILE" 2>/dev/null
        sleep 0.1
    done
}

run_bench() {
    bun x autocannon -m POST \
        -H "Content-Type: application/octet-stream" \
        -H "Content-Length: 104857600" \
        -c 1 -d 15 \
        -s "$FILE_NAME" \
        "$TARGET_URL"
}

monitor_mem "$$" &
MONITOR_PID=$!

run_bench

kill "$MONITOR_PID" 2>/dev/null

PEAK_RSS=$(sort -rn "$LOG_FILE" | head -n 1)
PEAK_DELTA=$(( (PEAK_RSS - INITIAL_RSS) / 1024 ))

echo "Baseline RSS: $((INITIAL_RSS / 1024)) MB"
echo "Peak RSS: $((PEAK_RSS / 1024)) MB"
echo "Stream Overhead: $PEAK_DELTA MB"

if [ "$PEAK_DELTA" -gt 50 ]; then
    echo "CRITICAL: High memory overhead detected. Buffering is occurring."
else
    echo "SUCCESS: Constant memory usage confirmed."
fi
