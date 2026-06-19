import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTelegramBackupMiddleware } from './server/telegramBackup.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT || 3000;

app.use(createTelegramBackupMiddleware());
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Mena CRM server listening on port ${port}`);
});
