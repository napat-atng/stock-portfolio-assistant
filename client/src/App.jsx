import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header.jsx';
import PortfolioTable from './components/PortfolioTable.jsx';
import StockChart from './components/StockChart.jsx';
import AddStock from './components/AddStock.jsx';
import AIAnalysis from './components/AIAnalysis.jsx';
import PortfolioAllocation from './components/PortfolioAllocation.jsx';
import PriceAlertModal from './components/PriceAlertModal.jsx';
import { fetchQuotes, fetchExchangeRate, exportPortfolioCSV } from './api/stocks.js';

const STORAGE_KEY = 'stock_portfolio_v2';
const ALERTS_KEY  = 'stock_alerts_v1';

const DEFAULT_PORTFOLIO = [
  { symbol: 'AAPL', shares: 10, avgCost: 175.0 },
  { symbol: 'NVDA', shares: 5,  avgCost: 480.0 },
];

export default function App() {
  // ─── Portfolio ──────────────────────────────────────────────────────────────
  const [portfolio, setPortfolio] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_PORTFOLIO;
    } catch { return DEFAULT_PORTFOLIO; }
  });

  const [quotes, setQuotes]               = useState({});
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [loading, setLoading]             = useState(false);
  const [lastUpdated, setLastUpdated]     = useState(null);
  const [showAddModal, setShowAddModal]   = useState(false);
  const [serverError, setServerError]     = useState(false);

  // ─── Currency ───────────────────────────────────────────────────────────────
  const [currency, setCurrency]           = useState(() => localStorage.getItem('currency_pref') || 'USD');
  const [exchangeRate, setExchangeRate]   = useState(null);

  // ─── Price Alerts ───────────────────────────────────────────────────────────
  const [alerts, setAlerts] = useState(() => {
    try { return JSON.parse(localStorage.getItem(ALERTS_KEY) || '{}'); }
    catch { return {}; }
  });
  const [alertModal, setAlertModal] = useState(null); // symbol | null

  // ─── Persist ────────────────────────────────────────────────────────────────
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio)); }, [portfolio]);
  useEffect(() => { localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts)); }, [alerts]);
  useEffect(() => { localStorage.setItem('currency_pref', currency); }, [currency]);

  // ─── Default selected symbol ─────────────────────────────────────────────
  useEffect(() => {
    if (portfolio.length > 0 && !selectedSymbol) setSelectedSymbol(portfolio[0].symbol);
    if (portfolio.length === 0) setSelectedSymbol(null);
  }, [portfolio]);

  // ─── Fetch Exchange Rate (ทุก 1 ชั่วโมง) ──────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchExchangeRate();
        setExchangeRate(data.rate);
      } catch { setExchangeRate(34.5); } // fallback
    };
    load();
    const iv = setInterval(load, 60 * 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  // ─── Fetch Quotes ─────────────────────────────────────────────────────────
  const refreshQuotes = useCallback(async () => {
    if (portfolio.length === 0) return;
    setLoading(true);
    try {
      const symbols = portfolio.map(s => s.symbol);
      const data = await fetchQuotes(symbols);
      const map = {};
      data.forEach(q => { if (q?.symbol) map[q.symbol] = q; });
      setQuotes(map);
      setLastUpdated(new Date());
      setServerError(false);

      // ─── Check Price Alerts ──────────────────────────────────────────────
      Object.entries(alerts).forEach(([sym, alert]) => {
        if (!alert || !map[sym]) return;
        const price = map[sym].regularMarketPrice;
        const triggered =
          (alert.type === 'above' && price >= alert.target) ||
          (alert.type === 'below' && price <= alert.target);
        if (triggered && Notification.permission === 'granted') {
          new Notification(`🔔 ${sym} แจ้งเตือนราคา`, {
            body: `ราคา ${sym} ${alert.type === 'above' ? 'ขึ้นถึง' : 'ลงถึง'} $${price.toFixed(2)} (เป้า: $${alert.target})`,
            icon: '/favicon.ico',
          });
        }
      });
    } catch {
      setServerError(true);
    } finally {
      setLoading(false);
    }
  }, [portfolio, alerts]);

  useEffect(() => {
    refreshQuotes();
    const iv = setInterval(refreshQuotes, 30_000);
    return () => clearInterval(iv);
  }, [refreshQuotes]);

  // ─── Request Notification Permission on first alert ───────────────────────
  const requestNotificationPermission = async () => {
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  // ─── Summary ─────────────────────────────────────────────────────────────
  const summary = portfolio.reduce(
    (acc, stock) => {
      const q = quotes[stock.symbol];
      if (q?.regularMarketPrice) {
        const cur  = q.regularMarketPrice * stock.shares;
        const cost = stock.avgCost * stock.shares;
        acc.totalValue += cur;
        acc.totalCost  += cost;
        acc.totalGain  += cur - cost;
        acc.count++;
      }
      return acc;
    },
    { totalValue: 0, totalCost: 0, totalGain: 0, count: 0 }
  );

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const addOrUpdateStock = (stock) => {
    setPortfolio(prev => {
      const exists = prev.find(s => s.symbol === stock.symbol);
      return exists ? prev.map(s => s.symbol === stock.symbol ? stock : s) : [...prev, stock];
    });
    setSelectedSymbol(stock.symbol);
    setShowAddModal(false);
  };

  const removeStock = (symbol) => {
    setPortfolio(prev => prev.filter(s => s.symbol !== symbol));
    if (selectedSymbol === symbol) {
      const remaining = portfolio.filter(s => s.symbol !== symbol);
      setSelectedSymbol(remaining.length > 0 ? remaining[0].symbol : null);
    }
  };

  const toggleCurrency = () => setCurrency(c => c === 'USD' ? 'THB' : 'USD');

  const handleToggleAlert = async (symbol) => {
    await requestNotificationPermission();
    setAlertModal(symbol);
  };

  const handleSaveAlert = (symbol, alertData) => {
    setAlerts(prev => {
      if (!alertData) {
        const next = { ...prev };
        delete next[symbol];
        return next;
      }
      return { ...prev, [symbol]: alertData };
    });
  };

  const handleExportCSV = () => {
    exportPortfolioCSV(portfolio, quotes, exchangeRate || 1);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header
        summary={summary}
        loading={loading}
        lastUpdated={lastUpdated}
        onRefresh={refreshQuotes}
        onAddStock={() => setShowAddModal(true)}
        serverError={serverError}
        currency={currency}
        onToggleCurrency={toggleCurrency}
        exchangeRate={exchangeRate}
        onExportCSV={handleExportCSV}
      />

      {serverError && (
        <div className="mx-4 mt-4 p-3 bg-red-900/30 border border-red-800 rounded-xl text-red-400 text-sm text-center">
          ⚠️ ไม่สามารถเชื่อมต่อ Backend Server ได้ &mdash; รัน{' '}
          <code className="bg-red-900/50 px-1 rounded">npm run dev</code> ใน project folder ก่อนนะครับ
        </div>
      )}

      <main className="container mx-auto px-4 py-6 max-w-[1400px]">
        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">

          {/* Left: Portfolio */}
          <div>
            <PortfolioTable
              portfolio={portfolio}
              quotes={quotes}
              selectedSymbol={selectedSymbol}
              onSelect={setSelectedSymbol}
              onRemove={removeStock}
              onAddStock={() => setShowAddModal(true)}
              currency={currency}
              exchangeRate={exchangeRate}
              alerts={alerts}
              onToggleAlert={handleToggleAlert}
            />
          </div>

          {/* Right: Chart + AI + Allocation */}
          <div className="space-y-6 min-w-0">
            {selectedSymbol ? (
              <>
                <StockChart
                  symbol={selectedSymbol}
                  quote={quotes[selectedSymbol]}
                  currency={currency}
                  exchangeRate={exchangeRate}
                />
                <AIAnalysis
                  symbol={selectedSymbol}
                  quote={quotes[selectedSymbol]}
                  stock={portfolio.find(s => s.symbol === selectedSymbol)}
                />
                <PortfolioAllocation
                  portfolio={portfolio}
                  quotes={quotes}
                  currency={currency}
                  exchangeRate={exchangeRate}
                />
              </>
            ) : (
              <div className="flex items-center justify-center h-96 card">
                <div className="text-center px-6">
                  <div className="text-7xl mb-4">📈</div>
                  <p className="text-gray-300 text-xl font-semibold mb-2">เริ่มต้นสร้างพอร์ต</p>
                  <p className="text-gray-500 text-sm mb-6">
                    เพิ่มหุ้นเพื่อดูกราฟและรับการวิเคราะห์จาก AI
                  </p>
                  <button onClick={() => setShowAddModal(true)} className="btn-primary">
                    + เพิ่มหุ้นตัวแรก
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      {showAddModal && (
        <AddStock
          onAdd={addOrUpdateStock}
          onClose={() => setShowAddModal(false)}
          existingPortfolio={portfolio}
        />
      )}

      {alertModal && (
        <PriceAlertModal
          symbol={alertModal}
          quote={quotes[alertModal]}
          currentAlert={alerts[alertModal]}
          onSave={handleSaveAlert}
          onClose={() => setAlertModal(null)}
        />
      )}
    </div>
  );
}
