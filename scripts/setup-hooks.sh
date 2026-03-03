#!/bin/bash

# Setup Webhooks for AutoAuction
# Registers both customer and dealer webhooks for MAX and Telegram platforms
# Usage: ./scripts/setup-hooks.sh [webhook_base_url]
#
# Examples:
#   Production:  ./scripts/setup-hooks.sh
#   Development: ./scripts/setup-hooks.sh https://abc123.ngrok.io

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

# Default webhook base URL (production)
DEFAULT_WEBHOOK_URL="https://svoauto.ru"
WEBHOOK_URL="${1:-$DEFAULT_WEBHOOK_URL}"

echo "=========================================="
echo "  AutoAuction Webhook Setup"
echo "=========================================="
echo ""
echo "Base URL: $WEBHOOK_URL"
echo ""

# Function to load env vars from .env.local
load_env() {
  if [ -f "$ENV_FILE" ]; then
    echo -e "${BLUE}Loading environment from $ENV_FILE...${NC}"
    # Export all variables from .env.local, ignoring comments and empty lines
    set -a
    source "$ENV_FILE"
    set +a
    echo -e "${GREEN}✓ Environment loaded${NC}"
    echo ""
  else
    echo -e "${YELLOW}⚠ .env.local not found at $ENV_FILE${NC}"
    echo "Using existing environment variables..."
    echo ""
  fi
}

# Function to check if required variable is set
check_var() {
  local var_name=$1
  local var_value=${!var_name}
  if [ -z "$var_value" ]; then
    echo -e "${RED}❌ Error: $var_name is not set${NC}"
    return 1
  else
    echo -e "${GREEN}✓ $var_name is set${NC}"
    return 0
  fi
}

# Function to register MAX webhook
register_max_webhook() {
  local token=$1
  local bot_type=$2
  local url="${WEBHOOK_URL}/api/webhooks/max?bot=${bot_type}"

  echo -e "${BLUE}Registering MAX ${bot_type} bot...${NC}"
  echo "  URL: $url"
  
  local response
  response=$(curl -s -X POST \
    "https://platform-api.max.ru/subscriptions" \
    -H "Content-Type: application/json" \
    -H "Authorization: $token" \
    -d "{\"url\": \"$url\", \"update_types\": [\"message_created\", \"bot_started\", \"message_callback\"]}" 2>/dev/null || echo '{"error": "Connection failed"}')
  
  # Check response
  if echo "$response" | jq -e '.success == true or .url' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ MAX ${bot_type} webhook registered${NC}"
    return 0
  else
    local error_msg=$(echo "$response" | jq -r '.message // .error // "Unknown error"')
    echo -e "${RED}✗ MAX ${bot_type} failed: $error_msg${NC}"
    return 1
  fi
}

# Function to register Telegram webhook
register_telegram_webhook() {
  local token=$1
  local secret=$2
  local bot_type=$3
  local url="${WEBHOOK_URL}/api/webhooks/telegram?bot=${bot_type}"
  
  echo -e "${BLUE}Registering Telegram ${bot_type} bot...${NC}"
  echo "  URL: $url"
  
  local payload
  if [ -n "$secret" ]; then
    payload=$(jq -n \
      --arg url "$url" \
      --arg secret "$secret" \
      '{url: $url, secret_token: $secret, drop_pending_updates: true, allowed_updates: ["message", "callback_query", "web_app_data"]}')
  else
    payload=$(jq -n \
      --arg url "$url" \
      '{url: $url, drop_pending_updates: true, allowed_updates: ["message", "callback_query", "web_app_data"]}')
  fi
  
  local response
  response=$(curl -s -X POST \
    "https://api.telegram.org/bot${token}/setWebhook" \
    -H "Content-Type: application/json" \
    -d "$payload" 2>/dev/null || echo '{"ok": false, "description": "Connection failed"}')
  
  # Check response
  if echo "$response" | jq -e '.ok == true' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Telegram ${bot_type} webhook registered${NC}"
    return 0
  else
    local error_msg=$(echo "$response" | jq -r '.description // "Unknown error"')
    echo -e "${RED}✗ Telegram ${bot_type} failed: $error_msg${NC}"
    return 1
  fi
}

# Function to get MAX webhook info
get_max_info() {
  local token=$1
  local bot_type=$2
  
  local response
  response=$(curl -s -H "Authorization: $token" \
    "https://platform-api.max.ru/subscriptions" 2>/dev/null || echo '{"error": "Connection failed"}')
  
  echo "  MAX ${bot_type}:"
  if echo "$response" | jq -e '.url' > /dev/null 2>&1; then
    echo "    URL: $(echo "$response" | jq -r '.url')"
    echo "    Updated: $(echo "$response" | jq -r '.updated_at // "N/A"')"
  else
    echo "    No active webhook"
  fi
}

