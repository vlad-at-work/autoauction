# Sentry Error Tracking

This project uses Sentry for error tracking and performance monitoring.

## Configuration

### Environment Variables

Add these to your `.env.local` file:

```bash
# Sentry
NEXT_PUBLIC_SENTRY_DSN="https://91118c7538edb660866f70fbf9f744c1@o4510813932683264.ingest.us.sentry.io/4510813933928448"
SENTRY_AUTH_TOKEN="5cae9594f63a5a22d3c2b22c82d3bb8a358ceda3e4356e83bc81a15aae9a45f0"
SENTRY_ORG="autoauc"
SENTRY_OTLP_TRACES_URL="https://o4510813932683264.ingest.us.sentry.io/api/4510813933928448/integration/otlp/v1/traces"
SENTRY_PROJECT="sentry-lime-queen"
SENTRY_PUBLIC_KEY="91118c7538edb660866f70fbf9f744c1"
SENTRY_VERCEL_LOG_DRAIN_URL="https://o4510813932683264.ingest.us.sentry.io/api/4510813933928448/integration/vercel/logs/"
```

### Files

- `sentry.client.config.ts` - Client-side Sentry initialization
- `sentry.server.config.ts` - Server-side Sentry initialization
- `sentry.edge.config.ts` - Edge runtime Sentry initialization
- `instrumentation.ts` - Next.js instrumentation hook
- `.sentryclirc` - Sentry CLI configuration (gitignored)

## What's Being Tracked

### Client-Side Errors

- WebApp loading timeouts
- Buyer existence check failures
- Routing errors
- Session replay for debugging (10% sample rate, 100% on errors)

### Server-Side Errors

- Authentication validation failures
- User ID mismatches
- Database query errors
- API endpoint exceptions

## Logging Strategy

All errors are logged with:

- **Context tags**: Identify where the error occurred (e.g., `buyer_check`, `auth_validation`)
- **Platform tags**: Track which platform the error came from (Telegram vs MAX)
- **Extra data**: Additional context like user IDs, error messages

## Viewing Errors

1. Visit [Sentry Dashboard](https://autoauc.sentry.io/projects/sentry-lime-queen/)
2. Filter by:
   - Context tag (e.g., `context:buyer_check`)
   - Platform (e.g., `platform:telegram`)
   - Environment (production, development)

## Session Replay

Session replay is enabled for:

- 10% of all sessions (random sampling)
- 100% of sessions with errors

This helps debug user-reported issues by replaying their exact session.

## Performance Monitoring

- Trace sample rate: 100% (captures all transactions)
- Automatically tracks API routes and page loads
- Shows slow database queries and API calls

## Development

Sentry is active in both development and production. In development:

- Console logs are still printed
- Errors are sent to Sentry
- Source maps are available for debugging

## Troubleshooting

### Build Errors

If you get Sentry-related build errors, ensure:

1. `SENTRY_AUTH_TOKEN` is set in `.env.local`
2. `.sentryclirc` file exists with correct credentials
3. Sentry CLI has network access

### Missing Errors

If errors aren't appearing in Sentry:

1. Check `NEXT_PUBLIC_SENTRY_DSN` is set
2. Verify network requests to `sentry.io` aren't blocked
3. Check browser console for Sentry initialization messages

### Local Development

To test Sentry locally:

```bash
# Throw a test error from the client
throw new Error("Test Sentry client error");

# Throw a test error from the server
// In an API route:
Sentry.captureException(new Error("Test Sentry server error"));
```

Visit your Sentry dashboard to confirm the errors appear.
