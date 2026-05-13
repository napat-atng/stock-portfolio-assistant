import { formatCurrency, formatPercent } from '../api/stocks.js';

function StockRow({ stock, quote, isSelected, onSelect, onRemove }) {
  const price = quote?.regularMarketPrice;
  const change = quote?.regularMarketChange;
  const changePct = quote?.regularMarketChangePercent;
  const isGain = (price ?? stock.avgCost) >= stock.avgCost;
  const pnl = price ? (price - stock.avgCost) * stock.shares : null;
  const pnlPct = price ? ((price - stock.avgCost) / stock.avgCost) * 100 : null;

  return (
    <div
      onClick={() => onSelect(stock.symbol)}
      className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-150 ${
        isSelected
          ? 'bg-blue-600/20 border border-blue-500/40'
          : 'hover:bg-gray-800 border border-transparent'
      }`}
    >
      {/* Symbol + Name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm">{stock.symbol}</span>
          {quote?.shortName && (
            <span className="text-xs text-gray-500 truncate max-w-[100px]">
              {quote.shortName}
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          {stock.shares} หุ้น · ทุน {formatCurrency(stock.avgCost)}
        </div>
      </div>

      {/* Price + Change */}
      <div className="text-right shrink-0">
        {price ? (
          <>
            <div className="font-mono font-semibold text-sm">
              {formatCurrency(price)}
            </div>
            <div className={`text-xs font-medium ${change >= 0 ? 'gain' : 'loss'}`}>
              {change >= 0 ? '+' : ''}{changePct?.toFixed(2)}%
            </div>
          </>
        ) : (
          <div className="w-16 h-8 bg-gray-800 rounded animate-pulse" />
        )}
      </div>

      {/* P&L */}
      {pnl !== null && (
        <div className={`text-right shrink-0 min-w-[70px] ${pnl >= 0 ? 'gain' : 'loss'}`}>
          <div className="text-xs font-mono font-semibold">
            {pnl >= 0 ? '+' : ''}{formatCurrency(pnl, 0)}
          </div>
          <div className="text-xs">
            {pnl >= 0 ? '+' : ''}{pnlPct?.toFixed(1)}%
          </div>
        </div>
      )}

      {/* Remove */}
      <button
        onClick={e => { e.stopPropagation(); onRemove(stock.symbol); }}
        className="opacity-0 group-hover:opacity-100 p-1 text-gray-600 hover:text-red-400 transition-all rounded"
      >
        ✕
      </button>
    </div>
  );
}

export default function PortfolioTable({ portfolio, quotes, selectedSymbol, onSelect, onRemove, onAddStock }) {
  const totalValue = portfolio.reduce((sum, s) => {
    const q = quotes[s.symbol];
    return sum + (q?.regularMarketPrice ? q.regularMarketPrice * s.shares : 0);
  }, 0);

  return (
    <div className="card p-4 h-fit">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-base">💼 พอร์ตของฉัน</h2>
        <span className="text-xs text-gray-500">{portfolio.length} หุ้น</span>
      </div>

      {portfolio.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-600 text-sm mb-3">ยังไม่มีหุ้นในพอร์ต</p>
          <button onClick={onAddStock} className="btn-primary text-sm">
            + เพิ่มหุ้น
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-1 mb-4">
            {portfolio.map(stock => (
              <StockRow
                key={stock.symbol}
                stock={stock}
                quote={quotes[stock.symbol]}
                isSelected={selectedSymbol === stock.symbol}
                onSelect={onSelect}
                onRemove={onRemove}
              />
            ))}
          </div>

          {/* Summary Bar */}
          {totalValue > 0 && (
            <div className="pt-3 border-t border-gray-800">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">มูลค่ารวม</span>
                <span className="font-mono font-bold">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalValue)}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={onAddStock}
            className="w-full mt-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl border border-dashed border-gray-700 hover:border-gray-600 transition-all"
          >
            + เพิ่มหุ้น
          </button>
        </>
      )}
    </div>
  );
}
