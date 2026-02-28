/**
 * HTTP request logger — preloaded via `node --require ./request-logger.js server.js`
 *
 * Monkeypatches http.createServer so every incoming request is logged
 * to the same pino log file used by the application.
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const LOG_DIR = process.env.LOG_DIR || '/var/log/autoauction';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// --- tiny JSON-line logger (no deps) ---

let logStream = process.stdout;

try {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.accessSync(LOG_DIR, fs.constants.W_OK);
  logStream = fs.createWriteStream(path.join(LOG_DIR, 'app.log'), { flags: 'a' });
} catch {
  // fall back to stdout
}

const LEVELS = { trace: 10, debug: 20, info: 30, warn: 40, error: 50 };
const minLevel = LEVELS[LOG_LEVEL] || 30;

function log(level, obj, msg) {
  if ((LEVELS[level] || 30) < minLevel) return;
  const entry = {
    level: LEVELS[level] || 30,
    time: Date.now(),
    pid: process.pid,
    module: 'http',
    ...obj,
    msg,
  };
  logStream.write(JSON.stringify(entry) + '\n');
}

// --- monkeypatch http.createServer ---

const originalCreateServer = http.createServer;

http.createServer = function patchedCreateServer(...args) {
  const server = originalCreateServer.apply(this, args);

  // Wrap every incoming request
  server.on('request', (req, res) => {
    const start = Date.now();
    const method = req.method;
    const url = req.url;

    const onFinish = () => {
      cleanup();
      const ms = Date.now() - start;
      log('info', { method, url, status: res.statusCode, ms }, 'request');
    };

    const onClose = () => {
      cleanup();
      const ms = Date.now() - start;
      log('warn', { method, url, ms }, 'request aborted');
    };

    function cleanup() {
      res.removeListener('finish', onFinish);
      res.removeListener('close', onClose);
    }

    res.on('finish', onFinish);
    res.on('close', onClose);
  });

  return server;
};

log('info', {}, 'request-logger preloaded');
