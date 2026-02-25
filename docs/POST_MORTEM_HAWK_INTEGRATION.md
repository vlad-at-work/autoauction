# Post-Mortem: Hawk Error Tracking Integration

## Executive Summary

**What happened:** Adding Hawk error tracking to a Next.js 16 standalone deployment on a VPS turned into a multi-hour debugging session due to misunderstandings about how Next.js standalone mode handles environment variables and module initialization.

**Outcome:** Success. Hawk now captures errors. The fix was a single line: `initHawk()` at the module level in `hawk.ts`.

**Time spent:** ~3 hours of debugging for a 5-minute fix.

---

## The Setup

### Infrastructure

- **App:** Next.js 16 with `output: 'standalone'`
- **Hosting:** Reg.ru VPS (Ubuntu 24.04)
- **Deployment:** GitHub Actions → SSH rsync → systemd service
- **Error Tracking:** Hawk (hawk.so) - Russian Sentry alternative

### The Goal

Add Hawk error tracking so API errors appear in the Hawk dashboard.

---

## What Went Wrong: A Timeline of Confusion

### Phase 1: The Obvious Approach (Failed)

**What we did:**

1. Added `@hawk.so/nodejs` package
2. Created `src/lib/hawk.ts` with `initHawk()` and `captureError()`
3. Created `src/instrumentation.ts` to auto-initialize on app start
4. Added `HAWK_TOKEN` to GitHub Secrets
5. Modified `deploy.yml` to write `HAWK_TOKEN` to `.env` on the server

**Why it failed:**
Next.js standalone mode does NOT auto-run `instrumentation.ts` like regular `next start` does. The instrumentation file only runs during build, not at runtime in the standalone server.

**The confusion:** Locally (`next dev`), `instrumentation.ts` runs automatically. On Vercel, it runs automatically. In standalone mode on a VPS - silence.

### Phase 2: The Environment Variable Mystery

**What we discovered:**

- `HAWK_TOKEN` was in `.env` on the server ✓
- Systemd was loading `.env` via `EnvironmentFile=` ✓
- The app could read `HAWK_TOKEN` during build ✓
- But API routes showed `HAWK_TOKEN` as undefined ✗

**The red herring:** We spent an hour trying to figure out where bot tokens (`MAX_BOT_TOKEN`, `TG_BOT_TOKEN`) were coming from, since they weren't in GitHub Secrets and weren't in the server's `.env`, yet webhooks worked.

**The truth:** The bot tokens WERE in the local `.env.local` during build, so they got baked into the standalone output. But `HAWK_TOKEN` was added to GitHub Secrets after the fact, so it wasn't being included.

### Phase 3: The Debug Logging Fiasco

**What we did:**
Added extensive `console.warn()` debug logging to:

- `src/lib/hawk.ts` - log every step of initialization
- `src/app/api/webhooks/telegram/route.ts` - log env var availability
- Created `/api/debug/env` endpoint to dump all env vars

**What we learned:**

- During build: All env vars present, Hawk initializes successfully
- During runtime API calls: `initialized` variable is `false`, env vars "undefined"
- The `instrumentation.ts` initialization doesn't carry over to API routes

### Phase 4: The Aha Moment

**The realization:**
Next.js standalone creates separate module instances for:

1. The main server process
2. Each API route

When `instrumentation.ts` runs during build, it initializes Hawk in ONE module instance. But when an API route imports `hawk.ts`, it gets a FRESH module instance where `initialized = false`.

**The fix:**
Add `initHawk()` at the BOTTOM of `hawk.ts`, outside any function:

```typescript
// Auto-initialize on module load (for API routes where instrumentation.ts doesn't run)
initHawk();
```

This ensures Hawk initializes whenever ANY module imports `hawk.ts`, not just during instrumentation.

---

## Root Cause Analysis

### Why This Happened

1. **Different Next.js modes behave differently:**
   - `next dev` - instrumentation.ts runs, modules are shared
   - `next start` - instrumentation.ts runs, modules are shared
   - `output: 'standalone'` - instrumentation.ts runs at BUILD time, not runtime; each API route may get its own module instance

2. **Documentation gaps:**
   - Next.js docs don't clearly explain that instrumentation.ts is build-time only in standalone mode
   - Hawk docs assume a standard Node.js environment

3. **Deploy complexity:**
   - GitHub Actions build environment ≠ VPS runtime environment
   - `EXCLUDE: ".env"` in deploy.yml means local .env files don't transfer
   - GitHub Secrets must explicitly be written to server's .env

### Why The Bot Tokens Worked But Hawk Didn't

The bot tokens were in `.env.local` during the initial build, so they got included in the standalone output. When we added Hawk later, we tried to add it via GitHub Secrets → deploy.yml → server's `.env`, but that happens AFTER build, so the running app had `HAWK_TOKEN` in env but Hawk wasn't initialized.

