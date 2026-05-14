import { formatCurrency, formatTHB, formatPercent } from '../api/stocks.js';

export default function Header({
  summary, loading, lastUpdated, onRefresh, onAddStock, serverError,
  currency, onToggleCurrency, exchangeRate, onExportCSV,
}) {
  const gainPct = summary.totalCost > 0
    ? ((summary.totalGain / summary.totalCost) * 100)
    : 0;
  const isGain = summary.totalGain >= 0;

  const fmt = (usd, decimals = 0) =>
    currency === 'THB'
      ? formatTHB(usd * (exchangeRate || 1), decimals)
      : formatCurrency(usd, decimals);

  return (
    <header className="sticky top-0 z-50 bg-gray-950/90 backdrop-blur-sm border-b border-gray-800">
      <div className="container mx-auto px-4 max-w-[1400px]">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <span className="text-2xl">📈</span>
            <div>
              <h1 className="text-base font-bold leading-none">Stock Portfolio</h1>
              <p className="text-xs text-gray-500 mt-0.5">US Market Assistant</p>
            </div>
          </div>

          {/* Portfolio Summary */}
          {summary.count > 0 && (
            <div className="hidden md:flex items-center gap-6">
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-0.5">มูลค่าพอร์ต</p>
                <p className="font-mono font-bold text-lg">
                  {fmt(summary.totalValue)}
                </p>
                {currency === 'THB' && (
                  <p className="text-xs text-gray-600 font-mono">
                    {formatCurrency(summary.totalValue, 0)}
                  </p>
                )}
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-0.5">กำไร/ขาดทุน</p>
                <p className={`font-mono font-bold text-lg ${isGain ? 'gain' : 'loss'}`}>
                  {isGain ? '+' : ''}{fmt(summary.totalGain)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-0.5">เปลี่ยนแปลง</p>
                <p className={`font-mono font-semibold ${isGain ? 'gain' : 'loss'}`}>
                  {isGain ? '+' : ''}{gainPct.toFixed(2)}%
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Exchange Rate Badge */}
            {currency === 'THB' && exchangeRate && (
              <span className="hidden sm:flex items-center text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-lg gap-1">
                <span>💱</span>
                <span className="font-mono">1 USD = {exchangeRate.toFixed(2)} THB</span>
              </span>
            )}

            {/* Currency Toggle */}
            <button
              onClick={onToggleCurrency}
              title={currency === 'USD' ? 'เปลี่ยนเป็น THB' : 'เปลี่ยนเป็น USD'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                currency === 'THB'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white hover:border-gray-600'
              }`}
            >
              {currency === 'USD' ? '🇺🇸 USD' : '🇹🇭 THB'}
            </button>

            {/* Export CSV */}
            <button
              onClick={onExportCSV}
              title="ส่งออก CSV"
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>

            {lastUpdated && (
              <span className="hidden sm:block text-xs text-gray-600">
                อัปเดต {lastUpdated.toLocaleTimeString('th-TH')}
              </span>
            )}
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all"
              title="รีเฟรช"
            >
              <svg
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button onClick={onAddStock} className="btn-primary text-sm">
              + เพิ่มหุ้น
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
