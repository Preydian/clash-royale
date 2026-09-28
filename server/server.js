// server/server.js
import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { createClashHandler } from '../api/_lib/clash.js';

const app = express();
app.use(cors()); // Allows your React app to talk to this server

const PORT = process.env.PORT ?? 5000;

app.get(
  '/api/clash',
  createClashHandler(
    process.env.CLASH_API_BASE ?? 'https://api.clashroyale.com/v1',
  ),
);

app.listen(PORT, () =>
  console.log(`Proxy running on http://localhost:${PORT}`),
);
