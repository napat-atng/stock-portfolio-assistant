import { useState } from 'react';
import { formatCurrency, formatLargeNumber } from '../api/stocks.js';

// ─── AI Provider Config ───────────────────────────────────────────────────────
const PROVIDERS = {
  gemini: {
    name: 'Google Gemini',
    label: 'Gemini 2.0 Flash',
    badge: '🆓 ฟรี',
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    placeholder: 'AIzaSy...',
    keyLink: 'https://aistudio.google.com/app/apikey',
    keyLinkText: 'aistudio.google.com',
    storageKey: 'gemini_api_key',
    envKey: 'VITE_GEMINI_API_KEY',
  },
  groq: {
    name: 'Groq',
    label: 'Llama 3.3 70B',
    badge: '🆓 ฟรี',
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    placeholder: 'gsk_...',
    keyLink: 'https://console.groq.com/keys',
    keyLinkText: 'console.groq.com',
    storageKey: 'groq_api_key',
    envKey: 'VITE_GROQ_API_KEY',
  },
  claude: {
    name: 'Claude',
    label: 'Claude Sonnet',
    badge: '💳 มีค่าใช้จ่าย',
    badgeColor: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    placeholder: 'sk-ant-...',
    keyLink: 'https://console.anthropic.com',
    keyLinkText: 'console.anthropic.com',
    storageKey: 'anthropic_api_key',
    envKey: 'VITE_ANTHROPIC_API_KEY',
  },
};

// ─── API Call Functions ───────────────────────────────────────────────────────
async function callGemini(apiKey, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 1200, temperature: 0.7 },
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'ไม่มีผลลัพธ์';
}

async function callGroq(apiKey, prompt) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1200,
      temperature: 0.7,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices?.[0]?.message?.content || 'ไม่มีผลลัพธ์';
}

async function callClaude(apiKey, prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content?.[0]?.text || 'ไม่มีผลลัพธ์';
}

const API_CALLERS = { gemini: callGemini, groq: callGroq, claude: callClaude };

// ─── Helpers ──────────────────────────────────────────────────────────────────
const SIGNAL_STYLES = {
  ซื้อ: 'px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/30',
  ถือ: 'px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded-full border border-yellow-500/30',
  ขาย: 'px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-bold rounded-full border border-red-500/30',
};

function detectSignal(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  if (lower.includes('แนะนำ: ซื้อ') || lower.includes('แนะนำซื้อ') || lower.includes('**ซื้อ**')) return 'ซื้อ';
  if (lower.includes('แนะนำ: ขาย') || lower.includes('แนะนำขาย') || lower.includes('**ขาย**')) return 'ขาย';
  if (lower.includes('แนะนำ: ถือ') || lower.includes('แนะนำถือ') || lower.includes('**ถือ**')) return 'ถือ';
  return null;
}

