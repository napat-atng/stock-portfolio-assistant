import { formatCurrency, formatPercent } from '../api/stocks.js';

export default function Header({ summary, loading, lastUpdated, onRefresh, onAddStock, serverError }) {
  const gainPct = summary.totalCost > 0
    ? ((summary.totalGain / summary.totalCost) * 100)
    : 0;
  const isGain = summary.totalGain >= 0;

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
                  {formatCurrency(summary.totalValue, 0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-0.5">กำไร/ขาดทุน</p>
                <p className={`font-mono font-bold text-lg ${isGain ? 'gain' : 'loss'}`}>
                  {isGain ? '+' : ''}{formatCurrency(summary.totalGain, 0)}
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
