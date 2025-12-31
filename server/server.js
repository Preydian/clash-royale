// server/server.js
import express from 'express';
import axios from 'axios';
import cors from 'cors';
import 'dotenv/config';

const app = express();
app.use(cors()); // Allows your React app to talk to this server

const PORT = 5000;
const CLASH_API_BASE = 'https://api.clashroyale.com/v1';

app.get('/api/player/:tag', async (req, res) => {
  try {
    const playerTag = req.params.tag; // e.g. %23P9L2
    const response = await axios.get(`${CLASH_API_BASE}/players/${playerTag}`, {
      headers: {
        Authorization: `Bearer ${process.env.CLASH_KEY}`,
        Accept: 'application/json',
      },
    });
    res.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    console.error('Clash API error', status, error.response?.data ?? error.message);
    res.status(status).json({ error: 'Failed to fetch', reason: error.response?.data });
  }
});

app.listen(PORT, () => console.log(`Proxy running on http://localhost:${PORT}`));
