import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

const TD_KEY = process.env.TWELVE_DATA_KEY || 'demo';
const TD_BASE = 'https://api.twelvedata.com';

app.use(cors());
app.use(express.json());

// ─── Simple In-Memory Cache ───────────────────────────────────────────────────
const cache = new Map();

function getCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { cache.delete(key); return null; }
  return entry.data;
}

function setCache(key, data, ttlSeconds) {
  cache.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 });
}

const TTL = { quote: 60, history: 600, search: 300, exchangeRate: 3600 };

// ─── Throttle: max 8 req/min → 1 req ทุก 7.5 วินาที ─────────────────────────
let lastRequestTime = 0;

async function tdFetch(path, params = {}) {
  const now = Date.now();
  const wait = 7500 - (now - lastRequestTime);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequestTime = Date.now();

  const url = new URL(`${TD_BASE}${path}`);
  url.searchParams.set('apikey', TD_KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Twelve Data HTTP ${res.status}`);
  const data = await res.json();

  if (data.status === 'error') throw new Error(data.message || 'Twelve Data error');
  return data;
}

// ─── GET /api/exchange-rate ───────────────────────────────────────────────────
// ดึงอัตราแลกเปลี่ยน USD/THB จาก open.er-api.com (ฟรี ไม่ต้อง key)
app.get('/api/exchange-rate', async (req, res) => {
  try {
    const cached = getCache('exchange-rate:USDTHB');
    if (cached) return res.json(cached);

    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!response.ok) throw new Error(`Exchange rate HTTP ${response.status}`);
    const data = await response.json();

    if (data.result !== 'success') throw new Error('Exchange rate API error');

    const result = {
      rate: data.rates.THB,
      base: 'USD',
      target: 'THB',
      updatedAt: data.time_last_update_utc,
    };

    setCache('exchange-rate:USDTHB', result, TTL.exchangeRate);
    res.json(result);
  } catch (error) {
    console.error('[exchange-rate]', error.message);
    // Fallback rate หากดึงไม่ได้
    res.json({ rate: 34.5, base: 'USD', target: 'THB', updatedAt: null, fallback: true });
  }
});

// ─── GET /api/quote/:symbol ───────────────────────────────────────────────────
app.get('/api/quote/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const cached = getCache(`quote:${symbol}`);
    if (cached) return res.json(cached);

    const data = await tdFetch('/quote', { symbol });

    const quote = {
      symbol,
      shortName: data.name || symbol,
      regularMarketPrice:         parseFloat(data.close) || 0,
      regularMarketOpen:          parseFloat(data.open) || 0,
      regularMarketDayHigh:       parseFloat(data.high) || 0,
      regularMarketDayLow:        parseFloat(data.low) || 0,
      regularMarketPreviousClose: parseFloat(data.previous_close) || 0,
      regularMarketChange:        parseFloat(data.change) || 0,
      regularMarketChangePercent: parseFloat(data.percent_change) || 0,
      regularMarketVolume:        parseInt(data.volume) || 0,
      fiftyTwoWeekHigh:           parseFloat(data.fifty_two_week?.high) || null,
      fiftyTwoWeekLow:            parseFloat(data.fifty_two_week?.low) || null,
      marketCap: null,
      trailingPE: null,
    };

    setCache(`quote:${symbol}`, quote, TTL.quote);
    res.json(quote);
  } catch (error) {
    console.error(`[quote] ${req.params.symbol}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/quotes ─────────────────────────────────────────────────────────
app.post('/api/quotes', async (req, res) => {
  try {
    const { symbols } = req.body;
    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({ error: 'symbols must be an array' });
    }

    const results = [];
    const toFetch = [];
    for (const s of symbols) {
      const sym = s.toUpperCase();
      const hit = getCache(`quote:${sym}`);
      if (hit) results.push(hit);
      else toFetch.push(sym);
    }

    if (toFetch.length > 0) {
      const now = Date.now();
      const wait = 7500 - (now - lastRequestTime);
      if (wait > 0) await new Promise(r => setTimeout(r, wait));
      lastRequestTime = Date.now();

      const url = new URL(`${TD_BASE}/quote`);
      url.searchParams.set('apikey', TD_KEY);
      url.searchParams.set('symbol', toFetch.join(','));

      const res2 = await fetch(url.toString());
      const raw = await res2.json();

      const entries = toFetch.length === 1
        ? { [toFetch[0]]: raw }
        : raw;

      for (const sym of toFetch) {
        const d = entries[sym];
        if (!d || d.status === 'error') continue;
        const quote = {
          symbol: sym,
          shortName: d.name || sym,
          regularMarketPrice:         parseFloat(d.close) || 0,
          regularMarketOpen:          parseFloat(d.open) || 0,
          regularMarketDayHigh:       parseFloat(d.high) || 0,
          regularMarketDayLow:        parseFloat(d.low) || 0,
          regularMarketPreviousClose: parseFloat(d.previous_close) || 0,
          regularMarketChange:        parseFloat(d.change) || 0,
          regularMarketChangePercent: parseFloat(d.percent_change) || 0,
          regularMarketVolume:        parseInt(d.volume) || 0,
          fiftyTwoWeekHigh:           parseFloat(d.fifty_two_week?.high) || null,
          fiftyTwoWeekLow:            parseFloat(d.fifty_two_week?.low) || null,
          marketCap: null,
          trailingPE: null,
        };
        setCache(`quote:${sym}`, quote, TTL.quote);
        results.push(quote);
      }
    }

    res.json(results);
  } catch (error) {
    console.error('[quotes] error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/history/:symbol ─────────────────────────────────────────────────
app.get('/api/history/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const { period = '3m' } = req.query;
    const cacheKey = `history:${symbol}:${period}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    const end = new Date();
    const start = new Date();
    switch (period) {
      case '1d': start.setDate(end.getDate() - 1); break;
      case '1w': start.setDate(end.getDate() - 7); break;
      case '1m': start.setMonth(end.getMonth() - 1); break;
      case '3m': start.setMonth(end.getMonth() - 3); break;
      case '1y': start.setFullYear(end.getFullYear() - 1); break;
      default:   start.setMonth(end.getMonth() - 3);
    }

    const fmt = d => d.toISOString().split('T')[0];

    const data = await tdFetch('/time_series', {
      symbol,
      interval: '1day',
      start_date: fmt(start),
      end_date: fmt(end),
      outputsize: 365,
    });

    const quotes = (data.values || [])
      .map(v => ({
        date:   v.datetime,
        open:   parseFloat(v.open),
        high:   parseFloat(v.high),
        low:    parseFloat(v.low),
        close:  parseFloat(v.close),
        volume: parseInt(v.volume),
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const result = { quotes };
    setCache(cacheKey, result, TTL.history);
    res.json(result);
  } catch (error) {
    console.error(`[history] ${req.params.symbol}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/search/:query ───────────────────────────────────────────────────
app.get('/api/search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    const cacheKey = `search:${query.toLowerCase()}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    const data = await tdFetch('/symbol_search', { symbol: query, outputsize: 8 });
    const stocks = (data.data || [])
      .filter(m => m.instrument_type === 'Common Stock' && m.exchange === 'NASDAQ' || m.exchange === 'NYSE')
      .map(m => ({
        symbol: m.symbol,
        shortname: m.instrument_name,
        quoteType: 'EQUITY',
        exchange: m.exchange,
      }));

    setCache(cacheKey, stocks, TTL.search);
    res.json(stocks);
  } catch (error) {
    console.error('[search]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), cacheSize: cache.size });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Stock API Server (Twelve Data) → http://localhost:${PORT}\n`);
  if (TD_KEY === 'demo') {
    console.warn('⚠️  ยังไม่ได้ใส่ TWELVE_DATA_KEY\n');
  }
});
