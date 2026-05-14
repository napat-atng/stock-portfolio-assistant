const BASE_URL = '/api';

export async function fetchQuote(symbol) {
  const res = await fetch(`${BASE_URL}/quote/${symbol}`);
  if (!res.ok) throw new Error(`Failed to fetch quote for ${symbol}`);
  return res.json();
}

export async function fetchQuotes(symbols) {
  if (!symbols.length) return [];
  const res = await fetch(`${BASE_URL}/quotes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbols }),
  });
  if (!res.ok) throw new Error('Failed to fetch quotes');
  return res.json();
}

export async function fetchHistory(symbol, period = '3m') {
  const res = await fetch(`${BASE_URL}/history/${symbol}?period=${period}`);
  if (!res.ok) throw new Error(`Failed to fetch history for ${symbol}`);
  return res.json();
}

export async function searchStocks(query) {
  const res = await fetch(`${BASE_URL}/search/${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

export async function fetchExchangeRate() {
  const res = await fetch(`${BASE_URL}/exchange-rate`);
  if (!res.ok) throw new Error('Failed to fetch exchange rate');
  return res.json();
}

// ─── Currency Formatters ──────────────────────────────────────────────────────

export function formatCurrency(value, decimals = 2) {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatTHB(value, decimals = 0) {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** แสดงค่าตาม currency mode ที่เลือก */
export function formatMoney(value, currency = 'USD', exchangeRate = 1, decimals = 2) {
  if (value === null || value === undefined) return '-';
  if (currency === 'THB') {
    return formatTHB(value * exchangeRate, 0);
  }
  return formatCurrency(value, decimals);
}

export function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value) {
  if (value === null || value === undefined) return '-';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatLargeNumber(value) {
  if (!value) return '-';
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return formatCurrency(value, 0);
}

// ─── Export CSV ───────────────────────────────────────────────────────────────
export function exportPortfolioCSV(portfolio, quotes, exchangeRate = 1) {
  const headers = ['Symbol', 'ชื่อ', 'จำนวนหุ้น', 'ต้นทุน/หุ้น (USD)', 'ราคาปัจจุบัน (USD)',
    'มูลค่ารวม (USD)', 'มูลค่ารวม (THB)', 'กำไร/ขาดทุน (USD)', 'กำไร/ขาดทุน (%)'];

  const rows = portfolio.map(s => {
    const q = quotes[s.symbol];
    const price = q?.regularMarketPrice ?? 0;
    const value = price * s.shares;
    const cost = s.avgCost * s.shares;
    const pnl = value - cost;
    const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
    return [
      s.symbol,
      q?.shortName || '',
      s.shares,
      s.avgCost.toFixed(2),
      price.toFixed(2),
      value.toFixed(2),
      (value * exchangeRate).toFixed(0),
      pnl.toFixed(2),
      pnlPct.toFixed(2) + '%',
    ];
  });

  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `portfolio_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
