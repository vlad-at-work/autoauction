#!/bin/bash

# Test helper to load env and run webhook commands
# Usage: ./scripts/webhooks/test.sh

# Extract only the needed variables
TG_BOT_TOKEN=$(grep "^TG_BOT_TOKEN=" .env.local | cut -d'=' -f2 | tr -d '"')
MAX_BOT_TOKEN=$(grep "^MAX_BOT_TOKEN=" .env.local | cut -d'=' -f2 | tr -d '"')
TG_WEBHOOK_SECRET=$(grep "^TG_WEBHOOK_SECRET=" .env.local | cut -d'=' -f2 | tr -d '"')

export TG_BOT_TOKEN
export MAX_BOT_TOKEN
export TG_WEBHOOK_SECRET

echo "Loaded environment variables"
echo "TG_BOT_TOKEN: ${TG_BOT_TOKEN:0:20}..."
echo "MAX_BOT_TOKEN: ${MAX_BOT_TOKEN:0:20}..."
echo "TG_WEBHOOK_SECRET: ${TG_WEBHOOK_SECRET:0:20}..."
echo ""

if [ -z "$1" ]; then
  echo "Testing Telegram..."
  ./scripts/webhooks/info-telegram.sh
  echo ""
  echo "Testing MAX..."
  ./scripts/webhooks/info-max.sh
else
  exec "$@"
fi