function FormatText({ text }) {
  return text.split('\n').map((line, i) => {
    const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
    if (/^\*\*.*\*\*$/.test(line.trim())) {
      return <h4 key={i} className="text-white font-bold mt-4 mb-1.5 first:mt-0 text-sm"
        dangerouslySetInnerHTML={{ __html: bold }} />;
    }
    if (line.startsWith('- ') || line.startsWith('• ')) {
      return <li key={i} className="text-gray-300 ml-4 mb-1 list-disc text-sm"
        dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>') }} />;
    }
    if (!line.trim()) return <div key={i} className="h-2" />;
    return <p key={i} className="text-gray-300 text-sm mb-1" dangerouslySetInnerHTML={{ __html: bold }} />;
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AIAnalysis({ symbol, quote, stock }) {
  const [provider, setProvider] = useState('gemini');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyDraft, setKeyDraft] = useState('');

  const cfg = PROVIDERS[provider];

  const getApiKey = () =>
    import.meta.env[cfg.envKey] || localStorage.getItem(cfg.storageKey) || '';

  const saveKey = () => {
    if (!keyDraft.trim()) return;
    localStorage.setItem(cfg.storageKey, keyDraft.trim());
    setShowKeyInput(false);
    setKeyDraft('');
  };

  const buildPrompt = () => {
    const pnl = stock && quote?.regularMarketPrice
      ? (quote.regularMarketPrice - stock.avgCost) * stock.shares
      : null;

    return `คุณเป็นนักวิเคราะห์การลงทุนมืออาชีพ วิเคราะห์หุ้น ${symbol} ให้ฉันด้วยข้อมูลต่อไปนี้:

📊 ข้อมูลหุ้น:
- Symbol: ${symbol} (${quote?.shortName || ''})
- ราคาปัจจุบัน: $${quote?.regularMarketPrice?.toFixed(2)}
- เปลี่ยนแปลงวันนี้: ${quote?.regularMarketChange?.toFixed(2)} (${quote?.regularMarketChangePercent?.toFixed(2)}%)
- สูงสุดวันนี้: $${quote?.regularMarketDayHigh?.toFixed(2)} / ต่ำสุด: $${quote?.regularMarketDayLow?.toFixed(2)}
- Volume: ${(quote?.regularMarketVolume || 0).toLocaleString()}
- 52w High: $${quote?.fiftyTwoWeekHigh?.toFixed(2)} / 52w Low: $${quote?.fiftyTwoWeekLow?.toFixed(2)}
- Market Cap: ${formatLargeNumber(quote?.marketCap)}
- P/E: ${quote?.trailingPE?.toFixed(2) || 'N/A'}
${stock ? `\n💼 พอร์ตของฉัน:\n- ต้นทุนเฉลี่ย: $${stock.avgCost} | จำนวน: ${stock.shares} หุ้น\n- กำไร/ขาดทุน: ${pnl !== null ? formatCurrency(pnl) : 'N/A'} (${pnl !== null ? ((pnl / (stock.avgCost * stock.shares)) * 100).toFixed(2) : 'N/A'}%)` : ''}

กรุณาวิเคราะห์เป็นภาษาไทย ตอบในหัวข้อต่อไปนี้:

**1. สัญญาณราคา (Bullish/Bearish/Neutral)**
**2. แนวรับ / แนวต้าน**
**3. คำแนะนำ: ซื้อ / ถือ / ขาย** (พร้อมเหตุผล)
**4. ความเสี่ยงที่ควรระวัง**
**5. เป้าหมายราคา (ระยะสั้น 1-4 สัปดาห์)**

ตอบกระชับ ชัดเจน`;
  };

  const analyze = async () => {
    const key = getApiKey();
    if (!key) { setShowKeyInput(true); return; }
    if (!quote) return;

    setLoading(true);
    setAnalysis(null);
    try {
      const result = await API_CALLERS[provider](key, buildPrompt());
      setAnalysis(result);
    } catch (err) {
      setAnalysis(`❌ เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const signal = detectSignal(analysis);
  const hasKey = !!getApiKey();

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h3 className="font-bold">🤖 AI วิเคราะห์</h3>
          {signal && <span className={SIGNAL_STYLES[signal]}>{signal}</span>}
        </div>
        <div className="flex items-center gap-2">
          {hasKey && (
            <button
              onClick={() => { setShowKeyInput(!showKeyInput); setKeyDraft(''); }}
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              🔑 เปลี่ยน Key
            </button>
          )}
          <button
            onClick={analyze}
            disabled={loading || !quote}
            className="btn-primary text-sm"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full inline-block" />
                กำลังวิเคราะห์...
              </span>
            ) : '✨ วิเคราะห์'}
          </button>
        </div>
      </div>

      {/* Provider Selector */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {Object.entries(PROVIDERS).map(([key, p]) => (
          <button
            key={key}
            onClick={() => { setProvider(key); setAnalysis(null); setShowKeyInput(false); }}
            className={`flex flex-col items-start p-3 rounded-xl border transition-all text-left ${
              provider === key
                ? 'border-blue-500 bg-blue-600/10'
                : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
            }`}
          >
            <span className="text-sm font-semibold text-white">{p.name}</span>
            <span className="text-xs text-gray-400 mt-0.5">{p.label}</span>
            <span className={`text-xs mt-1.5 px-1.5 py-0.5 rounded border ${p.badgeColor}`}>
              {p.badge}
            </span>
          </button>
        ))}
      </div>

      {/* API Key Input */}
      {(showKeyInput || !hasKey) && (
        <div className="mb-4 p-4 bg-gray-800 rounded-xl border border-gray-700">
          <p className="text-sm text-gray-300 font-medium mb-1">
            🔑 ใส่ {cfg.name} API Key
          </p>
          <p className="text-xs text-gray-500 mb-3">
            รับ Key ฟรีได้ที่{' '}
            <a href={cfg.keyLink} target="_blank" rel="noopener noreferrer"
              className="text-blue-400 hover:underline">
              {cfg.keyLinkText}
            </a>
          </p>
          <div className="flex gap-2">
            <input
              autoFocus
              type="password"
              value={keyDraft}
              onChange={e => setKeyDraft(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveKey()}
              placeholder={cfg.placeholder}
              className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <button onClick={saveKey} className="btn-primary text-sm px-4">
              บันทึก
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Key ถูกเก็บใน localStorage เครื่องคุณเท่านั้น ไม่ได้ส่งไปที่อื่น
          </p>
        </div>
      )}

      {/* Empty state */}
      {!analysis && !loading && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-gray-500 text-sm">
            เลือก AI Provider → ใส่ API Key → กด วิเคราะห์<br />
            <span className="text-gray-600">รับคำแนะนำ ซื้อ/ถือ/ขาย สำหรับ {symbol}</span>
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="animate-pulse text-4xl mb-3">🧠</div>
          <p className="text-gray-400 text-sm">{cfg.name} กำลังวิเคราะห์ {symbol}...</p>
        </div>
      )}

      {/* Result */}
      {analysis && !loading && (
        <div className="text-sm leading-relaxed">
          <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/50">
            <FormatText text={analysis} />
          </div>
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-gray-600">
              ⚠️ ใช้ประกอบการตัดสินใจเท่านั้น ไม่ใช่คำแนะนำทางการเงิน
            </p>
            <span className="text-xs text-gray-700">via {cfg.name}</span>
          </div>
        </div>
      )}
    </div>
  );
}
