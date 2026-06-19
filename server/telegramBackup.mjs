import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config();

const STATE_FILE = path.join(process.cwd(), '.telegram-backup-state.json');
const MAX_BODY_BYTES = 30 * 1024 * 1024;
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const sanitizeError = (value) => String(value || '').replace(/bot\d+:[\w-]+/g, 'bot<redacted>');

async function readRequestBody(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const error = new Error('Backup payload is too large.');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function readBackupState() {
  try {
    return JSON.parse(await fs.readFile(STATE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

async function writeBackupState(nextState) {
  await fs.writeFile(STATE_FILE, JSON.stringify(nextState, null, 2));
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

export async function handleTelegramBackupRequest(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_USER_ID;
    if (!botToken || !chatId) {
      sendJson(res, 503, { error: 'Telegram backup is not configured on the server.' });
      return;
    }

    const rawBody = await readRequestBody(req);
    const body = JSON.parse(rawBody || '{}');
    const date = String(body.date || '');
    const filename = String(body.filename || `Mena_CRM_Full_Backup_${date}.xlsx`).replace(/[\\/:*?"<>|]+/g, '_');
    const dataBase64 = String(body.dataBase64 || '');

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      sendJson(res, 400, { error: 'A valid backup date is required.' });
      return;
    }
    if (!dataBase64) {
      sendJson(res, 400, { error: 'Backup file data is required.' });
      return;
    }

    const state = await readBackupState();
    if (state.lastSentDate === date) {
      sendJson(res, 200, { status: 'already_sent', date });
      return;
    }

    const fileBuffer = Buffer.from(dataBase64, 'base64');
    const form = new FormData();
    const captionParts = [
      `Mena CRM daily backup - ${date}`,
      body.triggeredBy ? `Triggered by: ${body.triggeredBy}` : '',
      body.counts ? `Rows: customers ${body.counts.customers || 0}, purchases ${body.counts.purchases || 0}, banks ${body.counts.bankAccounts || 0}, stock ${body.counts.paperStocks || 0}` : ''
    ].filter(Boolean);

    form.append('chat_id', chatId);
    form.append('caption', captionParts.join('\n'));
    form.append('document', new Blob([fileBuffer], { type: XLSX_MIME }), filename);

    const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
      method: 'POST',
      body: form
    });
    const telegramText = await telegramResponse.text();
    if (!telegramResponse.ok) {
      throw new Error(`Telegram sendDocument failed: ${telegramText}`);
    }

    await writeBackupState({
      lastSentDate: date,
      lastFilename: filename,
      lastSentAt: new Date().toISOString()
    });

    sendJson(res, 200, { status: 'sent', date, filename });
  } catch (err) {
    const status = err?.statusCode || 500;
    sendJson(res, status, { error: sanitizeError(err?.message || err) });
  }
}

export function createTelegramBackupMiddleware() {
  return async (req, res, next) => {
    const url = req.url || '';
    if (!url.startsWith('/api/telegram-daily-backup')) {
      next();
      return;
    }
    await handleTelegramBackupRequest(req, res);
  };
}