---

## The Solution

### Files Modified

1. **`src/lib/hawk.ts`** - Added auto-initialization at module level
2. **`.github/workflows/deploy.yml`** - Added step to write `HAWK_TOKEN` to server's `.env`
3. **Temporary:** Debug logging (to be removed)

### Key Code Change

```typescript
// src/lib/hawk.ts
import HawkCatcher from '@hawk.so/nodejs';

const HAWK_TOKEN = process.env.HAWK_TOKEN;
let initialized = false;

export function initHawk() {
  if (initialized || !HAWK_TOKEN) return;
  try {
    HawkCatcher.init(HAWK_TOKEN);
    initialized = true;
  } catch {
    // swallow
  }
}

export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (!initialized) return;
  try {
    HawkCatcher.send(error instanceof Error ? error : new Error(String(error)), context as any);
  } catch {
    // swallow
  }
}

// THE FIX: Auto-initialize when module is imported
initHawk();
```

### Deploy Workflow Change

```yaml
- name: Update HAWK_TOKEN in .env
  uses: appleboy/ssh-action@master
  with:
    host: ${{ secrets.VPS_HOST }}
    username: autoauction
    key: ${{ secrets.VPS_SSH_KEY }}
    script: |
      sed -i '/^HAWK_TOKEN=/d' /home/autoauction/app/.env
      echo 'HAWK_TOKEN=${{ secrets.HAWK_TOKEN }}' >> /home/autoauction/app/.env
```

---

## Lessons Learned

1. **Next.js standalone is not `next start`:** Instrumentation.ts is build-time only. For runtime initialization, put it in the module itself.

2. **Env vars in standalone:** They must be present at BUILD time to be included, OR loaded at runtime via `.env` file + explicit init.

3. **Debug logging is your friend:** When something doesn't work, add logs everywhere. The error messages (or lack thereof) tell the story.

4. **GitHub Actions ≠ VPS:** Secrets in GitHub don't automatically appear on the VPS. You must explicitly transfer them during deploy.

---

## For Future Reference: Adding a New Environment Variable

### Scenario: Add HELLO_WORLD variable

**If it's a server-side secret (like HAWK_TOKEN):**

1. Add to GitHub Secrets (Settings → Secrets → Actions):
   - Name: `HELLO_WORLD`
   - Value: `your_value`

2. Update `.github/workflows/deploy.yml` to write it to server's `.env`:

   ```yaml
   - name: Update env vars
     uses: appleboy/ssh-action@master
     with:
       host: ${{ secrets.VPS_HOST }}
       username: autoauction
       key: ${{ secrets.VPS_SSH_KEY }}
       script: |
         sed -i '/^HELLO_WORLD=/d' /home/autoauction/app/.env
         echo 'HELLO_WORLD=${{ secrets.HELLO_WORLD }}' >> /home/autoauction/app/.env
   ```

3. Access in code:

   ```typescript
   const helloWorld = process.env.HELLO_WORLD;
   ```

4. If you need it available at module load time (like Hawk), ensure the file using it is imported after the env is set. The deploy already handles this by writing .env BEFORE restarting the service.

**If it's a public/client-side variable (like NEXT_PUBLIC_APP_URL):**

1. Add to GitHub Secrets:
   - Name: `NEXT_PUBLIC_HELLO_WORLD`
   - Value: `your_value`

2. Add to the Build step in `.github/workflows/deploy.yml`:

   ```yaml
   - name: Build
     run: bun run build
     env:
       NEXT_PUBLIC_HELLO_WORLD: ${{ secrets.NEXT_PUBLIC_HELLO_WORLD }}
   ```

3. Access in code:

   ```typescript
   const helloWorld = process.env.NEXT_PUBLIC_HELLO_WORLD;
   ```

4. These get baked into the JavaScript bundle at build time.

**Important:** After modifying `deploy.yml`, commit and push. The change takes effect on the next deploy.

---

## The "Just Do This Next Time" Summary

For server-side env vars in Next.js standalone:

1. Put secret in GitHub Secrets
2. Add SSH step in deploy.yml to append to server's `.env`
3. Access via `process.env.XXX` in code
4. If you need it at module initialization, call your init function at the END of the module file (not just in instrumentation.ts)
5. Deploy

That's it. No gymnastics needed.

---

## Related Documentation

- Next.js Standalone Output: https://nextjs.org/docs/pages/api-reference/config/next-config-js/output
- Hawk Node.js SDK: https://docs.hawk-tracker.ru/hawk
- Systemd EnvironmentFile: https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html#EnvironmentFile=

---

_Document created: 2026-02-26_  
_Pain level: 8/10_  
_Lessons learned: Priceless_
