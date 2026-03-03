#!/bin/bash

# Integration Test - Send test messages through both bots
# This requires a test user chat ID to send messages to

set -e

TG_BOT_TOKEN=$(grep "^TG_BOT_TOKEN=" .env.local | cut -d'=' -f2 | tr -d '"')
MAX_BOT_TOKEN=$(grep "^MAX_BOT_TOKEN=" .env.local | cut -d'=' -f2 | tr -d '"')
export TG_BOT_TOKEN MAX_BOT_TOKEN

if [ -z "$TG_BOT_TOKEN" ] || [ -z "$MAX_BOT_TOKEN" ]; then
  echo "❌ Bot tokens not found in .env.local"
  exit 1
fi

echo "========================================="
echo "  Webhook Integration Tests"
echo "========================================="
echo ""
echo "Note: These tests verify webhook endpoints can receive messages"
echo "      Real message delivery requires a user chat ID from actual user interaction"
echo ""

# Test 1: Telegram - Send a test message to ourselves (admin)
echo "Test 1️⃣  - Telegram: Send Test Message"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "To complete this test, you need:"
echo "  1. A user chat ID from an actual user who has interacted with the bot"
echo "  2. Run: ./scripts/webhooks/test-integration.sh <TELEGRAM_CHAT_ID>"
echo ""
echo "Alternatively, you can:"
echo "  1. Open Telegram and search for @autoauction_bot"
echo "  2. Send /start command"
echo "  3. This creates a webhook event that the app handles"
echo ""

# If chat ID is provided, test sending a message
if [ -n "$1" ]; then
  CHAT_ID="$1"

  echo "Sending test message to Telegram chat: $CHAT_ID"

  RESPONSE=$(curl -s -X POST \
    "https://api.telegram.org/bot$TG_BOT_TOKEN/sendMessage" \
    -H "Content-Type: application/json" \
    -d '{
      "chat_id": '"$CHAT_ID"',
      "text": "🧪 Test Message from AutoAuction Bot\n\nThis is a connectivity test.",
      "parse_mode": "HTML"
    }')

  echo "$RESPONSE" | jq '.'

  MESSAGE_ID=$(echo "$RESPONSE" | jq -r '.result.message_id // "null"')

  if [ "$MESSAGE_ID" != "null" ]; then
    echo "✅ Telegram message sent successfully"
    echo "   Message ID: $MESSAGE_ID"
  else
    echo "❌ Failed to send Telegram message"
    ERROR=$(echo "$RESPONSE" | jq -r '.description // "Unknown error"')
    echo "   Error: $ERROR"
  fi
fi

echo ""

# Test 2: MAX - List messages to verify webhook connection
echo "Test 2️⃣  - MAX: Webhook Connectivity"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RESPONSE=$(curl -s -X GET \
  "https://platform-api.max.ru/me" \
  -H "Authorization: $MAX_BOT_TOKEN")

BOT_ID=$(echo "$RESPONSE" | jq -r '.user_id')
LAST_ACTIVITY=$(echo "$RESPONSE" | jq -r '.last_activity_time')

if [ "$BOT_ID" != "null" ]; then
  echo "✅ MAX Bot Connected"
  echo "   Bot ID: $BOT_ID"
  echo "   Last activity: $LAST_ACTIVITY"
else
  echo "❌ MAX Bot not responding"
  exit 1
fi

echo ""

# Test 3: Check webhook event queue
echo "Test 3️⃣  - Check Pending Webhook Events"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RESPONSE=$(curl -s -X GET \
  "https://api.telegram.org/bot$TG_BOT_TOKEN/getWebhookInfo")

PENDING=$(echo "$RESPONSE" | jq -r '.result.pending_update_count')

echo "Telegram pending updates: $PENDING"

if [ "$PENDING" -gt 0 ]; then
  echo "⚠️  There are $PENDING pending webhook events"
  echo "   These will be delivered when webhook is restored"
else
  echo "✅ No pending webhook events"
fi

echo ""

# Test 4: Verify webhook URLs are accessible
echo "Test 4️⃣  - Webhook URL Accessibility"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TG_WEBHOOK="https://svoauto.ru/api/webhooks/telegram"
MAX_WEBHOOK="https://svoauto.ru/api/webhooks/max"

TG_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$TG_WEBHOOK" \
  -H "Content-Type: application/json" \
  -d '{}')

MAX_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$MAX_WEBHOOK" \
  -H "Content-Type: application/json" \
  -d '{}')

echo "Telegram webhook: HTTP $TG_STATUS"
echo "MAX webhook: HTTP $MAX_STATUS"

if [ "$TG_STATUS" = "403" ] || [ "$TG_STATUS" = "400" ]; then
  echo "✅ Telegram webhook is accessible (proper error handling)"
elif [ "$TG_STATUS" = "200" ]; then
  echo "⚠️  Telegram webhook returned 200 (may accept empty requests)"
else
  echo "❌ Telegram webhook error: $TG_STATUS"
fi

if [ "$MAX_STATUS" = "400" ] || [ "$MAX_STATUS" = "200" ]; then
  echo "✅ MAX webhook is accessible"
else
  echo "❌ MAX webhook error: $MAX_STATUS"
fi

echo ""

# Summary
echo "========================================="
echo "Integration Test Complete"
echo "========================================="
echo ""
echo "To test actual message delivery:"
echo "  1. Open Telegram: t.me/autoauction_bot"
echo "  2. Send /start command"
echo "  3. Check server logs: tail -f /var/log/autoauction/app.log"
echo "  4. You should see webhook POST events"
echo ""
echo "To test MAX:"
echo "  1. Open MAX messenger"
echo "  2. Find AutoAuction bot"
echo "  3. Send /start command"
echo "  4. Check server logs for webhook events"
echo ""
