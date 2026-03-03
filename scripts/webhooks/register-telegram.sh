#!/bin/bash

# Register Telegram Webhook
# Usage: ./scripts/webhooks/register-telegram.sh <webhook_url> [secret]

set -e

# Check for required environment variables
if [ -z "$TG_BOT_TOKEN" ]; then
  echo "❌ Error: TG_BOT_TOKEN not set"
  echo "Run: export TG_BOT_TOKEN=your_token"
  exit 1
fi

# Get webhook URL from argument
WEBHOOK_URL="$1"
if [ -z "$WEBHOOK_URL" ]; then
  echo "❌ Error: Webhook URL required"
  echo "Usage: $0 <webhook_url> [secret]"
  echo ""
  echo "Examples:"
  echo "  Development: $0 https://abc123.ngrok.io/api/webhooks/telegram"
  echo "  Production:  $0 https://svoauto.ru/api/webhooks/telegram"
  exit 1
fi

# Get secret from argument or environment
SECRET="${2:-$TG_WEBHOOK_SECRET}"
if [ -z "$SECRET" ]; then
  echo "⚠️  Warning: No webhook secret provided"
  echo "Generate one with: openssl rand -hex 32"
  echo ""
  read -p "Continue without secret? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo "🔄 Registering Telegram webhook..."
echo "   URL: $WEBHOOK_URL"
echo "   Secret: ${SECRET:0:10}..." # Show first 10 chars only

# Build JSON payload
if [ -n "$SECRET" ]; then
  PAYLOAD=$(cat <<EOF
{
  "url": "$WEBHOOK_URL",
  "secret_token": "$SECRET",
  "drop_pending_updates": true,
  "allowed_updates": ["message", "callback_query", "web_app_data"]
}
EOF
)
else
  PAYLOAD=$(cat <<EOF
{
  "url": "$WEBHOOK_URL",
  "drop_pending_updates": true,
  "allowed_updates": ["message", "callback_query", "web_app_data"]
}
EOF
)
fi

# Register webhook
RESPONSE=$(curl -s -X POST \
  "https://api.telegram.org/bot$TG_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

echo ""
echo "Response:"
echo "$RESPONSE" | jq '.'

# Check if successful
if echo "$RESPONSE" | jq -e '.ok == true' > /dev/null; then
  echo ""
  echo "✅ Telegram webhook registered successfully!"
  echo ""
  echo "Verify with: ./scripts/webhooks/info-telegram.sh"
else
  echo ""
  echo "❌ Failed to register webhook"
  exit 1
fi
