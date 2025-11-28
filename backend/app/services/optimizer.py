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
