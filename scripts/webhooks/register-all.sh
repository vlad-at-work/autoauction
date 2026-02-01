#!/bin/bash

# Register All Webhooks (Development + Production)
# Usage: ./scripts/webhooks/register-all.sh [ngrok_url]

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Production URL (Vercel)
PROD_URL="https://autoauction-two.vercel.app"

# Development URL (ngrok - optional argument)
DEV_URL="$1"

echo "========================================="
echo "  AutoAuction Webhook Registration"
echo "========================================="
echo ""

# Check environment variables
if [ -z "$TG_BOT_TOKEN" ] || [ -z "$MAX_BOT_TOKEN" ] || [ -z "$TG_WEBHOOK_SECRET" ]; then
  echo "❌ Missing required environment variables"
  echo ""
  echo "Please set:"
  echo "  export TG_BOT_TOKEN='your_telegram_token'"
  echo "  export MAX_BOT_TOKEN='your_max_token'"
  echo "  export TG_WEBHOOK_SECRET='your_webhook_secret'"
  echo ""
  echo "Generate secret with: openssl rand -hex 32"
  exit 1
fi

echo -e "${GREEN}✓${NC} Environment variables found"
echo ""

# Register Production Webhooks
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  PRODUCTION (Vercel)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📱 Registering Telegram webhook..."
./scripts/webhooks/register-telegram.sh "$PROD_URL/api/webhooks/telegram" "$TG_WEBHOOK_SECRET"
echo ""

echo "📱 Registering MAX webhook..."
./scripts/webhooks/register-max.sh "$PROD_URL/api/webhooks/max"
echo ""

# Register Development Webhooks (if ngrok URL provided)
if [ -n "$DEV_URL" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  DEVELOPMENT (ngrok)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  echo -e "${YELLOW}⚠️  Note: Development webhooks will OVERRIDE production!${NC}"
  echo "   Only use for local testing, then switch back to production."
  echo ""

  read -p "Continue with development registration? (y/N): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "📱 Registering Telegram webhook (dev)..."
    ./scripts/webhooks/register-telegram.sh "$DEV_URL/api/webhooks/telegram" "$TG_WEBHOOK_SECRET"
    echo ""

    echo "📱 Registering MAX webhook (dev)..."
    ./scripts/webhooks/register-max.sh "$DEV_URL/api/webhooks/max"
    echo ""
  else
    echo "Skipped development registration."
    echo ""
  fi
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Webhook Registration Complete${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Verify with:"
echo "  ./scripts/webhooks/info-telegram.sh"
echo "  ./scripts/webhooks/info-max.sh"
echo ""

if [ -n "$DEV_URL" ]; then
  echo -e "${YELLOW}Remember:${NC} Switch back to production when done testing!"
  echo "  ./scripts/webhooks/register-all.sh"
  echo ""
fi
