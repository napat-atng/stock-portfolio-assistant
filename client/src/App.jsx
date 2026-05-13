import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header.jsx';
import PortfolioTable from './components/PortfolioTable.jsx';
import StockChart from './components/StockChart.jsx';
import AddStock from './components/AddStock.jsx';
import AIAnalysis from './components/AIAnalysis.jsx';
import { fetchQuotes } from './api/stocks.js';

const STORAGE_KEY = 'stock_portfolio_v2';

const DEFAULT_PORTFOLIO = [
  { symbol: 'AAPL', shares: 10, avgCost: 175.0 },
  { symbol: 'NVDA', shares: 5, avgCost: 480.0 },
];

export default function App() {
  const [portfolio, setPortfolio] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_PORTFOLIO;
    } catch {
      return DEFAULT_PORTFOLIO;
    }
  });

  const [quotes, setQuotes] = useState({});
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [serverError, setServerError] = useState(false);

  // บันทึกพอร์ตลง localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio));
  }, [portfolio]);

  // ตั้งหุ้นตัวแรกเป็น default
  useEffect(() => {
    if (portfolio.length > 0 && !selectedSymbol) {
      setSelectedSymbol(portfolio[0].symbol);
    }
    if (portfolio.length === 0) {
      setSelectedSymbol(null);
    }
  }, [portfolio]);

  // ดึงราคาทั้งหมด
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
    } catch {
      setServerError(true);
    } finally {
      setLoading(false);
    }
  }, [portfolio]);

  useEffect(() => {
    refreshQuotes();
    const interval = setInterval(refreshQuotes, 30_000);
    return () => clearInterval(interval);
  }, [refreshQuotes]);

  // คำนวณสรุปพอร์ต
  const summary = portfolio.reduce(
    (acc, stock) => {
      const q = quotes[stock.symbol];
      if (q?.regularMarketPrice) {
        const cur = q.regularMarketPrice * stock.shares;
        const cost = stock.avgCost * stock.shares;
        acc.totalValue += cur;
        acc.totalCost += cost;
        acc.totalGain += cur - cost;
        acc.count++;
      }
      return acc;
    },
    { totalValue: 0, totalCost: 0, totalGain: 0, count: 0 }
  );

  const addOrUpdateStock = (stock) => {
    setPortfolio(prev => {
      const exists = prev.find(s => s.symbol === stock.symbol);
      if (exists) {
        return prev.map(s => s.symbol === stock.symbol ? stock : s);
      }
      return [...prev, stock];
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

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header
        summary={summary}
        loading={loading}
        lastUpdated={lastUpdated}
        onRefresh={refreshQuotes}
        onAddStock={() => setShowAddModal(true)}
        serverError={serverError}
      />

      {serverError && (
        <div className="mx-4 mt-4 p-3 bg-red-900/30 border border-red-800 rounded-xl text-red-400 text-sm text-center">
          ⚠️ ไม่สามารถเชื่อมต่อ Backend Server ได้ &mdash; รัน <code className="bg-red-900/50 px-1 rounded">npm run dev</code> ใน project folder ก่อนนะครับ
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
            />
          </div>

          {/* Right: Chart + AI */}
          <div className="space-y-6 min-w-0">
            {selectedSymbol ? (
              <>
                <StockChart
                  symbol={selectedSymbol}
                  quote={quotes[selectedSymbol]}
                />
                <AIAnalysis
                  symbol={selectedSymbol}
                  quote={quotes[selectedSymbol]}
                  stock={portfolio.find(s => s.symbol === selectedSymbol)}
                />
              </>
            ) : (
              <div className="flex items-center justify-center h-96 card">
                <div className="text-center px-6">
                  <div className="text-7xl mb-4">📈</div>
                  <p className="text-gray-300 text-xl font-semibold mb-2">
                    เริ่มต้นสร้างพอร์ต
                  </p>
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

      {showAddModal && (
        <AddStock
          onAdd={addOrUpdateStock}
          onClose={() => setShowAddModal(false)}
          existingPortfolio={portfolio}
        />
      )}
    </div>
  );
}
