import logging
from typing import List
import pandas as pd
import yfinance as yf

logger = logging.getLogger(__name__)


def fetch_historical_data(tickers: List[str], start_date: str, end_date: str) -> pd.DataFrame:
    """
    Fetch adjusted close prices for the given tickers and date range.

    Raises:
        ValueError: When no data is returned or an error occurs.
    """
    try:
        # Keep adjusted close alongside other fields; disable auto_adjust to ensure column exists.
        raw_data = yf.download(
            tickers,
            start=start_date,
            end=end_date,
            auto_adjust=False,
            progress=False,
        )

        if "Adj Close" not in raw_data:
            raise ValueError("Adjusted close data not found in the response.")

        data = raw_data["Adj Close"]
        if not isinstance(data, pd.DataFrame):
            data = data.to_frame()

        data = data.dropna(axis=1, how="all")

        if data.empty:
            raise ValueError("No historical data found for the given tickers and date range.")

        return data
    except ValueError:
        # Pass through expected validation errors with trace for debugging.
        logger.error("Validation error while fetching historical data.", exc_info=True)
        raise
    except Exception as exc:  # pylint: disable=broad-except
        logger.error("Unexpected error while fetching historical data.", exc_info=True)
        raise ValueError("Failed to fetch historical data.") from exc


def fetch_market_caps(tickers: List[str]) -> dict:
    """
    Fetch market capitalization for each ticker.
    Uses yfinance Tickers batch call when possible, falls back to per-ticker lookup.
    """
    market_caps: dict = {}
    try:
        try:
            tickers_str = " ".join(tickers)
            yf_batch = yf.Tickers(tickers_str)
            for ticker in tickers:
                info = yf_batch.tickers[ticker].info
                market_cap = info.get("marketCap")
                if market_cap is None:
                    logger.warning("Market cap missing for %s in batch fetch; falling back to default.", ticker)
                    market_cap = 1e9  # default fallback: $1B
                market_caps[ticker] = float(market_cap)
        except Exception as exc_batch:  # pylint: disable=broad-except
            logger.warning("Batch market cap fetch failed, falling back to per-ticker fetch.", exc_info=True)
            for ticker in tickers:
                try:
                    info = yf.Ticker(ticker).info
                    market_cap = info.get("marketCap")
                    if market_cap is None:
                        logger.warning("Market cap missing for %s; using fallback default.", ticker)
                        market_cap = 1e9  # default fallback: $1B
                    market_caps[ticker] = float(market_cap)
                except Exception as exc_single:  # pylint: disable=broad-except
                    logger.error("Failed to fetch market cap for %s", ticker, exc_info=True)
                    market_caps[ticker] = 1e9
    except Exception as exc:  # pylint: disable=broad-except
        logger.error("Unexpected error while fetching market caps.", exc_info=True)
        raise ValueError("Failed to fetch market capitalizations.") from exc

    return market_caps


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    sample_tickers = ["AAPL", "MSFT"]
    sample_start = "2020-01-01"
    sample_end = "2020-12-31"
    try:
        df = fetch_historical_data(sample_tickers, sample_start, sample_end)
        print(df.head())
    except ValueError as err:
        print(f"Error: {err}")
