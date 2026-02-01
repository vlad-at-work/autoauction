#!/bin/bash

# Get MAX Webhook Subscription Info
# Usage: ./scripts/webhooks/info-max.sh

set -e

if [ -z "$MAX_BOT_TOKEN" ]; then
  echo "❌ Error: MAX_BOT_TOKEN not set"
  echo "Run: export MAX_BOT_TOKEN=your_token"
  exit 1
fi

echo "🔍 Fetching MAX webhook subscription info..."
echo ""

# Get subscription info
RESPONSE=$(curl -s -X GET \
  "https://platform-api.max.ru/subscriptions" \
  -H "Authorization: $MAX_BOT_TOKEN")

echo "$RESPONSE" | jq '.'

# Extract and display key info
URL=$(echo "$RESPONSE" | jq -r '.subscriptions[0].url // "None"')

echo ""
echo "Summary:"
echo "  Webhook URL: $URL"
