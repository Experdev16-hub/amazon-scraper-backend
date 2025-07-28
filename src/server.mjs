// server.js or server/index.js

import express from 'express';
import cors from 'cors';[]
import { discoverSellers } from './utils/discoverSellers.mjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();
const PORT = process.env.PORT ;

app.use(cors());
app.use(express.json());

app.post('/api/start-scraping', async (req, res) => {
  const { niche } = req.body;

  if (!niche) {
    return res.status(400).json({ error: 'Niche is required.' });
  }

  try {
    await discoverSellers(niche);
    res.json({ message: `Scraping complete for niche: ${niche}` });
  } catch (err) {
    console.error('Scraping failed:', err);
    res.status(500).json({ error: 'Scraping failed. Please check the server logs.' });
  }
});

app.get('/api/scraped-sellers', (req, res) => {
  const filePath = path.resolve(__dirname, 'data', 'sellerUrls.json');

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'No seller data found yet.' });
  }

  const lines = fs.readFileSync(filePath, 'utf-8').trim().split('\n');
  const sellers = lines.map(line => JSON.parse(line));
  res.json(sellers);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
