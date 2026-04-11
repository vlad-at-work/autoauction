#!/usr/bin/env node
/**
 * Setup Telegram Bot Menu Button (Web App)
 * 
 * IMPORTANT: This script requires the domain to be allowlisted in BotFather first.
 * The API will accept any URL, but Telegram clients will only show the button
 * if the domain was registered via BotFather's /setmenubutton or bot settings UI.
 * 
 * Usage:
 *   node scripts/setup-telegram-menu-button.js
 *   node scripts/setup-telegram-menu-button.js --env-file=.env.staging
 * 
 * Environment variables required:
 *   - TG_BOT_TOKEN (customer bot)
 *   - TG_BOT_TOKEN_DEALER (dealer bot)
 *   - NEXT_PUBLIC_APP_URL or APP_URL (web app URL root)
 */

const https = require('https');

const TG_API_BASE = 'https://api.telegram.org';

async function tgApi(token, method, params = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(params);
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${token}/${method}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve(json);
        } catch (e) {
          reject(new Error(`Invalid JSON: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function getCurrentMenuButton(token) {
  const res = await tgApi(token, 'getChatMenuButton', {});
  return res.ok ? res.result : null;
}

async function setMenuButton(token, text, url) {
  return tgApi(token, 'setChatMenuButton', {
    menu_button: {
      type: 'web_app',
      text,
      web_app: { url },
    },
  });
}

async function getBotInfo(token) {
  const res = await tgApi(token, 'getMe');
  return res.ok ? res.result : null;
}

async function main() {
  // Parse --env-file flag
  const envFileArg = process.argv.find((arg) => arg.startsWith('--env-file='));
  const envFile = envFileArg ? envFileArg.split('=')[1] : '.env.local';

  // Load env vars
  require('dotenv').config({ path: envFile });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (!appUrl) {
    console.error('❌ Error: NEXT_PUBLIC_APP_URL or APP_URL must be set');
    process.exit(1);
  }

  const bots = [
    {
      name: 'Customer',
      token: process.env.TG_BOT_TOKEN,
      buttonText: 'Открыть Свои Авто',
      urlPath: '/app',
    },
    {
      name: 'Dealer',
      token: process.env.TG_BOT_TOKEN_DEALER,
      buttonText: 'Дилер Портал',
      urlPath: '/dealerinterface',
    },
  ].filter((b) => b.token);

  if (bots.length === 0) {
    console.error('❌ Error: No bot tokens found in environment');
    process.exit(1);
  }

  console.log(`\n🔧 Setting up Telegram Menu Buttons`);
  console.log(`📁 Env file: ${envFile}`);
  console.log(`🔗 App URL: ${appUrl}\n`);

  for (const bot of bots) {
    const botInfo = await getBotInfo(bot.token);
    if (!botInfo) {
      console.log(`❌ ${bot.name}: Invalid token`);
      continue;
    }

    const username = `@${botInfo.username}`;
    console.log(`\n📱 ${bot.name} Bot: ${username}`);

    // Check current state
    const current = await getCurrentMenuButton(bot.token);
    if (current) {
      if (current.type === 'web_app') {
        console.log(`   Current: "${current.text}" → ${current.web_app?.url}`);
      } else {
        console.log(`   Current: ${current.type} (not configured)`);
      }
    }

    // Set new menu button
    const fullUrl = `${appUrl.replace(/\/$/, '')}${bot.urlPath}`;
    const result = await setMenuButton(bot.token, bot.buttonText, fullUrl);

    if (result.ok) {
      console.log(`   ✅ Set: "${bot.buttonText}" → ${fullUrl}`);
      console.log(`   ⚠️  Ensure ${new URL(appUrl).hostname} is allowlisted in @BotFather`);
    } else {
      console.log(`   ❌ Failed: ${result.description}`);
    }
  }

  console.log('\n✨ Done\n');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
