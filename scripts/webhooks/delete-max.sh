#!/bin/bash

# Delete MAX Webhook Subscription
# Usage: ./scripts/webhooks/delete-max.sh

set -e

if [ -z "$MAX_BOT_TOKEN" ]; then
  echo "❌ Error: MAX_BOT_TOKEN not set"
  echo "Run: export MAX_BOT_TOKEN=your_token"
  exit 1
fi

echo "🔄 Deleting MAX webhook subscription..."

# MAX API DELETE /subscriptions removes the subscription
RESPONSE=$(curl -s -X DELETE \
  "https://platform-api.max.ru/v1/subscriptions" \
  -H "Authorization: Bearer $MAX_BOT_TOKEN")

echo ""
if [ -z "$RESPONSE" ] || [ "$RESPONSE" == "{}" ]; then
  echo "✅ MAX webhook subscription deleted successfully!"
else
  echo "Response:"
  echo "$RESPONSE" | jq '.'

  if echo "$RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    echo ""
    echo "❌ Failed to delete subscription"
    exit 1
  else
    echo ""
    echo "✅ MAX webhook subscription deleted!"
  fi
fi
