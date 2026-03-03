Webhook Management Scripts
===========================

SETUP
-----
1. Set environment variables:
   export TG_BOT_TOKEN='your_telegram_token'
   export MAX_BOT_TOKEN='your_max_token'
   export TG_WEBHOOK_SECRET='your_webhook_secret'

2. Generate webhook secret (if needed):
   openssl rand -hex 32

QUICK START
-----------
Register production webhooks (VPS reg.ru):
  ./scripts/webhooks/register-all.sh

Register production + development (ngrok):
  ./scripts/webhooks/register-all.sh https://abc123.ngrok.io

INDIVIDUAL SCRIPTS
------------------

Telegram:
  ./scripts/webhooks/register-telegram.sh <url> [secret]
  ./scripts/webhooks/delete-telegram.sh
  ./scripts/webhooks/info-telegram.sh

MAX:
  ./scripts/webhooks/register-max.sh <url>
  ./scripts/webhooks/delete-max.sh
  ./scripts/webhooks/info-max.sh

TESTING WORKFLOW
----------------
1. Start ngrok:
   ngrok http 3000

2. Copy ngrok URL (e.g., https://abc123.ngrok.io)

3. Register development webhooks:
   ./scripts/webhooks/register-all.sh https://abc123.ngrok.io

4. Start dev server:
   npm run dev

5. Test on phone with Telegram/MAX bots

6. When done, switch back to production:
   ./scripts/webhooks/register-all.sh

IMPORTANT NOTES
---------------
- Only ONE webhook can be active per bot at a time
- Development webhooks OVERRIDE production
- Always switch back to production after local testing
- Production URL: https://svoauto.ru
- MAX API docs: https://dev.max.ru/docs-api
- Telegram API docs: https://core.telegram.org/bots/api#setwebhook

TROUBLESHOOTING
---------------
Check current webhook status:
  ./scripts/webhooks/info-telegram.sh
  ./scripts/webhooks/info-max.sh

Delete webhooks and re-register:
  ./scripts/webhooks/delete-telegram.sh
  ./scripts/webhooks/delete-max.sh
  ./scripts/webhooks/register-all.sh
