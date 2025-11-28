type OrderTableProps = {
  allocation: Record<string, number>
  leftover: number
  trades: Record<string, { action: string; amount: number }>
}

const getActionClass = (action: string) => {
  const normalized = action.toUpperCase()
  if (normalized === 'BUY') return 'text-green-700 bg-green-50 px-3 py-1 rounded-full text-xs font-bold'
  if (normalized === 'SELL') return 'text-red-700 bg-red-50 px-3 py-1 rounded-full text-xs font-bold'
  return 'text-gray-500'
}

export function OrderTable({ allocation, leftover, trades }: OrderTableProps) {
  const tickers = Object.keys(allocation)

  return (
    <div className="flex flex-col h-full">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ticker
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Target
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tickers.map((ticker) => {
              const trade = trades[ticker] || { action: 'HOLD', amount: 0 }
              const normalizedAction = trade.action.toUpperCase()
              return (
                <tr key={ticker}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ticker}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                {allocation[ticker]}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                <span className={getActionClass(normalizedAction)}>{normalizedAction}</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                {trade.amount}
              </td>
            </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="p-4 bg-gray-50 border-t text-right text-lg font-semibold text-gray-700">
        Leftover Cash: ${leftover.toFixed(2)}
      </div>
    </div>
  )
}

export default OrderTable
