import { formatCurrency, formatTHB, formatPercent } from '../api/stocks.js';

function StockRow({ stock, quote, isSelected, onSelect, onRemove, currency, exchangeRate, alerts, onToggleAlert }) {
  const price = quote?.regularMarketPrice;
  const change = quote?.regularMarketChange;
  const changePct = quote?.regularMarketChangePercent;
  const isGain = (price ?? stock.avgCost) >= stock.avgCost;
  const pnl = price ? (price - stock.avgCost) * stock.shares : null;
  const pnlPct = price ? ((price - stock.avgCost) / stock.avgCost) * 100 : null;

  const fmtPrice = (usd, dec = 2) =>
    currency === 'THB' ? formatTHB(usd * (exchangeRate || 1), 0) : formatCurrency(usd, dec);

  const alert = alerts?.[stock.symbol];
  const alertTriggered = alert && price && (
    (alert.type === 'above' && price >= alert.target) ||
    (alert.type === 'below' && price <= alert.target)
  );

  return (
    <div
      onClick={() => onSelect(stock.symbol)}
      className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-150 ${
        isSelected
          ? 'bg-blue-600/20 border border-blue-500/40'
          : 'hover:bg-gray-800 border border-transparent'
      } ${alertTriggered ? 'ring-1 ring-yellow-500/50' : ''}`}
    >
      {/* Symbol + Name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm">{stock.symbol}</span>
          {alertTriggered && <span className="text-yellow-400 text-xs animate-pulse">🔔</span>}
          {quote?.shortName && (
            <span className="text-xs text-gray-500 truncate max-w-[100px]">
              {quote.shortName}
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          {stock.shares} หุ้น · ทุน {formatCurrency(stock.avgCost)}
          {currency === 'THB' && exchangeRate && (
            <span className="text-gray-600"> ({formatTHB(stock.avgCost * exchangeRate, 0)})</span>
          )}
        </div>
      </div>

      {/* Price + Change */}
      <div className="text-right shrink-0">
        {price ? (
          <>
            <div className="font-mono font-semibold text-sm">
              {fmtPrice(price)}
            </div>
            {currency === 'THB' && (
              <div className="text-xs text-gray-600 font-mono">{formatCurrency(price)}</div>
            )}
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
        <div className={`text-right shrink-0 min-w-[80px] ${pnl >= 0 ? 'gain' : 'loss'}`}>
          <div className="text-xs font-mono font-semibold">
            {pnl >= 0 ? '+' : ''}{fmtPrice(pnl, 0)}
          </div>
          <div className="text-xs">
            {pnl >= 0 ? '+' : ''}{pnlPct?.toFixed(1)}%
          </div>
        </div>
      )}

      {/* Alert + Remove */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
        <button
          onClick={e => { e.stopPropagation(); onToggleAlert(stock.symbol); }}
          className={`p-1 rounded transition-colors ${
            alert ? 'text-yellow-400 hover:text-yellow-300' : 'text-gray-600 hover:text-yellow-400'
          }`}
          title={alert ? `แจ้งเตือน: $${alert.target}` : 'ตั้งการแจ้งเตือน'}
        >
          🔔
        </button>
        <button
          onClick={e => { e.stopPropagation(); onRemove(stock.symbol); }}
          className="p-1 text-gray-600 hover:text-red-400 transition-all rounded"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default function PortfolioTable({
  portfolio, quotes, selectedSymbol, onSelect, onRemove, onAddStock,
  currency, exchangeRate, alerts, onToggleAlert,
}) {
  const totalValue = portfolio.reduce((sum, s) => {
    const q = quotes[s.symbol];
    return sum + (q?.regularMarketPrice ? q.regularMarketPrice * s.shares : 0);
  }, 0);
  const totalCost = portfolio.reduce((sum, s) => sum + s.avgCost * s.shares, 0);
  const totalPnl = totalValue - totalCost;

  const fmtTotal = (usd) =>
    currency === 'THB'
      ? formatTHB(usd * (exchangeRate || 1), 0)
      : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(usd);

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
                currency={currency}
                exchangeRate={exchangeRate}
                alerts={alerts}
                onToggleAlert={onToggleAlert}
              />
            ))}
          </div>

          {/* Summary Bar */}
          {totalValue > 0 && (
            <div className="pt-3 border-t border-gray-800 space-y-1.5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">มูลค่ารวม</span>
                <span className="font-mono font-bold">{fmtTotal(totalValue)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">กำไร/ขาดทุนรวม</span>
                <span className={`font-mono font-semibold ${totalPnl >= 0 ? 'gain' : 'loss'}`}>
                  {totalPnl >= 0 ? '+' : ''}{fmtTotal(totalPnl)}
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
