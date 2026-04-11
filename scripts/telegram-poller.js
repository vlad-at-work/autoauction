#!/usr/bin/env node
/**
 * Telegram Long-Polling Poller
 * 
 * Uses curl for HTTPS-over-proxy requests (reliable, handles CONNECT properly)
 * and native http for localhost relay.
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ============================================================================
// Configuration & Validation
// ============================================================================

const CONFIG = {
  bots: [
    {
      type: 'customer',
      token: process.env.TG_BOT_TOKEN,
      secret: process.env.TG_WEBHOOK_SECRET,
      offsetFile: process.env.OFFSET_FILE_CUSTOMER || '/var/lib/autoauction-staging/poller-offset-customer.json',
    },
    {
      type: 'dealer',
      token: process.env.TG_BOT_TOKEN_DEALER,
      secret: process.env.TG_DEALER_WEBHOOK_SECRET,
      offsetFile: process.env.OFFSET_FILE_DEALER || '/var/lib/autoauction-staging/poller-offset-dealer.json',
    },
  ],
  proxyUrl: process.env.TELEGRAM_PROXY_URL,
  localWebhookUrl: `http://127.0.0.1:${process.env.PORT || 3000}/api/webhooks/telegram`,
  pollTimeout: 30,
  relayTimeout: 15000,
  retryBaseDelay: 1000,
  retryMaxDelay: 30000,
};

function validateConfig() {
  const errors = [];
  
  CONFIG.bots.forEach((bot) => {
    if (!bot.token) errors.push(`Missing ${bot.type} bot token`);
    if (!bot.secret) errors.push(`Missing ${bot.type} webhook secret`);
  });
  
  if (!CONFIG.proxyUrl) errors.push('Missing TELEGRAM_PROXY_URL');
  
  if (errors.length > 0) {
    console.error('[Poller] Configuration errors:');
    errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }
}

// ============================================================================
// Logging
// ============================================================================

function log(level, context, message) {
  const entry = {
    level,
    ts: new Date().toISOString(),
    ...context,
    message,
  };
  console.log(JSON.stringify(entry));
}

// ============================================================================
// HTTP Helpers
// ============================================================================

// Make HTTPS request through proxy using curl
function curlViaProxy(url, method = 'GET', body = null, timeout = 60000) {
  return new Promise((resolve, reject) => {
    const args = [
      '-s', '-S',  // silent but show errors
      '--proxy', CONFIG.proxyUrl,
      '--proxytunnel',  // Use CONNECT for HTTPS
      '--max-time', String(Math.ceil(timeout / 1000)),
      '-H', 'Content-Type: application/json',
    ];
    
    if (method === 'POST' && body) {
      args.push('-X', 'POST');
      args.push('-d', JSON.stringify(body));
    }
    
    args.push(url);
    
    const child = spawn('curl', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => stdout += data);
    child.stderr.on('data', (data) => stderr += data);
    
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`curl exited ${code}: ${stderr}`));
      } else {
        try {
          resolve(JSON.parse(stdout));
        } catch (e) {
          resolve({ raw: stdout });
        }
      }
    });
    
    child.on('error', (err) => {
      reject(new Error(`curl spawn error: ${err.message}`));
    });
  });
}

// Simple HTTP POST to localhost
function httpPostLocalhost(url, body, headers, timeout) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(body);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...headers,
      },
      timeout: timeout,
    };
    
    const request = http.request(options, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        resolve({
          statusCode: response.statusCode,
          body: data,
        });
      });
    });
    
    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
    
    request.write(postData);
    request.end();
  });
}

// ============================================================================
// Telegram API
// ============================================================================

const TG_API_BASE = 'https://api.telegram.org';

async function telegramApiRequest(botToken, method, params = {}) {
  const url = `${TG_API_BASE}/bot${botToken}/${method}`;
  return curlViaProxy(url, 'POST', params, 30000);
}

async function deleteWebhook(botToken, dropPendingUpdates = true) {
  return telegramApiRequest(botToken, 'deleteWebhook', {
    drop_pending_updates: dropPendingUpdates,
  });
}

async function getUpdates(botToken, offset, timeout = 30) {
  const url = `${TG_API_BASE}/bot${botToken}/getUpdates`;
  const params = new URLSearchParams({
    offset: String(offset),
    limit: '100',
    timeout: String(timeout),
    allowed_updates: JSON.stringify(['message', 'callback_query']),
  });
  
  const fullUrl = `${url}?${params.toString()}`;
  
  // Use longer timeout for long-polling (timeout + 10s buffer)
  return curlViaProxy(fullUrl, 'GET', null, (timeout + 10) * 1000);
}

// ============================================================================
// Offset Persistence
// ============================================================================

function loadOffset(offsetFile) {
  try {
    if (fs.existsSync(offsetFile)) {
      const data = JSON.parse(fs.readFileSync(offsetFile, 'utf8'));
      return data.offset || 0;
    }
  } catch (err) {
    log('warn', { offsetFile, err: err.message }, 'Failed to load offset');
  }
  return 0;
}

function saveOffset(offsetFile, offset) {
  try {
    const dir = path.dirname(offsetFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const tempFile = `${offsetFile}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify({ offset, ts: new Date().toISOString() }));
    fs.renameSync(tempFile, offsetFile);
  } catch (err) {
    log('error', { offsetFile, offset, err: err.message }, 'Failed to save offset');
  }
}

// ============================================================================
// Webhook Relay
// ============================================================================

async function relayToWebhook(botType, update, secret) {
  const url = `${CONFIG.localWebhookUrl}?bot=${botType}`;
  
  try {
    const response = await httpPostLocalhost(
      url,
      update,
      { 'x-telegram-bot-api-secret-token': secret },
      CONFIG.relayTimeout
    );
    
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error(`HTTP ${response.statusCode}: ${response.body}`);
    }
    
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ============================================================================
// Main Polling Loop
// ============================================================================

async function runBotLoop(bot, shutdownSignal) {
  const { type, token, secret, offsetFile } = bot;
  
  let offset = loadOffset(offsetFile);
  log('info', { bot: type, offset }, 'Starting polling loop');
  
  let consecutiveErrors = 0;
  
  while (!shutdownSignal.isShutdown) {
    try {
      const pollStart = Date.now();
      log('debug', { bot: type, offset }, 'Polling getUpdates...');
      
      const result = await getUpdates(token, offset);
      const pollLatency = Date.now() - pollStart;
      
      if (!result.ok) {
        throw new Error(`Telegram API error: ${result.description || 'unknown'}`);
      }
      
      consecutiveErrors = 0;
      
      const updates = result.result || [];
      
      log('debug', { bot: type, updatesCount: updates.length, latencyMs: pollLatency }, 'Poll completed');
      
      if (updates.length > 0) {
        log('info', { 
          bot: type, 
          count: updates.length, 
          latencyMs: pollLatency,
          offset 
        }, 'Received updates');
        
        for (const update of updates) {
          const updateId = update.update_id;
          
          const relayStart = Date.now();
          const relayResult = await relayToWebhook(type, update, secret);
          const relayLatency = Date.now() - relayStart;
          
          if (relayResult.success) {
            log('info', { 
              bot: type, 
              updateId, 
              relayLatencyMs: relayLatency 
            }, 'Update relayed successfully');
          } else {
            log('error', { 
              bot: type, 
              updateId, 
              error: relayResult.error,
              relayLatencyMs: relayLatency 
            }, 'Failed to relay update (dropping)');
          }
          
          offset = updateId + 1;
        }
        
        saveOffset(offsetFile, offset);
      }
    } catch (err) {
      consecutiveErrors++;
      
      if (err.message && err.message.includes('409')) {
        log('warn', { bot: type, err: err.message }, 
          'Conflict: another getUpdates is active, backing off');
      } else {
        log('error', { 
          bot: type, 
          err: err.message,
          consecutiveErrors 
        }, 'Polling error');
      }
      
      const backoffMs = Math.min(
        CONFIG.retryBaseDelay * Math.pow(2, consecutiveErrors - 1),
        CONFIG.retryMaxDelay
      );
      
      log('info', { bot: type, backoffMs }, 'Retrying after backoff');
      await sleep(backoffMs);
    }
  }
  
  saveOffset(offsetFile, offset);
  log('info', { bot: type, offset }, 'Polling loop stopped');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Startup
// ============================================================================

async function startup() {
  log('info', {}, '=== Telegram Poller Starting ===');
  
  validateConfig();
  
  log('info', {}, 'Clearing existing webhooks...');
  
  for (const bot of CONFIG.bots) {
    try {
      const result = await deleteWebhook(bot.token, true);
      if (result.ok) {
        log('info', { bot: bot.type }, 'Webhook cleared successfully');
      } else {
        log('warn', { bot: bot.type, error: result.description }, 'Failed to clear webhook');
      }
    } catch (err) {
      log('error', { bot: bot.type, err: err.message }, 'Error clearing webhook');
    }
  }
  
  await sleep(1000);
  log('info', {}, 'Startup complete, beginning polling');
}

// ============================================================================
// Shutdown Handling
// ============================================================================

const shutdownSignal = { isShutdown: false };

function setupShutdownHandlers() {
  const shutdown = (signal) => {
    log('info', { signal }, 'Shutdown signal received');
    shutdownSignal.isShutdown = true;
    
    setTimeout(() => {
      log('error', {}, 'Forced exit after timeout');
      process.exit(1);
    }, 10000);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  setupShutdownHandlers();
  
  await startup();
  
  await Promise.all(CONFIG.bots.map(bot => runBotLoop(bot, shutdownSignal)));
  
  log('info', {}, '=== Telegram Poller Stopped Gracefully ===');
  process.exit(0);
}

main().catch(err => {
  log('fatal', { err: err.message, stack: err.stack }, 'Unhandled error in main');
  process.exit(1);
});
