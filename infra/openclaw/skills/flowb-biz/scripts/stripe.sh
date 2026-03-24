#!/bin/bash
# Stripe management for FlowB EC sites
# Usage: bash scripts/stripe.sh <command> [args...]

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/flowb-api.sh"

SITE="${FLOWB_DEFAULT_SITE:-nored-farms}"

case "${1:-help}" in
  products)
    flowb_call POST "/api/v1/chat" "{\"message\":\"list Stripe products on $SITE\"}" | format_json
    ;;
  orders)
    STATUS="${2:-}"
    LIMIT="${3:-20}"
    flowb_call POST "/api/v1/chat" "{\"message\":\"list orders on $SITE${STATUS:+ with status $STATUS} limit $LIMIT\"}" | format_json
    ;;
  revenue)
    PERIOD="${2:-monthly}"
    flowb_call POST "/api/v1/chat" "{\"message\":\"show $PERIOD revenue for $SITE\"}" | format_json
    ;;
  checkout)
    PRICE_ID="$2"
    QTY="${3:-1}"
    flowb_call POST "/api/v1/chat" "{\"message\":\"create checkout link for price $PRICE_ID quantity $QTY on $SITE\"}" | format_json
    ;;
  refund)
    PAYMENT_ID="$2"
    AMOUNT="${3:-}"
    MSG="refund payment $PAYMENT_ID on $SITE"
    [ -n "$AMOUNT" ] && MSG="$MSG for \$$AMOUNT"
    flowb_call POST "/api/v1/chat" "{\"message\":\"$MSG\"}" | format_json
    ;;
  *)
    echo "Usage: stripe.sh <products|orders|revenue|checkout|refund> [args]"
    echo ""
    echo "Commands:"
    echo "  products                     - List Stripe products"
    echo "  orders [status] [limit]      - List orders"
    echo "  revenue [daily|weekly|monthly] - Revenue summary"
    echo "  checkout <price_id> [qty]    - Create checkout link"
    echo "  refund <payment_id> [amount] - Process refund"
    ;;
esac