# Function to get Telegram webhook info
get_telegram_info() {
  local token=$1
  local bot_type=$2
  
  local response
  response=$(curl -s "https://api.telegram.org/bot${token}/getWebhookInfo" 2>/dev/null || echo '{"ok": false}')
  
  echo "  Telegram ${bot_type}:"
  if echo "$response" | jq -e '.ok == true' > /dev/null 2>&1; then
    local result=$(echo "$response" | jq '.result')
    echo "    URL: $(echo "$result" | jq -r '.url // "Not set"')"
    echo "    Pending updates: $(echo "$result" | jq -r '.pending_update_count // 0')"
    local has_custom_cert=$(echo "$result" | jq -r '.has_custom_certificate // false')
    if [ "$has_custom_cert" = "true" ]; then
      echo "    Custom certificate: Yes"
    fi
  else
    echo "    Failed to get info"
  fi
}

# ============================================
# MAIN EXECUTION
# ============================================

# Load environment variables
load_env

# Check for jq dependency
if ! command -v jq &> /dev/null; then
  echo -e "${RED}❌ Error: jq is required but not installed${NC}"
  echo "Install with:"
  echo "  macOS: brew install jq"
  echo "  Ubuntu/Debian: sudo apt-get install jq"
  exit 1
fi

echo "Checking required environment variables..."
echo ""

# Track if all checks pass
ALL_CHECKS_PASS=true

# Check MAX variables
check_var "MAX_BOT_TOKEN" || ALL_CHECKS_PASS=false
check_var "MAX_BOT_TOKEN_DEALER" || ALL_CHECKS_PASS=false
echo ""

# Check Telegram variables  
check_var "TG_BOT_TOKEN" || ALL_CHECKS_PASS=false
check_var "TG_BOT_TOKEN_DEALER" || ALL_CHECKS_PASS=false

# Secrets are optional but recommended
if [ -z "$TG_WEBHOOK_SECRET" ]; then
  echo -e "${YELLOW}⚠ TG_WEBHOOK_SECRET not set (customer bot will be insecure)${NC}"
fi
if [ -z "$TG_DEALER_WEBHOOK_SECRET" ]; then
  echo -e "${YELLOW}⚠ TG_DEALER_WEBHOOK_SECRET not set (dealer bot will be insecure)${NC}"
fi

echo ""

if [ "$ALL_CHECKS_PASS" = false ]; then
  echo -e "${RED}❌ Required environment variables are missing${NC}"
  echo ""
  echo "Make sure .env.local exists in the project root with these variables:"
  echo "  MAX_BOT_TOKEN, MAX_BOT_TOKEN_DEALER"
  echo "  TG_BOT_TOKEN, TG_BOT_TOKEN_DEALER"
  exit 1
fi

echo -e "${GREEN}✓ All required variables are set${NC}"
echo ""
echo "=========================================="
echo ""

# Ask for confirmation
if [ "$WEBHOOK_URL" = "$DEFAULT_WEBHOOK_URL" ]; then
  echo -e "${YELLOW}You are about to register PRODUCTION webhooks${NC}"
  echo "Target: $WEBHOOK_URL"
else
  echo -e "${BLUE}You are about to register DEVELOPMENT webhooks${NC}"
  echo "Target: $WEBHOOK_URL"
  echo ""
  echo -e "${YELLOW}⚠ This will OVERRIDE production webhooks!${NC}"
fi

echo ""
read -p "Continue? (y/N): " -n 1 -r
echo ""
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 0
fi

# Register webhooks
echo "Registering webhooks..."
echo ""

SUCCESS_COUNT=0
TOTAL_COUNT=4

# MAX Customer Bot
if register_max_webhook "$MAX_BOT_TOKEN" "customer"; then
  ((SUCCESS_COUNT++))
fi
echo ""

# MAX Dealer Bot
if register_max_webhook "$MAX_BOT_TOKEN_DEALER" "dealer"; then
  ((SUCCESS_COUNT++))
fi
echo ""

# Telegram Customer Bot
if register_telegram_webhook "$TG_BOT_TOKEN" "$TG_WEBHOOK_SECRET" "customer"; then
  ((SUCCESS_COUNT++))
fi
echo ""

# Telegram Dealer Bot
if register_telegram_webhook "$TG_BOT_TOKEN_DEALER" "$TG_DEALER_WEBHOOK_SECRET" "dealer"; then
  ((SUCCESS_COUNT++))
fi
echo ""

echo "=========================================="
echo ""
echo "Registration complete: ${SUCCESS_COUNT}/${TOTAL_COUNT} webhooks registered"
echo ""

# Show current status
echo "Current webhook status:"
echo ""
get_max_info "$MAX_BOT_TOKEN" "customer"
get_max_info "$MAX_BOT_TOKEN_DEALER" "dealer"
echo ""
get_telegram_info "$TG_BOT_TOKEN" "customer"
get_telegram_info "$TG_BOT_TOKEN_DEALER" "dealer"

echo ""
echo "=========================================="
echo ""

if [ "$WEBHOOK_URL" != "$DEFAULT_WEBHOOK_URL" ]; then
  echo -e "${YELLOW}⚠ Remember to switch back to production after testing:${NC}"
  echo "  ./scripts/setup-hooks.sh"
  echo ""
fi

echo "Test the bots by sending /start to each bot"
echo "  MAX Customer: https://max.ru/$MAX_BOT_NAME"
echo "  MAX Dealer:   https://max.ru/$MAX_BOT_NAME_DEALER"
echo "  TG Customer:  t.me/$TG_BOT_NAME"
echo "  TG Dealer:    t.me/$TG_BOT_NAME_DEALER"
