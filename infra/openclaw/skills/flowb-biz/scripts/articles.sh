#!/bin/bash
# Article management for FlowB EC sites
# Usage: bash scripts/articles.sh <command> [args...]

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/flowb-api.sh"

SITE="${FLOWB_DEFAULT_SITE:-nored-farms}"

case "${1:-help}" in
  list)
    STATUS="${2:-published}"
    flowb_call GET "/api/v1/biz/site-proxy/$SITE/content-articles?status=$STATUS" | format_json
    ;;
  create)
    TITLE="$2"
    TAGS="${3:-}"
    CATEGORY="${4:-}"
    flowb_call POST "/api/v1/chat" "{\"message\":\"create article titled '$TITLE' with tags '$TAGS' in category '$CATEGORY' on $SITE\"}" | format_json
    ;;
  publish)
    ID="$2"
    flowb_call POST "/api/v1/chat" "{\"message\":\"publish article $ID on $SITE\"}" | format_json
    ;;
  schedule)
    ID="$2"
    DATETIME="$3"
    flowb_call POST "/api/v1/chat" "{\"message\":\"schedule article $ID for $DATETIME on $SITE\"}" | format_json
    ;;
  update)
    ID="$2"
    shift 2
    flowb_call POST "/api/v1/chat" "{\"message\":\"update article $ID on $SITE: $*\"}" | format_json
    ;;
  *)
    echo "Usage: articles.sh <list|create|publish|schedule|update> [args]"
    echo ""
    echo "Commands:"
    echo "  list [status]               - List articles (published/draft/all)"
    echo "  create <title> [tags] [cat]  - Create draft article"
    echo "  publish <id>                 - Publish article"
    echo "  schedule <id> <datetime>     - Schedule for publishing"
    echo "  update <id> <fields...>      - Update article metadata"
    ;;
esac
