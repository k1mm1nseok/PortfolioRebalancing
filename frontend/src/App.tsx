import { useState } from 'react'
import { optimizePortfolio, type OptimizeResponse } from './api/api'
import PortfolioChart from './components/PortfolioChart'
import OrderTable from './components/OrderTable'
import ComparisonCard from './components/ComparisonCard'

type OptimizationResult = OptimizeResponse & {
  comparison?: {
    current?: OptimizeResponse['metrics']
    optimized?: OptimizeResponse['metrics']
  }
}

type TickerRow = {
  symbol: string
  holdings: number
}

function App() {
  const [tickers, setTickers] = useState<TickerRow[]>([
    { symbol: 'AAPL', holdings: 0 },
    { symbol: 'MSFT', holdings: 0 },
  ])
  const [totalInvestment, setTotalInvestment] = useState<number>(10000)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [minWeight, setMinWeight] = useState<number | ''>('')
  const [maxWeight, setMaxWeight] = useState<number | ''>('')
  const [views, setViews] = useState<Record<string, number>>({})
  const [selectedViewTicker, setSelectedViewTicker] = useState('')
  const [viewValue, setViewValue] = useState<string>('')
  const [result, setResult] = useState<OptimizationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateTicker = (index: number, value: string) => {
    setTickers((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], symbol: value.toUpperCase() }
      return next
    })
  }

  const addTicker = () => setTickers((prev) => [...prev, { symbol: '', holdings: 0 }])

  const removeTicker = (index: number) => {
    setTickers((prev) => prev.filter((_, i) => i !== index))
  }

  const handleHoldingChange = (index: number, value: number) => {
    setTickers((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], holdings: value }
      return next
    })
  }

  const handleAddView = () => {
    if (!selectedViewTicker || viewValue === '') return
    const numeric = Number(viewValue)
    if (Number.isNaN(numeric)) return
    setViews((prev) => ({ ...prev, [selectedViewTicker]: numeric / 100 }))
    setSelectedViewTicker('')
    setViewValue('')
  }

  const handleRemoveView = (ticker: string) => {
    setViews((prev) => {
      const updated = { ...prev }
      delete updated[ticker]
      return updated
    })
  }

  const handleOptimize = async () => {
    const cleanedTickers = tickers
      .map((t) => t.symbol.trim().toUpperCase())
      .filter(Boolean)
    if (cleanedTickers.length === 0) {
      setError('Please add at least one ticker.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const holdingsMap: Record<string, number> = {}
      tickers.forEach(({ symbol, holdings }) => {
        const cleaned = symbol.trim().toUpperCase()
        if (cleaned) {
          holdingsMap[cleaned] = holdings
        }
      })

      const response = await optimizePortfolio({
        tickers: cleanedTickers,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        min_weight: minWeight === '' ? undefined : Number(minWeight),
        max_weight: maxWeight === '' ? undefined : Number(maxWeight),
        total_investment: totalInvestment,
        views,
        current_holdings: Object.keys(holdingsMap).length ? holdingsMap : undefined,
      })
      setResult(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Optimization failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <h1 className="text-xl font-bold text-indigo-600">QuantPortfolio</h1>
        </div>
      </nav>

      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Input Section */}
        <div className="max-w-7xl mx-auto bg-white shadow-sm rounded-xl p-8 mb-10 border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-4 bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-4 bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">Total Investment (USD)</label>
              <input
                type="number"
                value={totalInvestment}
                onChange={(e) => setTotalInvestment(Number(e.target.value))}
                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-4 bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">Min Weight (0-1)</label>
              <input
                type="number"
                value={minWeight}
                step="0.01"
                min="0"
                max="1"
                onChange={(e) => setMinWeight(e.target.value === '' ? '' : Number(e.target.value))}
                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-4 bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">Max Weight (0-1)</label>
              <input
                type="number"
                value={maxWeight}
                step="0.01"
                min="0"
                max="1"
                onChange={(e) => setMaxWeight(e.target.value === '' ? '' : Number(e.target.value))}
                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-4 bg-gray-50"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleOptimize}
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-lg text-lg shadow-md transition-all disabled:opacity-60"
              >
                {loading ? 'Optimizing...' : 'Optimize Portfolio'}
              </button>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-800">Tickers & Current Holdings</h3>
                <button
                  type="button"
                  onClick={addTicker}
                  className="px-3 py-2 text-sm font-medium bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Add Ticker
                </button>
              </div>
              <div className="space-y-3">
                {tickers.map((ticker, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3">
                    <div className="col-span-5 sm:col-span-4">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Ticker</label>
                      <input
                        value={ticker.symbol}
                        onChange={(e) => updateTicker(index, e.target.value)}
                        placeholder="e.g. AAPL"
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-4 bg-gray-50"
                      />
                    </div>
                    <div className="col-span-5 sm:col-span-4">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Current Holdings (shares)</label>
                      <input
                        type="number"
                        value={ticker.holdings === 0 ? '' : ticker.holdings}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseInt(e.target.value) || 0
                          handleHoldingChange(index, val)
                        }}
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-4 bg-gray-50"
                      />
                    </div>
                    <div className="col-span-2 flex items-end">
                      <button
                        type="button"
                        onClick={() => removeTicker(index)}
                        className="w-full px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-800">Black-Litterman Views</h3>
                <button
                  type="button"
                  onClick={handleAddView}
                  className="px-3 py-2 text-sm font-medium bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Add View
                </button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-5 sm:col-span-5">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Ticker</label>
                    <select
                      value={selectedViewTicker}
                      onChange={(e) => setSelectedViewTicker(e.target.value)}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-4 bg-gray-50"
                    >
                      <option value="">Select ticker</option>
                      {tickers
                        .map((t) => t.symbol.trim())
                        .filter(Boolean)
                        .map((symbol) => (
                          <option key={symbol} value={symbol}>
                            {symbol}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="col-span-5 sm:col-span-5">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Expected Return (%)</label>
                    <input
                      type="number"
                      value={viewValue}
                      onChange={(e) => setViewValue(e.target.value)}
                      step="0.1"
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-4 bg-gray-50"
                    />
                  </div>
                  <div className="col-span-2 flex items-end">
                    <button
                      type="button"
                      onClick={handleAddView}
                      className="w-full px-3 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {Object.entries(views).map(([tickerSymbol, value]) => (
                    <div
                      key={tickerSymbol}
                      className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2 bg-white"
                    >
                      <span className="text-sm text-gray-800">
                        {tickerSymbol}: {(value * 100).toFixed(1)}%
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveView(tickerSymbol)}
                        className="text-red-600 text-sm font-medium hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {Object.keys(views).length === 0 && (
                    <p className="text-sm text-gray-500">No views added yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
              {error}
            </div>
          )}
        </div>

        {/* Dashboard Section */}
        {result && (
          <div className="space-y-6">
            <div className="max-w-7xl mx-auto">
              <ComparisonCard
                currentMetrics={result.comparison?.current}
                optimizedMetrics={result.comparison?.optimized || result.metrics}
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
              <div className="xl:col-span-4 bg-white shadow-sm rounded-xl p-6 border border-gray-100 h-[500px] flex flex-col">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900">Target Allocation</h3>
                  <span className="text-xs text-gray-500">
                    {Object.keys(views).length > 0 ? 'Black-Litterman' : 'Mean-Variance'}
                  </span>
                </div>
                <div className="flex-1">
                  <PortfolioChart data={result.weights} hasViews={Object.keys(views).length > 0} />
                </div>
              </div>

              <div className="xl:col-span-3 flex flex-col gap-5">
                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
                  <div className="text-sm font-medium text-gray-500 uppercase">Expected Return</div>
                  <div className="text-3xl font-bold text-gray-900 mt-2">
                    {(result.metrics.expected_return * 100).toFixed(2)}%
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500">
                  <div className="text-sm font-medium text-gray-500 uppercase">Volatility</div>
                  <div className="text-3xl font-bold text-gray-900 mt-2">
                    {(result.metrics.volatility * 100).toFixed(2)}%
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
                  <div className="text-sm font-medium text-gray-500 uppercase">Sharpe Ratio</div>
                  <div className="text-3xl font-bold text-gray-900 mt-2">{result.metrics.sharpe_ratio.toFixed(2)}</div>
                </div>
              </div>

              <div className="xl:col-span-5 bg-white shadow-sm rounded-xl overflow-hidden border border-gray-100">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 font-semibold text-gray-900">
                  Rebalancing Orders
                </div>
                <OrderTable allocation={result.allocation} leftover={result.leftover_cash} trades={result.trades} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
