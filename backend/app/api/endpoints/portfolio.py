import logging
from typing import Dict, Optional

from fastapi import APIRouter, HTTPException

from app.models.portfolio import PortfolioRequest, PortfolioResponse
from app.services.data_loader import fetch_historical_data, fetch_market_caps
from app.services.optimizer import PortfolioOptimizer
from pypfopt import EfficientFrontier, expected_returns, risk_models
import pandas as pd

router = APIRouter()
logger = logging.getLogger(__name__)


def calculate_current_metrics(current_holdings: Dict[str, int], prices: pd.DataFrame) -> Optional[Dict[str, float]]:
    """
    Calculate current portfolio performance metrics based on existing holdings.
    Returns None if there is no current portfolio value.
    """
    if not current_holdings:
        return None

    latest_prices = prices.iloc[-1]
    total_value = 0.0
    for ticker, shares in current_holdings.items():
        price = latest_prices.get(ticker)
        if price is not None:
            total_value += shares * price

    if total_value <= 0:
        return None

    weights = {}
    for ticker, shares in current_holdings.items():
        price = latest_prices.get(ticker)
        if price is not None:
            weights[ticker] = (shares * price) / total_value

    if not weights:
        return None

    mu = expected_returns.mean_historical_return(prices)
    sigma = risk_models.sample_cov(prices)

    ef = EfficientFrontier(mu, sigma)
    ef.set_weights(weights)
    ret, vol, sharpe = ef.portfolio_performance(verbose=False)
    return {
        "expected_return": float(ret),
        "volatility": float(vol),
        "sharpe_ratio": float(sharpe),
    }


@router.post("/optimize", response_model=PortfolioResponse)
def optimize_portfolio(request: PortfolioRequest) -> PortfolioResponse:
    try:
        prices = fetch_historical_data(
            tickers=request.tickers,
            start_date=request.start_date,
            end_date=request.end_date,
        )

        market_caps = fetch_market_caps(request.tickers)

        optimizer = PortfolioOptimizer(prices)
        has_views = bool(request.views)

        if has_views:
            result = optimizer.optimize_black_litterman(
                market_caps=market_caps,
                views=request.views,
                min_weight=request.min_weight,
                max_weight=request.max_weight,
            )
        else:
            result = optimizer.optimize_max_sharpe(
                min_weight=request.min_weight,
                max_weight=request.max_weight,
            )

        allocation_result = optimizer.calculate_allocations(
            request.total_investment,
            min_weight=request.min_weight,
            max_weight=request.max_weight,
            custom_weights=result["weights"],
        )

        cleaned_weights = {ticker: float(weight) for ticker, weight in result["weights"].items()}
        perf = result["performance"]
        metrics = {
            "expected_return": float(perf[0]),
            "volatility": float(perf[1]),
            "sharpe_ratio": float(perf[2]),
        }

        allocation = allocation_result["allocation"]

        current_metrics = calculate_current_metrics(request.current_holdings, prices)

        # Compute trades vs current holdings.
        trades: Dict[str, Dict[str, object]] = {}
        for ticker, target_qty in allocation.items():
            current_qty = request.current_holdings.get(ticker, 0)
            quantity_diff = target_qty - current_qty
            if quantity_diff > 0:
                trades[ticker] = {"action": "BUY", "amount": quantity_diff}
            elif quantity_diff < 0:
                trades[ticker] = {"action": "SELL", "amount": abs(quantity_diff)}
            else:
                trades[ticker] = {"action": "HOLD", "amount": 0}

        return PortfolioResponse(
            weights=cleaned_weights,
            metrics=metrics,
            allocation=allocation,
            leftover_cash=float(allocation_result["leftover"]),
            trades=trades,
            comparison={"current": current_metrics, "optimized": metrics} if current_metrics else None,
        )
    except HTTPException as exc:
        # Pass through optimizer or downstream HTTPExceptions directly.
        raise exc
    except ValueError as err:
        logger.error("Validation error in portfolio optimization.", exc_info=True)
        raise HTTPException(status_code=400, detail=str(err)) from err
    except Exception as exc:  # pylint: disable=broad-except
        logger.error("Unexpected error in portfolio optimization.", exc_info=True)
        raise HTTPException(status_code=500, detail="Portfolio optimization failed.") from exc
