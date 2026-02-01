#!/bin/bash

# Get Telegram Webhook Info
# Usage: ./scripts/webhooks/info-telegram.sh

set -e

if [ -z "$TG_BOT_TOKEN" ]; then
  echo "❌ Error: TG_BOT_TOKEN not set"
  echo "Run: export TG_BOT_TOKEN=your_token"
  exit 1
fi

echo "🔍 Fetching Telegram webhook info..."
echo ""

RESPONSE=$(curl -s "https://api.telegram.org/bot$TG_BOT_TOKEN/getWebhookInfo")

echo "$RESPONSE" | jq '.'

# Extract and display key info
URL=$(echo "$RESPONSE" | jq -r '.result.url')
PENDING=$(echo "$RESPONSE" | jq -r '.result.pending_update_count')
LAST_ERROR=$(echo "$RESPONSE" | jq -r '.result.last_error_message')

echo ""
echo "Summary:"
echo "  URL: $URL"
echo "  Pending updates: $PENDING"
if [ "$LAST_ERROR" != "null" ]; then
  echo "  ⚠️  Last error: $LAST_ERROR"
fi
