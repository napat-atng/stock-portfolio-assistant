import { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';
import { fetchHistory, formatCurrency, formatLargeNumber } from '../api/stocks.js';

const PERIODS = [
  { label: '1D', value: '1d' },
  { label: '1W', value: '1w' },
  { label: '1M', value: '1m' },
  { label: '3M', value: '3m' },
  { label: '1Y', value: '1y' },
];

export default function StockChart({ symbol, quote }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const [period, setPeriod] = useState('3m');
  const [loading, setLoading] = useState(false);
  const [chartReady, setChartReady] = useState(false);

  // สร้าง chart
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: '#111827' },
        textColor: '#9CA3AF',
        fontSize: 12,
      },
      grid: {
        vertLines: { color: '#1F2937' },
        horzLines: { color: '#1F2937' },
      },
      crosshair: { mode: 1 },
      rightPriceScale: {
        borderColor: '#374151',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: '#374151',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: true,
      handleScale: true,
    });

    // ใช้ addCandlestickSeries() โดยตรง (lightweight-charts v4+)
    const series = chart.addCandlestickSeries({
      upColor: '#10B981',
      downColor: '#EF4444',
      borderUpColor: '#10B981',
      borderDownColor: '#EF4444',
      wickUpColor: '#10B981',
      wickDownColor: '#EF4444',
    });

    chartRef.current = chart;
    seriesRef.current = series;
    setChartReady(true);

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      setChartReady(false);
    };
  }, []);

  // โหลดข้อมูลเมื่อ symbol หรือ period เปลี่ยน (ใช้ ref แทน chartReady เพื่อไม่ให้ trigger ซ้ำ)
  useEffect(() => {
    if (!symbol || !chartReady) return;
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      try {
        const data = await fetchHistory(symbol, period);
        if (cancelled || !seriesRef.current) return;

        const quotes = (data?.quotes || [])
          .filter(q => q.open != null && q.high != null && q.low != null && q.close != null)
          .map(q => ({
            time: Math.floor(new Date(q.date).getTime() / 1000),
            open: parseFloat(q.open.toFixed(4)),
            high: parseFloat(q.high.toFixed(4)),
            low: parseFloat(q.low.toFixed(4)),
            close: parseFloat(q.close.toFixed(4)),
          }))
          .sort((a, b) => a.time - b.time);

        const seen = new Set();
        const unique = quotes.filter(q => {
          if (seen.has(q.time)) return false;
          seen.add(q.time);
          return true;
        });

        seriesRef.current.setData(unique);
        chartRef.current?.timeScale().fitContent();
      } catch (err) {
        if (!cancelled) console.error('Chart load error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, [symbol, period, chartReady]);

  const change = quote?.regularMarketChange;
  const changePct = quote?.regularMarketChangePercent;
  const isUp = (change ?? 0) >= 0;

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">{symbol}</h2>
            {quote?.shortName && (
              <span className="text-sm text-gray-400">{quote.shortName}</span>
            )}
          </div>
          {quote?.regularMarketPrice && (
            <div className="flex items-baseline gap-3 mt-1">
              <span className="font-mono text-3xl font-bold">
                {formatCurrency(quote.regularMarketPrice)}
              </span>
              <span className={`text-base font-semibold ${isUp ? 'gain' : 'loss'}`}>
                {isUp ? '▲' : '▼'} {Math.abs(change).toFixed(2)} ({isUp ? '+' : ''}{changePct?.toFixed(2)}%)
              </span>
            </div>
          )}

          {/* Stats row */}
          {quote && (
            <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
              <span>เปิด <span className="text-gray-300">{formatCurrency(quote.regularMarketOpen)}</span></span>
              <span>สูงสุด <span className="text-emerald-400">{formatCurrency(quote.regularMarketDayHigh)}</span></span>
              <span>ต่ำสุด <span className="text-red-400">{formatCurrency(quote.regularMarketDayLow)}</span></span>
              <span>Volume <span className="text-gray-300">{(quote.regularMarketVolume || 0).toLocaleString()}</span></span>
              <span>Mkt Cap <span className="text-gray-300">{formatLargeNumber(quote.marketCap)}</span></span>
              {quote.trailingPE && <span>P/E <span className="text-gray-300">{quote.trailingPE?.toFixed(1)}</span></span>}
            </div>
          )}
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-1 bg-gray-800 p-1 rounded-xl">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                period === p.value
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative rounded-xl overflow-hidden bg-gray-900" style={{ height: 420 }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/70 z-10">
            <div className="flex items-center gap-2 text-gray-400">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent" />
              <span className="text-sm">กำลังโหลดข้อมูล...</span>
            </div>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
