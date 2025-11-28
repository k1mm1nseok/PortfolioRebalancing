import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

type BacktestPoint = {
  date: string
  portfolio: number
  benchmark: number
}

type BacktestChartProps = {
  data: BacktestPoint[]
}

const currencyTick = (value: number) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`
  return `$${value.toFixed(0)}`
}

const dateTick = (value: string) => {
  if (!value) return ''
  const parts = value.split('-')
  if (parts.length >= 2) {
    const [year, month] = parts
    return `${year.slice(-2)}-${month}`
  }
  return value
}

const tooltipFormatter = (value: number) => currencyTick(value)

export default function BacktestChart({ data }: BacktestChartProps) {
  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={dateTick} />
          <YAxis tickFormatter={currencyTick} />
          <Tooltip formatter={tooltipFormatter} labelFormatter={(label) => `Date: ${label}`} />
          <Legend verticalAlign="top" height={36} />
          <Line
            type="monotone"
            dataKey="portfolio"
            stroke="#4f46e5"
            strokeWidth={2}
            dot={false}
            name="Optimized Portfolio"
          />
          <Line
            type="monotone"
            dataKey="benchmark"
            stroke="#9ca3af"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            name="S&P 500 Benchmark"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
