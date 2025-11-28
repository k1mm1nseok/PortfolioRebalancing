import { useState } from 'react'

type View = {
  ticker: string
  expectedReturn: number
}

type ViewInputProps = {
  availableTickers: string[]
  onViewsChange: (views: Record<string, number>) => void
}

export function ViewInput({ availableTickers, onViewsChange }: ViewInputProps) {
  const [selectedTicker, setSelectedTicker] = useState('')
  const [expectedReturn, setExpectedReturn] = useState<string>('0')
  const [viewsList, setViewsList] = useState<View[]>([])

  const syncViews = (list: View[]) => {
    const dict: Record<string, number> = {}
    list.forEach((item) => {
      dict[item.ticker] = item.expectedReturn
    })
    onViewsChange(dict)
  }

  const addView = () => {
    if (!selectedTicker) return
    if (expectedReturn === '') return
    const newView: View = { ticker: selectedTicker, expectedReturn: Number(expectedReturn) / 100 }
    // Replace existing view for ticker if it exists.
    const filtered = viewsList.filter((v) => v.ticker !== selectedTicker)
    const updated = [...filtered, newView]
    setViewsList(updated)
    syncViews(updated)
  }

  const removeView = (ticker: string) => {
    const updated = viewsList.filter((v) => v.ticker !== ticker)
    setViewsList(updated)
    syncViews(updated)
  }

  return (
    <div className="views-card">
      <h3>Black-Litterman Views</h3>
      <div className="views-form">
        <select
          value={selectedTicker}
          onChange={(e) => setSelectedTicker(e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
        >
          <option value="">Select ticker</option>
          {availableTickers.map((ticker) => (
            <option key={ticker} value={ticker}>
              {ticker}
            </option>
          ))}
        </select>
        <input
          type="number"
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
          placeholder="Expected Return (%)"
          value={expectedReturn}
          onChange={(e) => setExpectedReturn(e.target.value === '' ? '' : e.target.value)}
          step="0.1"
        />
        <button type="button" className="views-add" onClick={addView}>
          Add View
        </button>
      </div>

      <ul className="views-list">
        {viewsList.map((view) => (
          <li key={view.ticker} className="views-item">
            <span>
              {view.ticker}: {(view.expectedReturn * 100).toFixed(1)}%
            </span>
            <button type="button" onClick={() => removeView(view.ticker)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ViewInput
