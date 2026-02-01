#!/bin/bash

# Register MAX Webhook (Subscription)
# Usage: ./scripts/webhooks/register-max.sh <webhook_url>

set -e

# Check for required environment variables
if [ -z "$MAX_BOT_TOKEN" ]; then
  echo "❌ Error: MAX_BOT_TOKEN not set"
  echo "Run: export MAX_BOT_TOKEN=your_token"
  exit 1
fi

# Get webhook URL from argument
WEBHOOK_URL="$1"
if [ -z "$WEBHOOK_URL" ]; then
  echo "❌ Error: Webhook URL required"
  echo "Usage: $0 <webhook_url>"
  echo ""
  echo "Examples:"
  echo "  Development: $0 https://abc123.ngrok.io/api/webhooks/max"
  echo "  Production:  $0 https://autoauction-two.vercel.app/api/webhooks/max"
  exit 1
fi

echo "🔄 Registering MAX webhook subscription..."
echo "   URL: $WEBHOOK_URL"

# Build JSON payload - subscribe to all relevant event types
PAYLOAD=$(cat <<EOF
{
  "url": "$WEBHOOK_URL",
  "update_types": [
    "message_new",
    "message_callback",
    "message_event"
  ]
}
EOF
)

# Register subscription
RESPONSE=$(curl -s -X POST \
  "https://platform-api.max.ru/v1/subscriptions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MAX_BOT_TOKEN" \
  -d "$PAYLOAD")

echo ""
echo "Response:"
echo "$RESPONSE" | jq '.'

# Check if successful (MAX API returns subscription object on success)
if echo "$RESPONSE" | jq -e '.url' > /dev/null 2>&1; then
  echo ""
  echo "✅ MAX webhook subscription registered successfully!"
  echo ""
  echo "Verify with: ./scripts/webhooks/info-max.sh"
else
  echo ""
  echo "❌ Failed to register webhook subscription"
  echo ""
  echo "Note: You may need to delete existing subscription first:"
  echo "  ./scripts/webhooks/delete-max.sh"
  exit 1
fi
