import { useState, useRef, useEffect } from 'react';
import { formatCurrency, formatTHB } from '../api/stocks.js';

// ─── Donut Chart (Pure SVG) ───────────────────────────────────────────────────
const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#F97316', '#EC4899', '#84CC16', '#6366F1',
];

function DonutChart({ slices, size = 180 }) {
  const r = size / 2 - 20;
  const cx = size / 2;
  const cy = size / 2;
  const [hovered, setHovered] = useState(null);

  let cumAngle = -Math.PI / 2;
  const paths = slices.map((s, i) => {
    const angle = (s.pct / 100) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle);
    const y1 = cy + r * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + r * Math.cos(cumAngle);
    const y2 = cy + r * Math.sin(cumAngle);
    const largeArc = angle > Math.PI ? 1 : 0;
    const innerR = r * 0.55;
    const xi1 = cx + innerR * Math.cos(cumAngle);
    const yi1 = cy + innerR * Math.sin(cumAngle);
    const xi2 = cx + innerR * Math.cos(cumAngle - angle);
    const yi2 = cy + innerR * Math.sin(cumAngle - angle);
    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${xi1} ${yi1} A ${innerR} ${innerR} 0 ${largeArc} 0 ${xi2} ${yi2} Z`;
    return { d, color: COLORS[i % COLORS.length], ...s };
  });

  const hoveredSlice = hovered !== null ? paths[hovered] : null;

  return (
    <svg width={size} height={size} className="overflow-visible">
      {paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill={p.color}
          stroke="#111827"
          strokeWidth={2}
          opacity={hovered === null || hovered === i ? 1 : 0.4}
          style={{ transition: 'opacity 0.15s, transform 0.15s', transformOrigin: `${cx}px ${cy}px`,
            transform: hovered === i ? 'scale(1.04)' : 'scale(1)', cursor: 'pointer' }}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
        />
      ))}
      {/* Center label */}
      <text x={cx} y={cy - 8} textAnchor="middle" fill="#fff" fontSize="15" fontWeight="bold">
        {hoveredSlice ? `${hoveredSlice.pct.toFixed(1)}%` : `${paths.length}`}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="#9CA3AF" fontSize="10">
        {hoveredSlice ? hoveredSlice.symbol : 'หุ้น'}
      </text>
    </svg>
  );
}

// ─── AI Provider helpers (same pattern as AIAnalysis) ─────────────────────────
const PROVIDERS = {
  gemini: { name: 'Gemini', storageKey: 'gemini_api_key', envKey: 'VITE_GEMINI_API_KEY' },
  groq:   { name: 'Groq',   storageKey: 'groq_api_key',   envKey: 'VITE_GROQ_API_KEY'   },
  claude: { name: 'Claude', storageKey: 'anthropic_api_key', envKey: 'VITE_ANTHROPIC_API_KEY' },
};

async function callAI(provider, prompt) {
  const cfg = PROVIDERS[provider];
  const key = import.meta.env[cfg.envKey] || localStorage.getItem(cfg.storageKey) || '';
  if (!key) throw new Error('NO_KEY');

  if (provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
    const res = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 1500 } }),
    });
    const d = await res.json();
    if (d.error) throw new Error(d.error.message);
    return d.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  if (provider === 'groq') {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], max_tokens: 1500 }),
    });
    const d = await res.json();
    if (d.error) throw new Error(d.error.message);
    return d.choices?.[0]?.message?.content || '';
  }

  if (provider === 'claude') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key,
        'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] }),
    });
    const d = await res.json();
    if (d.error) throw new Error(d.error.message);
    return d.content?.[0]?.text || '';
  }
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
export default function PortfolioAllocation({ portfolio, quotes, currency, exchangeRate }) {
  const [provider, setProvider] = useState('gemini');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyDraft, setKeyDraft] = useState('');

  // คำนวณสัดส่วน
  const slices = portfolio
    .map(s => {
      const q = quotes[s.symbol];
      const value = (q?.regularMarketPrice || 0) * s.shares;
      return { symbol: s.symbol, value, shares: s.shares, avgCost: s.avgCost, quote: q };
    })
    .filter(s => s.value > 0);

  const totalValue = slices.reduce((sum, s) => sum + s.value, 0);
  slices.forEach(s => { s.pct = totalValue > 0 ? (s.value / totalValue) * 100 : 0; });
  slices.sort((a, b) => b.pct - a.pct);

  const fmtVal = (usd) =>
    currency === 'THB' ? formatTHB(usd * (exchangeRate || 1), 0) : formatCurrency(usd, 0);

  const getKey = () => {
    const cfg = PROVIDERS[provider];
    return import.meta.env[cfg.envKey] || localStorage.getItem(cfg.storageKey) || '';
  };

  const saveKey = () => {
    if (!keyDraft.trim()) return;
    localStorage.setItem(PROVIDERS[provider].storageKey, keyDraft.trim());
    setShowKeyInput(false);
    setKeyDraft('');
  };

  const buildPrompt = () => {
    const holdings = slices.map(s => {
      const pnl = s.quote?.regularMarketPrice
        ? (s.quote.regularMarketPrice - s.avgCost) * s.shares : 0;
      const pnlPct = ((s.quote?.regularMarketPrice - s.avgCost) / s.avgCost * 100) || 0;
      return `- ${s.symbol}: ${s.pct.toFixed(1)}% ของพอร์ต | มูลค่า $${s.value.toFixed(0)} | ราคา $${s.quote?.regularMarketPrice?.toFixed(2)} | P&L ${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%`;
    }).join('\n');

    return `คุณเป็นที่ปรึกษาการลงทุนมืออาชีพ วิเคราะห์สัดส่วนพอร์ตหุ้นสหรัฐนี้และให้คำแนะนำในการปรับสัดส่วน:

💼 พอร์ตปัจจุบัน (มูลค่ารวม $${totalValue.toFixed(0)}):
${holdings}

กรุณาวิเคราะห์เป็นภาษาไทย ตอบในหัวข้อต่อไปนี้:

**1. ประเมินการกระจายความเสี่ยง (Diversification)**
วิเคราะห์ว่าพอร์ตกระจายความเสี่ยงดีพอไหม มี Concentration Risk ไหม

**2. หุ้นที่ควร "เพิ่มสัดส่วน"**
ระบุชื่อหุ้นพร้อมเหตุผลชัดเจนว่าทำไมควรเพิ่ม และควรปรับจาก X% เป็น Y%

**3. หุ้นที่ควร "ลดสัดส่วน" หรือ "ขายทำกำไร"**
ระบุชื่อหุ้นพร้อมเหตุผล และควรปรับจาก X% เป็น Y%

**4. แนะนำ Sector/หุ้นเพิ่มเติม**
ถ้าควรเพิ่มหุ้นตัวใหม่เพื่อให้พอร์ตสมดุลขึ้น แนะนำ 2-3 ตัว

**5. สัดส่วนพอร์ตที่แนะนำ (เป้าหมาย)**
แสดงเป็นตาราง: หุ้น | สัดส่วนปัจจุบัน | สัดส่วนแนะนำ

ตอบกระชับ ชัดเจน เน้น Action ที่ทำได้จริง`;
  };

  const analyze = async () => {
    if (!getKey()) { setShowKeyInput(true); return; }
    if (slices.length === 0) return;
    setLoading(true);
    setAnalysis(null);
    try {
      const result = await callAI(provider, buildPrompt());
      setAnalysis(result);
    } catch (err) {
      if (err.message === 'NO_KEY') { setShowKeyInput(true); }
      else setAnalysis(`❌ เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (portfolio.length === 0) return null;

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h3 className="font-bold text-base">🥧 สัดส่วนพอร์ต & วิเคราะห์การจัดสรร</h3>
        <div className="flex items-center gap-2">
          {/* Provider selector mini */}
          <div className="flex gap-1 bg-gray-800 p-1 rounded-lg">
            {Object.entries(PROVIDERS).map(([k, p]) => (
              <button key={k} onClick={() => { setProvider(k); setAnalysis(null); }}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  provider === k ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                {p.name}
              </button>
            ))}
          </div>
          <button
            onClick={analyze}
            disabled={loading || slices.length === 0}
            className="btn-primary text-sm"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full inline-block" />
                วิเคราะห์...
              </span>
            ) : '🧠 วิเคราะห์สัดส่วน'}
          </button>
        </div>
      </div>

      {/* Chart + Legend */}
      <div className="flex flex-wrap gap-6 mb-5">
        {slices.length > 0 && (
          <div className="flex-shrink-0">
            <DonutChart slices={slices} size={180} />
          </div>
        )}
        <div className="flex-1 min-w-[200px] space-y-2">
          {slices.map((s, i) => {
            const pnl = s.quote?.regularMarketPrice
              ? (s.quote.regularMarketPrice - s.avgCost) * s.shares : 0;
            const isPos = pnl >= 0;
            return (
              <div key={s.symbol} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{s.symbol}</span>
                    <span className="text-sm font-mono font-bold">{s.pct.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{fmtVal(s.value)}</span>
                    <span className={isPos ? 'gain' : 'loss'}>
                      {isPos ? '+' : ''}{fmtVal(pnl)}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-gray-800 rounded-full h-1 mt-1">
                    <div
                      className="h-1 rounded-full transition-all"
                      style={{ width: `${s.pct}%`, background: COLORS[i % COLORS.length] }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Concentration warning */}
          {slices[0]?.pct > 40 && (
            <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-xs text-yellow-400">
              ⚠️ {slices[0].symbol} คิดเป็น {slices[0].pct.toFixed(0)}% ของพอร์ต — อาจมี Concentration Risk
            </div>
          )}
        </div>
      </div>

      {/* API Key Input */}
      {showKeyInput && (
        <div className="mb-4 p-4 bg-gray-800 rounded-xl border border-gray-700">
          <p className="text-sm text-gray-300 font-medium mb-3">
            🔑 ใส่ {PROVIDERS[provider].name} API Key เพื่อวิเคราะห์สัดส่วน
          </p>
          <div className="flex gap-2">
            <input
              autoFocus type="password" value={keyDraft}
              onChange={e => setKeyDraft(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveKey()}
              placeholder="API Key..."
              className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <button onClick={saveKey} className="btn-primary text-sm px-4">บันทึก</button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center py-6">
          <div className="animate-pulse text-3xl mb-2">🧠</div>
          <p className="text-gray-400 text-sm">{PROVIDERS[provider].name} กำลังวิเคราะห์พอร์ต...</p>
        </div>
      )}

      {/* Result */}
      {analysis && !loading && (
        <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/50">
          <FormatText text={analysis} />
          <p className="text-xs text-gray-600 mt-4">
            ⚠️ ใช้ประกอบการตัดสินใจเท่านั้น ไม่ใช่คำแนะนำทางการเงิน · via {PROVIDERS[provider].name}
          </p>
        </div>
      )}
    </div>
  );
}
