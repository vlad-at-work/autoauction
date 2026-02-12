#!/bin/bash

# Check Webhook Status for AutoAuction
# Shows current webhook configuration for all bots
# Usage: ./scripts/check-hooks.sh

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
echo "  AutoAuction Webhook Status Check"
echo "=========================================="
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
  else
    echo -e "${YELLOW}⚠ .env.local not found${NC}"
    echo "Using existing environment variables..."
    echo ""
  fi
}

# Load environment
load_env

# Check for jq
if ! command -v jq &> /dev/null; then
  echo -e "${RED}❌ jq is required but not installed${NC}"
  exit 1
fi

echo "Checking webhook status..."
echo ""

# ============================================
# MAX WEBHOOKS
# ============================================
echo "📱 MAX Platform"
echo "----------------"

# Customer Bot
if [ -n "$MAX_BOT_TOKEN" ]; then
  echo -e "${BLUE}Customer Bot ($MAX_BOT_NAME):${NC}"
  response=$(curl -s -H "Authorization: $MAX_BOT_TOKEN" \
    "https://platform-api.max.ru/subscriptions" 2>/dev/null || echo '{"error": "Connection failed"}')
  
  if echo "$response" | jq -e '.subscriptions | length > 0' > /dev/null 2>&1; then
    echo -e "  ${GREEN}● Active${NC}"
    echo "$response" | jq -r '.subscriptions[] | "    URL: \(.url)"'
  elif echo "$response" | jq -e '.url' > /dev/null 2>&1; then
    echo -e "  ${GREEN}● Active${NC}"
    echo "    URL: $(echo "$response" | jq -r '.url')"
  elif echo "$response" | jq -e '.error' > /dev/null 2>&1; then
    echo -e "  ${RED}✗ Error: $(echo "$response" | jq -r '.error')${NC}"
  else
    echo -e "  ${YELLOW}○ No webhook registered${NC}"
  fi
else
  echo -e "  ${YELLOW}⚠ MAX_BOT_TOKEN not set${NC}"
fi
echo ""

# Dealer Bot
if [ -n "$MAX_BOT_TOKEN_DEALER" ]; then
  echo -e "${BLUE}Dealer Bot ($MAX_BOT_NAME_DEALER):${NC}"
  response=$(curl -s -H "Authorization: $MAX_BOT_TOKEN_DEALER" \
    "https://platform-api.max.ru/subscriptions" 2>/dev/null || echo '{"error": "Connection failed"}')
  
  if echo "$response" | jq -e '.subscriptions | length > 0' > /dev/null 2>&1; then
    echo -e "  ${GREEN}● Active${NC}"
    echo "$response" | jq -r '.subscriptions[] | "    URL: \(.url)"'
  elif echo "$response" | jq -e '.url' > /dev/null 2>&1; then
    echo -e "  ${GREEN}● Active${NC}"
    echo "    URL: $(echo "$response" | jq -r '.url')"
  elif echo "$response" | jq -e '.error' > /dev/null 2>&1; then
    echo -e "  ${RED}✗ Error: $(echo "$response" | jq -r '.error')${NC}"
  else
    echo -e "  ${YELLOW}○ No webhook registered${NC}"
  fi
else
  echo -e "  ${YELLOW}⚠ MAX_BOT_TOKEN_DEALER not set${NC}"
fi
echo ""

# ============================================
# TELEGRAM WEBHOOKS
# ============================================
echo "💬 Telegram"
echo "-----------"

# Customer Bot
if [ -n "$TG_BOT_TOKEN" ]; then
  echo -e "${BLUE}Customer Bot ($TG_BOT_NAME):${NC}"
  response=$(curl -s "https://api.telegram.org/bot${TG_BOT_TOKEN}/getWebhookInfo" 2>/dev/null || echo '{"ok": false}')
  
  if echo "$response" | jq -e '.ok == true' > /dev/null 2>&1; then
    result=$(echo "$response" | jq '.result')
    url=$(echo "$result" | jq -r '.url')
    
    if [ -n "$url" ] && [ "$url" != "null" ] && [ "$url" != "" ]; then
      echo -e "  ${GREEN}● Active${NC}"
      echo "    URL: $url"
      echo "    Pending updates: $(echo "$result" | jq -r '.pending_update_count // 0')"
      echo "    Max connections: $(echo "$result" | jq -r '.max_connections // 40')"
      ip=$(echo "$result" | jq -r '.ip_address // "N/A"')
      if [ "$ip" != "null" ] && [ "$ip" != "" ]; then
        echo "    IP: $ip"
      fi
    else
      echo -e "  ${YELLOW}○ No webhook registered (using polling)${NC}"
    fi
  else
    echo -e "  ${RED}✗ Failed to get info${NC}"
  fi
else
  echo -e "  ${YELLOW}⚠ TG_BOT_TOKEN not set${NC}"
fi
echo ""

# Dealer Bot
if [ -n "$TG_BOT_TOKEN_DEALER" ]; then
  echo -e "${BLUE}Dealer Bot ($TG_BOT_NAME_DEALER):${NC}"
  response=$(curl -s "https://api.telegram.org/bot${TG_BOT_TOKEN_DEALER}/getWebhookInfo" 2>/dev/null || echo '{"ok": false}')
  
  if echo "$response" | jq -e '.ok == true' > /dev/null 2>&1; then
    result=$(echo "$response" | jq '.result')
    url=$(echo "$result" | jq -r '.url')
    
    if [ -n "$url" ] && [ "$url" != "null" ] && [ "$url" != "" ]; then
      echo -e "  ${GREEN}● Active${NC}"
      echo "    URL: $url"
      echo "    Pending updates: $(echo "$result" | jq -r '.pending_update_count // 0')"
      echo "    Max connections: $(echo "$result" | jq -r '.max_connections // 40')"
      ip=$(echo "$result" | jq -r '.ip_address // "N/A"')
      if [ "$ip" != "null" ] && [ "$ip" != "" ]; then
        echo "    IP: $ip"
      fi
    else
      echo -e "  ${YELLOW}○ No webhook registered (using polling)${NC}"
    fi
  else
    echo -e "  ${RED}✗ Failed to get info${NC}"
  fi
else
  echo -e "  ${YELLOW}⚠ TG_BOT_TOKEN_DEALER not set${NC}"
fi

echo ""
echo "=========================================="
echo ""
echo "To set up webhooks, run:"
echo "  ./scripts/setup-hooks.sh"
echo ""
echo "To delete webhooks, run:"
echo "  ./scripts/delete-hooks.sh"
