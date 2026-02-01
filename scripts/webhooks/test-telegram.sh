#!/bin/bash

# Comprehensive Telegram Bot API Tests
# Verifies bot connectivity and functionality

set -e

TG_BOT_TOKEN=$(grep "^TG_BOT_TOKEN=" .env.local | cut -d'=' -f2 | tr -d '"')
export TG_BOT_TOKEN

if [ -z "$TG_BOT_TOKEN" ]; then
  echo "❌ TG_BOT_TOKEN not found in .env.local"
  exit 1
fi

echo "========================================="
echo "  Telegram Bot API Tests"
echo "========================================="
echo ""

# Test 1: Get bot info
echo "Test 1️⃣  - Get Bot Info"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RESPONSE=$(curl -s -X GET \
  "https://api.telegram.org/bot$TG_BOT_TOKEN/getMe")

echo "$RESPONSE" | jq '.'

BOT_ID=$(echo "$RESPONSE" | jq -r '.result.id')
BOT_USERNAME=$(echo "$RESPONSE" | jq -r '.result.username')

if [ "$BOT_ID" != "null" ]; then
  echo "✅ Bot Info Retrieved"
  echo "   Bot ID: $BOT_ID"
  echo "   Bot Username: @$BOT_USERNAME"
else
  echo "❌ Failed to get bot info"
  exit 1
fi

echo ""

# Test 2: Get webhook info
echo "Test 2️⃣  - Get Webhook Info"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RESPONSE=$(curl -s -X GET \
  "https://api.telegram.org/bot$TG_BOT_TOKEN/getWebhookInfo")

echo "$RESPONSE" | jq '.'

WEBHOOK_URL=$(echo "$RESPONSE" | jq -r '.result.url')
PENDING_UPDATES=$(echo "$RESPONSE" | jq -r '.result.pending_update_count')

if [ -n "$WEBHOOK_URL" ] && [ "$WEBHOOK_URL" != "null" ] && [ ! -z "$WEBHOOK_URL" ]; then
  echo "✅ Webhook Configured"
  echo "   URL: $WEBHOOK_URL"
  echo "   Pending updates: $PENDING_UPDATES"
else
  echo "❌ No webhook configured"
  exit 1
fi

echo ""

# Test 3: Get bot commands
echo "Test 3️⃣  - Get Bot Commands"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RESPONSE=$(curl -s -X GET \
  "https://api.telegram.org/bot$TG_BOT_TOKEN/getMyCommands")

echo "$RESPONSE" | jq '.'

COMMANDS=$(echo "$RESPONSE" | jq '.result | length')

if [ "$COMMANDS" -gt 0 ]; then
  echo "✅ Bot has $COMMANDS command(s)"
else
  echo "⚠️  No commands configured (optional)"
fi

echo ""

# Test 4: Get bot description
echo "Test 4️⃣  - Get Bot Description"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RESPONSE=$(curl -s -X GET \
  "https://api.telegram.org/bot$TG_BOT_TOKEN/getMyDescription")

echo "$RESPONSE" | jq '.'

DESCRIPTION=$(echo "$RESPONSE" | jq -r '.result.description')

if [ -n "$DESCRIPTION" ] && [ "$DESCRIPTION" != "null" ]; then
  echo "✅ Bot Description: $DESCRIPTION"
else
  echo "⚠️  No description set (optional)"
fi

echo ""

# Test 5: Get bot short description
echo "Test 5️⃣  - Get Bot Short Description"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RESPONSE=$(curl -s -X GET \
  "https://api.telegram.org/bot$TG_BOT_TOKEN/getMyShortDescription")

echo "$RESPONSE" | jq '.'

SHORT_DESC=$(echo "$RESPONSE" | jq -r '.result.short_description')

if [ -n "$SHORT_DESC" ] && [ "$SHORT_DESC" != "null" ]; then
  echo "✅ Short Description: $SHORT_DESC"
else
  echo "⚠️  No short description set (optional)"
fi

echo ""

# Summary
echo "========================================="
echo "✅ All Telegram Tests Passed"
echo "========================================="
echo ""
echo "Summary:"
echo "  Bot: @$BOT_USERNAME (ID: $BOT_ID)"
echo "  Webhook: $WEBHOOK_URL"
echo "  Status: Connected and Ready"
echo ""
