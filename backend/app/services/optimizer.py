import logging
from typing import Dict, Any, Optional

from pypfopt import (
    EfficientFrontier,
    expected_returns,
    risk_models,
    DiscreteAllocation,
    get_latest_prices,
    black_litterman,
)
from pypfopt.exceptions import OptimizationError

from .data_loader import fetch_historical_data

logger = logging.getLogger(__name__)


class PortfolioOptimizer:
    def __init__(self, prices):
        self.prices = prices

    def optimize_max_sharpe(
        self,
        min_weight: float = 0.05,
        max_weight: float = 0.3,
    ) -> Dict[str, Any]:
        """
        Optimize portfolio for maximum Sharpe ratio.
        """
        try:
            mu = expected_returns.mean_historical_return(self.prices)
            sigma = risk_models.sample_cov(self.prices)

            ef = EfficientFrontier(mu, sigma, weight_bounds=(min_weight, max_weight))
            ef.max_sharpe()
            cleaned_weights = ef.clean_weights()
            perf = ef.portfolio_performance(verbose=True)

            return {"weights": cleaned_weights, "performance": perf}
        except OptimizationError as exc:
            logger.error("Optimization failed due to infeasible bounds or solver issues.", exc_info=True)
            raise ValueError("Constraints are too strict. No solution found.") from exc
        except Exception as exc:  # pylint: disable=broad-except
            logger.error("Portfolio optimization failed.", exc_info=True)
            raise ValueError("Failed to optimize portfolio.") from exc

    def calculate_allocations(
        self,
        total_portfolio_value: float,
        min_weight: float = 0.05,
        max_weight: float = 0.3,
        custom_weights: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        """
        Calculate discrete allocations (share counts) for the optimized portfolio.
        """
        if custom_weights is not None:
            weights_to_use = custom_weights
        else:
            optimization_result = self.optimize_max_sharpe(min_weight=min_weight, max_weight=max_weight)
            weights_to_use = optimization_result["weights"]

        latest_prices = get_latest_prices(self.prices)
        da = DiscreteAllocation(weights_to_use, latest_prices, total_portfolio_value=total_portfolio_value)
        allocation, leftover = da.greedy_portfolio()

        return {
            "allocation": allocation,
            "leftover": leftover,
        }

    def calculate_equity_curve(self, weights: Dict[str, float], initial_value: float) -> list:
        """
        Build daily equity curves for the optimized portfolio and the S&P 500 benchmark.
        Returns a list of dicts: {"date": "...", "portfolio": float, "benchmark": float}
        """
        import yfinance as yf
        import pandas as pd

        if self.prices.empty or initial_value <= 0:
            return []

        # Ensure weights sum to 1 to avoid drift.
        total_weight = sum(weights.values())
        if total_weight == 0:
            return []
        norm_weights = {k: v / total_weight for k, v in weights.items()}

        # Daily returns and portfolio cumulative curve.
        daily_returns = self.prices.pct_change().dropna(how="all")
        # Align weights to columns, missing ticker weight -> 0
        weight_series = pd.Series(norm_weights)
        aligned_weights = weight_series.reindex(daily_returns.columns).fillna(0.0)
        portfolio_daily = daily_returns.mul(aligned_weights, axis=1).sum(axis=1)
        portfolio_cum = (1 + portfolio_daily).cumprod()
        portfolio_equity = portfolio_cum * initial_value

        # Benchmark (^GSPC) over same date range.
        start_date = self.prices.index.min()
        end_date = self.prices.index.max()
        sp500_df = yf.download("^GSPC", start=start_date, end=end_date, auto_adjust=False, progress=False)
        benchmark_price = None
        if not sp500_df.empty:
            for col in ["Adj Close", "Close"]:
                if col in sp500_df:
                    series = sp500_df[col]
                    if isinstance(series, pd.DataFrame):
                        series = series.iloc[:, 0]
                    benchmark_price = pd.to_numeric(series, errors="coerce")
                    break

        if benchmark_price is None or benchmark_price.empty:
            benchmark_equity = pd.Series(index=portfolio_equity.index, data=initial_value)
        else:
            benchmark_returns = benchmark_price.pct_change().dropna()
            benchmark_cum = (1 + benchmark_returns).cumprod()
            benchmark_equity = (benchmark_cum * initial_value).reindex(portfolio_equity.index).ffill()

        # Merge and forward-fill missing values.
        combined = pd.DataFrame(
            {
                "portfolio": portfolio_equity,
                "benchmark": benchmark_equity.reindex(portfolio_equity.index),
            }
        ).ffill()

        # Ensure starting point at initial value.
        if not combined.empty:
            combined.iloc[0] = [initial_value, initial_value]

        curve = []
        for idx, row in combined.iterrows():
            curve.append(
                {
                    "date": idx.strftime("%Y-%m-%d"),
                    "portfolio": float(row["portfolio"]),
                    "benchmark": float(row["benchmark"]),
                }
            )

        return curve

    def optimize_black_litterman(
        self,
        market_caps: Dict[str, float],
        views: Optional[Dict[str, float]] = None,
        min_weight: float = 0.05,
        max_weight: float = 0.3,
    ) -> Dict[str, Any]:
        """
        Optimize portfolio using Black-Litterman adjusted returns with max Sharpe objective.
        """
        try:
            S = risk_models.sample_cov(self.prices)
            delta = black_litterman.market_implied_risk_aversion(self.prices)
            prior = black_litterman.market_implied_prior_returns(market_caps, delta, S)

            bl = black_litterman.BlackLittermanModel(S, pi=prior, absolute_views=views)
            ret_bl = bl.bl_returns()
            cov_bl = bl.bl_cov()

            ef = EfficientFrontier(ret_bl, cov_bl, weight_bounds=(min_weight, max_weight))
            ef.max_sharpe()
            cleaned_weights = ef.clean_weights()
            perf = ef.portfolio_performance(verbose=True)

            return {"weights": cleaned_weights, "performance": perf}
        except OptimizationError as exc:
            logger.error("Black-Litterman optimization failed due to constraints.", exc_info=True)
            raise ValueError("Constraints are too strict. No solution found.") from exc
        except Exception as exc:  # pylint: disable=broad-except
            logger.error("Black-Litterman optimization failed.", exc_info=True)
            raise ValueError("Failed to optimize portfolio with Black-Litterman.") from exc


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    tickers = ["AAPL", "MSFT", "GOOG", "AMZN"]
    start_date = "2020-01-01"
    end_date = "2020-12-31"

    try:
        price_data = fetch_historical_data(tickers, start_date, end_date)
        optimizer = PortfolioOptimizer(price_data)
        result = optimizer.optimize_max_sharpe()
        print(result)
    except ValueError as err:
        print(f"Error: {err}")
