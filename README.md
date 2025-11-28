# Portfolio Rebalancing

Full-stack tool for optimizing and rebalancing equity portfolios. The backend uses FastAPI and PyPortfolioOpt (mean-variance and Black-Litterman) with yfinance data; the frontend is a React + Vite dashboard for entering tickers, constraints, and views, then visualizing allocations and trades.

## Features
- Mean-variance max Sharpe optimization with weight bounds.
- Optional Black-Litterman views to tilt returns.
- Discrete share allocations for a target investment amount plus leftover cash.
- Trade guidance vs. current holdings (buy/sell/hold).
- Charts and metric comparison (expected return, volatility, Sharpe).

## Requirements
- Python 3.9+ (backend)
- Node.js 18+ and npm (frontend)

## Backend (FastAPI)
1) Create/activate a venv (recommended):
   - Windows: `cd backend && python -m venv venv && venv\Scripts\activate`
   - macOS/Linux: `cd backend && python -m venv venv && source venv/bin/activate`
2) Install dependencies: `pip install -r requirements.txt`
3) Run the API (default base URL `http://localhost:8080`):
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
   ```

### API quick check
```bash
curl -X POST http://localhost:8080/api/v1/optimize \
  -H "Content-Type: application/json" \
  -d '{
        "tickers": ["AAPL", "MSFT", "GOOGL"],
        "total_investment": 10000,
        "min_weight": 0.05,
        "max_weight": 0.5,
        "views": {"AAPL": 0.05}
      }'
```

## Frontend (Vite React)
1) `cd frontend`
2) Install deps: `npm install`
3) Start dev server (defaults to `http://localhost:5173`):
   ```bash
   npm run dev
   ```
The app expects the backend at `http://localhost:8080/api/v1` (configured in `frontend/src/api/api.ts`).

## Repository layout
- `backend/` — FastAPI app, optimization logic, yfinance data loader.
- `frontend/` — React UI for inputs, charts, and trade output.
- `.gitignore` — excludes venvs, node_modules, build artifacts, editor files.

## Notes
- Ensure `yfinance` can reach the internet when fetching data.
- If using custom environments, keep backend and frontend URLs aligned. Adjust `frontend/src/api/api.ts` or use a proxy if needed.
