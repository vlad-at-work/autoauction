#!/bin/bash

# Delete Webhooks for AutoAuction
# Removes all webhooks for MAX and Telegram platforms
# Usage: ./scripts/delete-hooks.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env.local"

echo "=========================================="
echo "  AutoAuction Webhook Deletion"
echo "=========================================="
echo ""
echo -e "${RED}⚠ WARNING: This will delete ALL webhooks!${NC}"
echo ""

# Function to load env vars from .env.local
load_env() {
  if [ -f "$ENV_FILE" ]; then
    echo -e "${BLUE}Loading environment from $ENV_FILE...${NC}"
    set -a
    source "$ENV_FILE"
    set +a
    echo -e "${GREEN}✓ Environment loaded${NC}"
    echo ""
  fi
}

# Load environment
load_env

# Confirm deletion
read -p "Are you sure you want to delete all webhooks? (yes/N): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo "Cancelled."
  exit 0
fi

echo "Deleting webhooks..."
echo ""

SUCCESS_COUNT=0

# ============================================
# MAX WEBHOOKS
# ============================================
echo "📱 MAX Platform"
echo "----------------"

# Customer Bot
if [ -n "$MAX_BOT_TOKEN" ]; then
  echo -n "Customer Bot: "
  response=$(curl -s -X DELETE -H "Authorization: $MAX_BOT_TOKEN" \
    "https://platform-api.max.ru/subscriptions" 2>/dev/null || echo '{"error": "Connection failed"}')
  
  if echo "$response" | jq -e '.success == true' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Deleted${NC}"
    ((SUCCESS_COUNT++))
  else
    echo -e "${YELLOW}○ No webhook to delete${NC}"
  fi
else
  echo -e "${YELLOW}⚠ MAX_BOT_TOKEN not set${NC}"
fi

# Dealer Bot
if [ -n "$MAX_BOT_TOKEN_DEALER" ]; then
  echo -n "Dealer Bot: "
  response=$(curl -s -X DELETE -H "Authorization: $MAX_BOT_TOKEN_DEALER" \
    "https://platform-api.max.ru/subscriptions" 2>/dev/null || echo '{"error": "Connection failed"}')
  
  if echo "$response" | jq -e '.success == true' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Deleted${NC}"
    ((SUCCESS_COUNT++))
  else
    echo -e "${YELLOW}○ No webhook to delete${NC}"
  fi
else
  echo -e "${YELLOW}⚠ MAX_BOT_TOKEN_DEALER not set${NC}"
fi
echo ""

# ============================================
# TELEGRAM WEBHOOKS
# ============================================
echo "💬 Telegram"
echo "-----------"

# Customer Bot
if [ -n "$TG_BOT_TOKEN" ]; then
  echo -n "Customer Bot: "
  response=$(curl -s -X POST "https://api.telegram.org/bot${TG_BOT_TOKEN}/deleteWebhook" 2>/dev/null || echo '{"ok": false}')
  
  if echo "$response" | jq -e '.ok == true' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Deleted${NC}"
    ((SUCCESS_COUNT++))
  else
    echo -e "${YELLOW}○ Failed or no webhook${NC}"
  fi
else
  echo -e "${YELLOW}⚠ TG_BOT_TOKEN not set${NC}"
fi

# Dealer Bot
if [ -n "$TG_BOT_TOKEN_DEALER" ]; then
  echo -n "Dealer Bot: "
  response=$(curl -s -X POST "https://api.telegram.org/bot${TG_BOT_TOKEN_DEALER}/deleteWebhook" 2>/dev/null || echo '{"ok": false}')
  
  if echo "$response" | jq -e '.ok == true' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Deleted${NC}"
    ((SUCCESS_COUNT++))
  else
    echo -e "${YELLOW}○ Failed or no webhook${NC}"
  fi
else
  echo -e "${YELLOW}⚠ TG_BOT_TOKEN_DEALER not set${NC}"
fi

echo ""
echo "=========================================="
echo ""
echo -e "${GREEN}Deleted ${SUCCESS_COUNT} webhooks${NC}"
echo ""
echo "Bots will now use long polling (getUpdates) if active."
echo "To re-register webhooks, run:"
echo "  ./scripts/setup-hooks.sh"
