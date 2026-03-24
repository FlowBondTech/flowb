#!/bin/bash
# FlowB API helper — base script sourced by other scripts
# Env: FLOWB_API_BASE, FLOWB_API_TOKEN

FLOWB_API="${FLOWB_API_BASE:-https://flowb.fly.dev}"
FLOWB_TOKEN="${FLOWB_API_TOKEN}"

flowb_call() {
  local method="$1" endpoint="$2" body="$3"
  curl -s -X "$method" \
    "${FLOWB_API}${endpoint}" \
    -H "Authorization: Bearer ${FLOWB_TOKEN}" \
    -H "Content-Type: application/json" \
    ${body:+-d "$body"}
}

# Pretty-print JSON if jq is available
format_json() {
  if command -v jq &>/dev/null; then
    jq '.'
  else
    cat
  fi
}
