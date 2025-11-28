import { useEffect, useState } from "react";
import html2canvas from "html2canvas";
import { optimizePortfolio } from "./api/api";
import PortfolioChart from "./components/PortfolioChart";
import OrderTable from "./components/OrderTable";
import ComparisonCard from "./components/ComparisonCard";
import BacktestChart from "./components/BacktestChart";
import DashboardSkeleton from "./components/DashboardSkeleton";

// Types
type TickerRow = {
  symbol: string;
  holdings: number;
};

type OptimizationResult = {
  weights: Record<string, number>;
  metrics: {
    expected_return: number;
    volatility: number;
    sharpe_ratio: number;
  };

  allocation: Record<string, number>;
  leftover_cash: number;
  trades?: Record<string, { action: string; amount: number }>;
  comparison?: {
    current: { expected_return: number; volatility: number; sharpe_ratio: number };
    optimized: { expected_return: number; volatility: number; sharpe_ratio: number };
  };
};

const DEFAULT_TICKERS: TickerRow[] = [
  { symbol: "AAPL", holdings: 0 },
  { symbol: "MSFT", holdings: 0 },
];

function App() {
  // State
  const [tickers, setTickers] = useState<TickerRow[]>(() => {
    try {
      const saved = localStorage.getItem("portfolio_tickers");
      return saved ? JSON.parse(saved) : DEFAULT_TICKERS;
    } catch {
      return DEFAULT_TICKERS;
    }
  });
  const [totalInvestment, setTotalInvestment] = useState<number | string>(() => {
    try {
      const saved = localStorage.getItem("portfolio_investment");
      const parsed = saved ? parseFloat(saved) : 10000;
      return Number.isNaN(parsed) ? 10000 : parsed;
    } catch {
      return 10000;
    }
  });
  const [minWeight, setMinWeight] = useState<number | string>(() => {
    try {
      const saved = localStorage.getItem("portfolio_min_weight");
      const parsed = saved ? parseFloat(saved) : 0;
      return Number.isNaN(parsed) ? 0 : parsed;
    } catch {
      return 0;
    }
  });
  const [maxWeight, setMaxWeight] = useState<number | string>(() => {
    try {
      const saved = localStorage.getItem("portfolio_max_weight");
      const parsed = saved ? parseFloat(saved) : 1;
      return Number.isNaN(parsed) ? 1 : parsed;
    } catch {
      return 1;
    }
  });
  const [startDate, setStartDate] = useState("2020-01-01");
  const [endDate, setEndDate] = useState("2025-11-27");
  
  // Black-Litterman Views
  const [views, setViews] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem("portfolio_views");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [selectedViewTicker, setSelectedViewTicker] = useState("");
  const [viewValue, setViewValue] = useState<string>("");

  // Result
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [loading, setLoading] = useState(false);

  // --- Handlers ---

  const handleReset = () => {
    localStorage.removeItem("portfolio_tickers");
    localStorage.removeItem("portfolio_investment");
    localStorage.removeItem("portfolio_min_weight");
    localStorage.removeItem("portfolio_max_weight");
    localStorage.removeItem("portfolio_views");
    setTickers(DEFAULT_TICKERS);
    setTotalInvestment(10000);
    setMinWeight(0);
    setMaxWeight(1);
    setViews({});
    setSelectedViewTicker("");
    setViewValue("");
  };

  const handleDownloadOrderSheet = async () => {
    const element = document.getElementById("order-sheet-container");
    if (!element) return;
    try {
      const canvas = await html2canvas(element);
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = "rebalancing-order.png";
      link.click();
    } catch (err) {
      console.error("Failed to capture order sheet", err);
    }
  };

  // 1. Ticker Handlers
  const addTicker = () => {
    setTickers((prev) => [...prev, { symbol: "", holdings: 0 }]);
  };

  const removeTicker = (index: number) => {
    setTickers((prev) => prev.filter((_, i) => i !== index));
  };

  const updateTickerSymbol = (index: number, val: string) => {
    setTickers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], symbol: val.toUpperCase() };
      return next;
    });
  };

  const updateTickerHoldings = (index: number, valStr: string) => {
    // Handle empty string as 0, otherwise parse
    const val = valStr === "" ? 0 : parseInt(valStr) || 0;
    setTickers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], holdings: val };
      return next;
    });
  };

  // 2. View Handlers
  const handleAddView = () => {
    if (!selectedViewTicker || viewValue === "") return;
    const numeric = parseFloat(viewValue);
    if (isNaN(numeric)) return;

    // Convert % to decimal (e.g. 5.0 -> 0.05)
    const ticker = selectedViewTicker.trim().toUpperCase();
    setViews((prev) => ({ ...prev, [ticker]: numeric / 100 }));
    setViewValue("");
    setSelectedViewTicker("");
  };

  const handleRemoveView = (ticker: string) => {
    const next = { ...views };
    delete next[ticker];
    setViews(next);
  };

  // 3. Optimize Handler
  const handleOptimize = async () => {
    const cleanedTickers = tickers
      .map((t) => t.symbol.trim().toUpperCase())
      .filter(Boolean);
    if (cleanedTickers.length === 0) {
      alert("Please add at least one ticker.");
      return;
    }

    setLoading(true);
    
    // Construct holdings map
    const holdingsMap: Record<string, number> = {};
    tickers.forEach(t => {
      const cleaned = t.symbol.trim().toUpperCase();
      if (cleaned) holdingsMap[cleaned] = t.holdings;
    });

    try {
      const response = await optimizePortfolio({
        tickers: cleanedTickers,
        total_investment: Number(totalInvestment),
        start_date: startDate,
        end_date: endDate,
        min_weight: Number(minWeight),
        max_weight: Number(maxWeight),
        views: Object.keys(views).length > 0 ? views : undefined,
        current_holdings: Object.keys(holdingsMap).length > 0 ? holdingsMap : undefined,
      });
      setResult(response);
    } catch (err) {
      console.error(err);
      alert("Optimization failed. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  // Styles
  const inputStyle = "block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-4 bg-gray-50 border";
  const modelName =
    Object.keys(views).length > 0 ? "Black-Litterman Model" : "Mean-Variance Model (Standard)";

  // Persist user inputs
  useEffect(() => {
    localStorage.setItem("portfolio_tickers", JSON.stringify(tickers));
  }, [tickers]);

  useEffect(() => {
    localStorage.setItem("portfolio_investment", String(totalInvestment || 0));
  }, [totalInvestment]);

  useEffect(() => {
    localStorage.setItem("portfolio_min_weight", String(minWeight || 0));
  }, [minWeight]);

  useEffect(() => {
    localStorage.setItem("portfolio_max_weight", String(maxWeight || 1));
  }, [maxWeight]);

  useEffect(() => {
    localStorage.setItem("portfolio_views", JSON.stringify(views));
  }, [views]);

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
              <span>📊</span> Quant Portfolio
            </h1>
          </div>
        </div>
      </nav>

      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* INPUT SECTION */}
        <div className="max-w-7xl mx-auto bg-white shadow-sm rounded-xl p-8 mb-10 border border-gray-100 space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Portfolio Inputs</h2>
              <p className="text-sm text-gray-500">Configure tickers, constraints, and views.</p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Reset All
            </button>
          </div>
          
          {/* Global Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Investment ($)</label>
              <input
                type="number"
                value={totalInvestment === 0 ? "" : totalInvestment}
                onChange={(e) => setTotalInvestment(e.target.value === "" ? 0 : parseFloat(e.target.value))}
                className={inputStyle}
                placeholder="e.g. 10000"
              />
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
               <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputStyle} />
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
               <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputStyle} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Weight (0-1)</label>
                <input type="number" step="0.01" value={minWeight} onChange={(e) => setMinWeight(e.target.value)} className={inputStyle} />
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Weight (0-1)</label>
                <input type="number" step="0.01" value={maxWeight} onChange={(e) => setMaxWeight(e.target.value)} className={inputStyle} />
             </div>
          </div>

          <hr className="border-gray-100" />

          {/* Tickers Input Grid */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Tickers & Current Holdings</h3>
              <button type="button" onClick={addTicker} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                + Add Ticker
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tickers.map((t, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm relative">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Ticker</label>
                      <input
                        value={t.symbol}
                        onChange={(e) => updateTickerSymbol(index, e.target.value)}
                        className="block w-full rounded border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                        placeholder="AAPL"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Shares (Holdings)</label>
                      <input
                        type="number"
                        value={t.holdings === 0 ? "" : t.holdings}
                        onChange={(e) => updateTickerHoldings(index, e.target.value)}
                        className="block w-full rounded border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTicker(index)}
                    className="absolute top-2 right-2 text-red-400 hover:text-red-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Views Input */}
          <div>
             <h3 className="text-lg font-semibold text-gray-800 mb-4">Black-Litterman Views</h3>
             <div className="flex flex-col md:flex-row gap-4 items-end mb-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex-1 w-full">
                   <label className="block text-xs text-gray-500 mb-1">Select Ticker</label>
                   <select
                      value={selectedViewTicker}
                      onChange={(e) => setSelectedViewTicker(e.target.value)}
                      className={inputStyle}
                  >
                      <option value="">Select...</option>
                      {tickers.map(t => t.symbol.trim()).filter(Boolean).map(s => (
                         <option key={s} value={s.toUpperCase()}>{s.toUpperCase()}</option>
                      ))}
                   </select>
                </div>
                <div className="flex-1 w-full">
                   <label className="block text-xs text-gray-500 mb-1">Expected Return (%)</label>
                   <input
                      type="number" step="0.1"
                      placeholder="e.g. 5.0"
                      value={viewValue}
                      onChange={(e) => setViewValue(e.target.value)}
                      className={inputStyle}
                   />
                </div>
                <div>
                   <button
                      type="button"
                      onClick={handleAddView}
                      className="w-full md:w-auto px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition shadow-sm"
                   >
                      Add View
                   </button>
                </div>
             </div>

             {/* Views List */}
             {Object.keys(views).length > 0 && (
               <div className="flex flex-wrap gap-2 mt-3">
                 {Object.entries(views).map(([ticker, val]) => (
                   <span key={ticker} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                     {ticker}: {(val * 100).toFixed(1)}%
                     <button
                       type="button"
                       onClick={() => handleRemoveView(ticker)}
                       className="ml-2 text-indigo-600 hover:text-indigo-900 font-bold"
                     >
                       ×
                     </button>
                   </span>
                 ))}
               </div>
             )}
          </div>

          <button
            type="button"
            onClick={handleOptimize}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl text-lg shadow-md transition-all mt-6 disabled:opacity-50"
          >
            {loading ? "Optimizing..." : "Run Optimization"}
          </button>
        </div>

        {/* RESULTS SECTION */}
        {loading ? (
          <div className="mt-10">
            <DashboardSkeleton />
          </div>
        ) : result ? (
          <div className="animate-fade-in-up">
            {/* Comparison Card */}
            <div className="max-w-7xl mx-auto mb-8">
              <ComparisonCard
                currentMetrics={result.comparison?.current}
                optimizedMetrics={result.comparison?.optimized || result.metrics}
              />
            </div>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* 1. Allocation Chart */}
              <div className="lg:col-span-4 bg-white shadow rounded-lg p-6 h-[500px] flex flex-col">
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Target Allocation</h3>
                <div className="flex-grow">
                   <PortfolioChart data={result.weights} />
                </div>
                <div className="mt-4 text-center">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      Object.keys(views).length > 0 ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {Object.keys(views).length > 0 ? "Black-Litterman Model" : "Mean-Variance Model (Standard)"}
                  </span>
                </div>
              </div>

              {/* 2. Key Metrics */}
              <div className="lg:col-span-3 flex flex-col gap-4">
                 <div className="bg-white shadow rounded-lg p-6 border-l-4 border-blue-500">
                    <dt className="text-sm font-medium text-gray-500 uppercase">Exp. Return</dt>
                    <dd className="mt-2 text-3xl font-bold text-gray-900">{(result.metrics.expected_return * 100).toFixed(2)}%</dd>
                 </div>
                 <div className="bg-white shadow rounded-lg p-6 border-l-4 border-red-500">
                    <dt className="text-sm font-medium text-gray-500 uppercase">Volatility</dt>
                    <dd className="mt-2 text-3xl font-bold text-gray-900">{(result.metrics.volatility * 100).toFixed(2)}%</dd>
                 </div>
                 <div className="bg-white shadow rounded-lg p-6 border-l-4 border-green-500">
                    <dt className="text-sm font-medium text-gray-500 uppercase">Sharpe Ratio</dt>
                    <dd className="mt-2 text-3xl font-bold text-gray-900">{result.metrics.sharpe_ratio.toFixed(2)}</dd>
                 </div>
              </div>

              {/* 3. Order Sheet */}
              <div
                id="order-sheet-container"
                className="lg:col-span-5 bg-white shadow rounded-lg overflow-hidden border border-gray-100"
              >
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">Rebalancing Orders</h3>
                  <button
                    type="button"
                    onClick={handleDownloadOrderSheet}
                    className="text-sm bg-indigo-50 text-indigo-600 px-3 py-1 rounded border border-indigo-200 hover:bg-indigo-100 transition"
                  >
                    📷 Save
                  </button>
                </div>
                <OrderTable
                  allocation={result.allocation}
                  leftover={result.leftover_cash}
                  trades={result.trades}
                />
              </div>

            </div>
          </div>
        ) : null}
      </main>

      {result?.backtest_curve && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mt-8 bg-white shadow rounded-lg p-6 border border-gray-100">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Historical Performance (Backtest vs S&P 500)</h3>
            <BacktestChart data={result.backtest_curve} />
            <p className="mt-3 text-xs text-gray-500">
              Simulated performance based on historical data. Does not guarantee future results.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
