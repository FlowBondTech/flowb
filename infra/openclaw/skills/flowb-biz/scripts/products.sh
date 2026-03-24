#!/bin/bash
# Product management for FlowB EC sites
# Usage: bash scripts/products.sh <command> [args...]

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/flowb-api.sh"

SITE="${FLOWB_DEFAULT_SITE:-nored-farms}"

case "${1:-help}" in
  list)
    CATEGORY="${2:-}"
    PARAMS="site=$SITE"
    [ -n "$CATEGORY" ] && PARAMS="$PARAMS&category=$CATEGORY"
    flowb_call GET "/api/v1/biz/site-proxy/$SITE/content-products?$PARAMS" | format_json
    ;;
  add)
    NAME="$2"
    PRICE="$3"
    CATEGORY="${4:-general}"
    DESC="${5:-}"
    BODY=$(cat <<EOF
{"site":"$SITE","name":"$NAME","price":$PRICE,"category":"$CATEGORY","description":"$DESC"}
EOF
    )
    flowb_call POST "/api/v1/chat" "{\"message\":\"add product $NAME for \$$PRICE in $CATEGORY category on $SITE. Description: $DESC\"}" | format_json
    ;;
  update)
    ID="$2"
    shift 2
    flowb_call POST "/api/v1/chat" "{\"message\":\"update product $ID on $SITE: $*\"}" | format_json
    ;;
  delete)
    ID="$2"
    flowb_call POST "/api/v1/chat" "{\"message\":\"delete product $ID on $SITE\"}" | format_json
    ;;
  sync-stripe)
    flowb_call POST "/api/v1/chat" "{\"message\":\"sync stripe products on $SITE\"}" | format_json
    ;;
  *)
    echo "Usage: products.sh <list|add|update|delete|sync-stripe> [args]"
    echo ""
    echo "Commands:"
    echo "  list [category]           - List products"
    echo "  add <name> <price> [cat]  - Add product"
    echo "  update <id> <fields...>   - Update product"
    echo "  delete <id>               - Delete product"
    echo "  sync-stripe               - Sync with Stripe"
    ;;
esac
