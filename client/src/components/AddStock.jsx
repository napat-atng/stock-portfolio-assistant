import { useState, useEffect } from 'react';
import { searchStocks } from '../api/stocks.js';

export default function AddStock({ onAdd, onClose, existingPortfolio }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [shares, setShares] = useState('');
  const [avgCost, setAvgCost] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const existingMap = Object.fromEntries(
    existingPortfolio.map(s => [s.symbol, s])
  );

  // Search debounce
  useEffect(() => {
    if (!query.trim() || query.length < 1) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await searchStocks(query);
        setResults(data.slice(0, 6));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  // ถ้าแก้ไขหุ้นที่มีอยู่แล้ว ให้กรอก defaults
  useEffect(() => {
    if (selected) {
      const existing = existingMap[selected.symbol];
      if (existing) {
        setShares(String(existing.shares));
        setAvgCost(String(existing.avgCost));
      }
    }
  }, [selected]);

  const handleSubmit = () => {
    setError('');
    if (!selected) return setError('กรุณาเลือกหุ้นก่อน');
    const s = parseFloat(shares);
    const c = parseFloat(avgCost);
    if (!s || s <= 0) return setError('กรุณากรอกจำนวนหุ้นที่ถูกต้อง');
    if (!c || c <= 0) return setError('กรุณากรอกราคาต้นทุนที่ถูกต้อง');
    onAdd({ symbol: selected.symbol, shares: s, avgCost: c });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="card w-full max-w-md p-6" onKeyDown={handleKeyDown}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">
            {selected ? `เพิ่ม ${selected.symbol}` : '🔍 ค้นหาหุ้น'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-xl leading-none"
          >✕</button>
        </div>

        {/* Search */}
        {!selected && (
          <div className="relative mb-4">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value.toUpperCase())}
              placeholder="พิมพ์ Symbol หรือชื่อบริษัท เช่น AAPL, Tesla..."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
            />
            {searching && (
              <div className="absolute right-3 top-3.5">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
              </div>
            )}

            {results.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-xl">
                {results.map(r => (
                  <button
                    key={r.symbol}
                    onClick={() => { setSelected(r); setQuery(''); setResults([]); }}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-700 transition-colors text-left"
                  >
                    <div>
                      <div className="font-bold text-sm">{r.symbol}</div>
                      <div className="text-xs text-gray-400 truncate max-w-[240px]">
                        {r.shortname || r.longname}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {existingMap[r.symbol] && (
                        <span className="text-xs text-blue-400">ในพอร์ต</span>
                      )}
                      <span className="text-xs text-gray-500 bg-gray-700 px-2 py-0.5 rounded">
                        {r.exchDisp || r.exchange}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Selected Stock Info */}
        {selected && (
          <div className="mb-4 p-3 bg-gray-800 rounded-xl flex items-center justify-between">
            <div>
              <span className="font-bold">{selected.symbol}</span>
              <span className="text-sm text-gray-400 ml-2">
                {selected.shortname || selected.longname}
              </span>
            </div>
            <button
              onClick={() => { setSelected(null); setShares(''); setAvgCost(''); }}
              className="text-xs text-gray-500 hover:text-white"
            >
              เปลี่ยน
            </button>
          </div>
        )}

        {/* Inputs */}
        <div className="space-y-3 mb-5">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">จำนวนหุ้น</label>
            <input
              type="number"
              value={shares}
              onChange={e => setShares(e.target.value)}
              placeholder="เช่น 10"
              min="0.001"
              step="any"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">ราคาต้นทุนเฉลี่ย (USD)</label>
            <input
              type="number"
              value={avgCost}
              onChange={e => setAvgCost(e.target.value)}
              placeholder="เช่น 175.50"
              min="0.01"
              step="any"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-sm mb-3">⚠️ {error}</p>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-ghost flex-1">
            ยกเลิก
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selected}
            className="btn-primary flex-1"
          >
            {existingMap[selected?.symbol] ? 'อัปเดต' : '+ เพิ่มหุ้น'}
          </button>
        </div>
      </div>
    </div>
  );
}
