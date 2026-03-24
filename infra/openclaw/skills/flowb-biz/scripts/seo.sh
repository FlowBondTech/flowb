#!/bin/bash
# SEO management for FlowB EC sites
# Usage: bash scripts/seo.sh <command> [args...]

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/flowb-api.sh"

SITE="${FLOWB_DEFAULT_SITE:-nored-farms}"

case "${1:-help}" in
  status)
    flowb_call POST "/api/v1/chat" "{\"message\":\"what's the SEO status of $SITE?\"}" | format_json
    ;;
  check)
    ID="$2"
    flowb_call POST "/api/v1/chat" "{\"message\":\"check SEO for article $ID on $SITE\"}" | format_json
    ;;
  suggestions)
    flowb_call POST "/api/v1/chat" "{\"message\":\"give me SEO improvement suggestions for $SITE\"}" | format_json
    ;;
  *)
    echo "Usage: seo.sh <status|check|suggestions>"
    echo ""
    echo "Commands:"
    echo "  status              - Overall SEO health report"
    echo "  check <article_id>  - Check specific article"
    echo "  suggestions         - AI-generated improvements"
    ;;
esac
