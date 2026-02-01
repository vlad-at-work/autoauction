#!/bin/bash

# Comprehensive MAX Bot API Tests
# Verifies bot connectivity and functionality

set -e

MAX_BOT_TOKEN=$(grep "^MAX_BOT_TOKEN=" .env.local | cut -d'=' -f2 | tr -d '"')
export MAX_BOT_TOKEN

if [ -z "$MAX_BOT_TOKEN" ]; then
  echo "❌ MAX_BOT_TOKEN not found in .env.local"
  exit 1
fi

echo "========================================="
echo "  MAX Bot API Tests"
echo "========================================="
echo ""

# Test 1: Get bot info (/me)
echo "Test 1️⃣  - Get Bot Info (/me)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RESPONSE=$(curl -s -X GET \
  "https://platform-api.max.ru/me" \
  -H "Authorization: $MAX_BOT_TOKEN")

echo "$RESPONSE" | jq '.'

BOT_ID=$(echo "$RESPONSE" | jq -r '.user_id')
BOT_NAME=$(echo "$RESPONSE" | jq -r '.first_name // .name // .username')

if [ "$BOT_ID" != "null" ] && [ -n "$BOT_ID" ]; then
  echo "✅ Bot Info Retrieved"
  echo "   Bot ID: $BOT_ID"
  echo "   Bot Name: $BOT_NAME"
else
  echo "❌ Failed to get bot info"
  echo "   Check that MAX_BOT_TOKEN is valid"
  exit 1
fi

echo ""

# Test 2: Get webhook subscription info
echo "Test 2️⃣  - Get Webhook Subscription"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RESPONSE=$(curl -s -X GET \
  "https://platform-api.max.ru/subscriptions" \
  -H "Authorization: $MAX_BOT_TOKEN")

echo "$RESPONSE" | jq '.'

WEBHOOK_URL=$(echo "$RESPONSE" | jq -r '.subscriptions[0].url // "None"')
SUBSCRIPTION_COUNT=$(echo "$RESPONSE" | jq '.subscriptions | length')

if [ "$SUBSCRIPTION_COUNT" -gt 0 ]; then
  echo "✅ Webhook Subscription Active"
  echo "   URL: $WEBHOOK_URL"
  echo "   Total subscriptions: $SUBSCRIPTION_COUNT"
else
  echo "❌ No webhook subscription configured"
  exit 1
fi

echo ""

# Test 3: List chats
echo "Test 3️⃣  - List Chats"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RESPONSE=$(curl -s -X GET \
  "https://platform-api.max.ru/chats" \
  -H "Authorization: $MAX_BOT_TOKEN")

echo "$RESPONSE" | jq '.' | head -50

CHAT_COUNT=$(echo "$RESPONSE" | jq '.chats | length')

if [ "$CHAT_COUNT" -gt 0 ]; then
  echo "✅ Bot is in $CHAT_COUNT chat(s)"
  # Get first chat ID for later tests
  CHAT_ID=$(echo "$RESPONSE" | jq -r '.chats[0].id')
else
  echo "⚠️  Bot is not in any chats yet (expected before first user interaction)"
  CHAT_ID=""
fi

echo ""

# Test 4: Get messages (if we have a chat)
if [ -n "$CHAT_ID" ]; then
  echo "Test 4️⃣  - Get Messages from First Chat"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  RESPONSE=$(curl -s -X GET \
    "https://platform-api.max.ru/messages?chat_id=$CHAT_ID&limit=10" \
    -H "Authorization: $MAX_BOT_TOKEN")

  echo "$RESPONSE" | jq '.'

  MESSAGE_COUNT=$(echo "$RESPONSE" | jq '.messages | length')
  echo "✅ Retrieved $MESSAGE_COUNT message(s)"

  echo ""
fi

# Test 5: Test API connectivity with a simple request
echo "Test 5️⃣  - API Connectivity Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET \
  "https://platform-api.max.ru/me" \
  -H "Authorization: $MAX_BOT_TOKEN")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d':' -f2)

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ API Connectivity: OK (HTTP $HTTP_STATUS)"
else
  echo "❌ API Connectivity: FAILED (HTTP $HTTP_STATUS)"
  exit 1
fi

echo ""

# Summary
echo "========================================="
echo "✅ All MAX Tests Passed"
echo "========================================="
echo ""
echo "Summary:"
echo "  Bot ID: $BOT_ID"
echo "  Bot Name: $BOT_NAME"
echo "  Webhook URL: $WEBHOOK_URL"
echo "  Chats: $CHAT_COUNT"
echo "  Status: Connected and Ready"
echo ""
