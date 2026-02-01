#!/bin/bash

# Delete Telegram Webhook
# Usage: ./scripts/webhooks/delete-telegram.sh

set -e

if [ -z "$TG_BOT_TOKEN" ]; then
  echo "❌ Error: TG_BOT_TOKEN not set"
  echo "Run: export TG_BOT_TOKEN=your_token"
  exit 1
fi

echo "🔄 Deleting Telegram webhook..."

RESPONSE=$(curl -s -X POST \
  "https://api.telegram.org/bot$TG_BOT_TOKEN/deleteWebhook" \
  -H "Content-Type: application/json" \
  -d '{"drop_pending_updates": true}')

echo ""
echo "Response:"
echo "$RESPONSE" | jq '.'

if echo "$RESPONSE" | jq -e '.ok == true' > /dev/null; then
  echo ""
  echo "✅ Telegram webhook deleted successfully!"
else
  echo ""
  echo "❌ Failed to delete webhook"
  exit 1
fi
