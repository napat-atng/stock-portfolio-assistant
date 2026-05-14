import { useState } from 'react';
import { formatCurrency } from '../api/stocks.js';

export default function PriceAlertModal({ symbol, quote, currentAlert, onSave, onClose }) {
  const price = quote?.regularMarketPrice;
  const [type, setType] = useState(currentAlert?.type || 'above');
  const [target, setTarget] = useState(currentAlert?.target?.toString() || '');
  const [error, setError] = useState('');

  const handleSave = () => {
    const t = parseFloat(target);
    if (!t || t <= 0) return setError('กรุณากรอกราคาเป้าหมายที่ถูกต้อง');
    onSave(symbol, { type, target: t });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="card w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">🔔 ตั้งการแจ้งเตือน</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
        </div>

        <div className="mb-4 p-3 bg-gray-800 rounded-xl flex items-center justify-between">
          <span className="font-bold">{symbol}</span>
          {price && (
            <span className="text-sm text-gray-400 font-mono">ราคาตอนนี้ {formatCurrency(price)}</span>
          )}
        </div>

        <div className="space-y-4 mb-5">
          <div>
            <label className="block text-xs text-gray-400 mb-2">เงื่อนไข</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setType('above')}
                className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  type === 'above'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                📈 ราคาขึ้นถึง
              </button>
              <button
                onClick={() => setType('below')}
                className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  type === 'below'
                    ? 'bg-red-500/20 border-red-500/50 text-red-400'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                📉 ราคาลงถึง
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">ราคาเป้าหมาย (USD)</label>
            <input
              autoFocus
              type="number"
              value={target}
              onChange={e => { setTarget(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder={price ? price.toFixed(2) : '0.00'}
              min="0.01"
              step="any"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm font-mono"
            />
            {price && target && !isNaN(parseFloat(target)) && (
              <p className="text-xs text-gray-500 mt-1.5">
                {parseFloat(target) > price
                  ? `+${((parseFloat(target) - price) / price * 100).toFixed(1)}% จากราคาปัจจุบัน`
                  : `${((parseFloat(target) - price) / price * 100).toFixed(1)}% จากราคาปัจจุบัน`
                }
              </p>
            )}
          </div>
        </div>

        {error && <p className="text-red-400 text-sm mb-3">⚠️ {error}</p>}

        <div className="flex gap-3">
          {currentAlert && (
            <button
              onClick={() => { onSave(symbol, null); onClose(); }}
              className="px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg text-sm transition-all"
            >
              ลบการแจ้งเตือน
            </button>
          )}
          <button onClick={onClose} className="btn-ghost flex-1">ยกเลิก</button>
          <button onClick={handleSave} className="btn-primary flex-1">💾 บันทึก</button>
        </div>

        <p className="text-xs text-gray-600 mt-3 text-center">
          แจ้งเตือนผ่าน Browser Notification (ขณะเปิดแอป)
        </p>
      </div>
    </div>
  );
}
