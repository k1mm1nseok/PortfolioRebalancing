import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
})

export interface OptimizeRequest {
  tickers: string[]
  start_date?: string
  end_date?: string
  min_weight?: number
  max_weight?: number
  total_investment: number
  views?: Record<string, number>
  current_holdings?: Record<string, number>
}

export interface OptimizeResponse {
  weights: Record<string, number>
  metrics: {
    expected_return: number
    volatility: number
    sharpe_ratio: number
  }
  allocation: Record<string, number>
  leftover_cash: number
  trades: Record<string, { action: string; amount: number }>
}

export const optimizePortfolio = async ({
  tickers,
  start_date,
  end_date,
  min_weight,
  max_weight,
  total_investment,
  views,
  current_holdings,
}: OptimizeRequest): Promise<OptimizeResponse> => {
  const response = await api.post<OptimizeResponse>('/optimize', {
    tickers,
    start_date,
    end_date,
    min_weight,
    max_weight,
    total_investment,
    views,
    current_holdings,
  })
  return response.data
}

export default api
