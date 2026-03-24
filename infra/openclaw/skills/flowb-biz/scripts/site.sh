#!/bin/bash
# Site management for FlowB EC
# Usage: bash scripts/site.sh <command> [args...]

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/flowb-api.sh"

SITE="${FLOWB_DEFAULT_SITE:-nored-farms}"

case "${1:-help}" in
  list)
    flowb_call GET "/api/v1/biz/projects" | format_json
    ;;
  status)
    SLUG="${2:-$SITE}"
    flowb_call GET "/api/v1/biz/projects/$SLUG" | format_json
    ;;
  activity)
    SLUG="${2:-$SITE}"
    LIMIT="${3:-20}"
    flowb_call GET "/api/v1/biz/projects/$SLUG/activity?limit=$LIMIT" | format_json
    ;;
  rebuild)
    SLUG="${2:-$SITE}"
    flowb_call POST "/api/v1/biz/projects/$SLUG/test" | format_json
    echo ""
    flowb_call POST "/api/v1/chat" "{\"message\":\"rebuild $SLUG site\"}" | format_json
    ;;
  test)
    SLUG="${2:-$SITE}"
    flowb_call POST "/api/v1/biz/projects/$SLUG/test" | format_json
    ;;
  *)
    echo "Usage: site.sh <list|status|activity|rebuild|test> [args]"
    echo ""
    echo "Commands:"
    echo "  list                    - List all managed sites"
    echo "  status [slug]           - Get site details"
    echo "  activity [slug] [limit] - View activity log"
    echo "  rebuild [slug]          - Trigger site rebuild"
    echo "  test [slug]             - Test site connection"
    ;;
esac
