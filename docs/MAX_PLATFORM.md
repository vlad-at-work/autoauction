# MAX Platform Integration

## Current Working Setup

### Bot Configuration

1. **Create bot in MAX Business Cabinet** (https://business.max.ru)
2. **Get bot token** from the cabinet
3. **Set environment variables:**
   - `MAX_BOT_TOKEN_DEALER` - Dealer bot token
   - `MAX_BOT_NAME_DEALER` - Bot username (e.g., `id5010035001_1_bot`)

4. **Register webhook:**
   ```bash
   curl -X POST https://platform-api.max.ru/subscriptions \
     -H "Authorization: YOUR_BOT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://your-domain.com/api/webhooks/max?bot=dealer"}'
   ```

### How It Works

1. **User clicks invite link:** `https://max.ru/BOTNAME?start=setup_DEALERID_TOKEN`
2. **MAX opens chat** - User types `/start`
3. **Webhook receives** `bot_started` event with `start_payload`
4. **Bot sends welcome message** with invite code
5. **User copies code** → Opens mini-app → Pastes code → Sets password
6. **Account activated** - Dealer can now view inquiries

### Key Technical Details

- **Platform ID**: MAX user ID (`user.id` from initData) is the unique identifier
- **No SMS needed**: Platform identity is verified cryptographically via HMAC
- **Auth flow**: initData → HMAC validation → DB lookup → Session
- **Invite codes**: Short format `ABC-123` (6 chars + dash)

### API Endpoints

| Endpoint                            | Purpose                   |
| ----------------------------------- | ------------------------- |
| `POST /api/webhooks/max?bot=dealer` | Receives bot events       |
| `POST /api/dealer/auth/check`       | Checks if dealer exists   |
| `POST /api/dealer/auth/setup`       | First-time password setup |
| `POST /api/dealer/auth/login`       | Password login            |
| `GET /api/dealer/inquiries`         | List active inquiries     |

### Environment Variables

```bash
MAX_BOT_TOKEN_DEALER="your-bot-token"
MAX_BOT_NAME_DEALER="id5010035001_1_bot"
NEXT_PUBLIC_MAX_BOT_NAME_DEALER="id5010035001_1_bot"
```

### Troubleshooting

| Issue              | Cause                      | Solution                     |
| ------------------ | -------------------------- | ---------------------------- |
| Bot doesn't reply  | Webhook not registered     | Run webhook setup script     |
| "link,null" error  | Mini-app not linked to bot | Link mini-app in MAX cabinet |
| "Invalid token"    | Wrong bot token            | Check token in env vars      |
| "Dealer not found" | Wrong invite code          | Check code format (ABC-123)  |

### Security Notes

- initData hash is verified using bot token
- Each request validates platform signature
- No session cookies - stateless auth
- Invite codes expire after 7 days
