// server/server.js
import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { apiBase, createClashHandler } from '../api/_lib/clash.js';
import {
  createHistoryHandler,
  createSyncHandler,
} from '../api/_lib/history.js';

const app = express();
app.use(cors()); // Allows your React app to talk to this server

const PORT = process.env.PORT ?? 5000;
// Unlike Vercel, a local machine can have its own IP whitelisted on the key.
const base = apiBase('https://api.clashroyale.com/v1');

app.get('/api/clash', createClashHandler(base));
app.get('/api/history', createHistoryHandler(base));
app.get('/api/sync', createSyncHandler(base));

app.listen(PORT, () =>
  console.log(`Proxy running on http://localhost:${PORT}`),
);
