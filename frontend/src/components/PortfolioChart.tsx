import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'

interface PortfolioChartProps {
  data: Record<string, number>
  comparisonData?: Record<string, number>
}

const COLORS = ['#2563EB', '#0EA5E9', '#6366F1', '#F59E0B', '#10B981', '#8B5CF6', '#F472B6', '#14B8A6']

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const datum = payload[0]
    return (
      <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-md text-sm">
        <p className="font-bold text-gray-900">{datum.name}</p>
        <p className="text-indigo-600 font-medium">{(datum.value * 100).toFixed(2)}%</p>
      </div>
    )
  }
  return null
}

export function PortfolioChart({ data, comparisonData }: PortfolioChartProps) {
  const sourceData = comparisonData || data
  const chartData = Object.entries(sourceData)
    .map(([name, value]) => ({ name, value: Number(value) }))
    .filter((item) => !Number.isNaN(item.value) && item.value !== 0)

  return (
    <div className="w-full h-[360px]">
      {chartData.length === 0 ? (
        <div className="flex h-full items-center justify-center text-gray-500 text-sm">
          No allocation data to display.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} innerRadius={60}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

export default PortfolioChart
