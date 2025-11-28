from datetime import date
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class PortfolioRequest(BaseModel):
    tickers: List[str]
    start_date: str = "2020-01-01"
    end_date: str = Field(default_factory=lambda: date.today().isoformat())
    min_weight: float = 0.0
    max_weight: float = 1.0
    total_investment: float
    views: Optional[Dict[str, float]] = None
    current_holdings: Dict[str, int] = Field(default_factory=dict)


class PortfolioResponse(BaseModel):
    weights: Dict[str, float]
    metrics: Dict[str, float]
    allocation: Dict[str, int]
    leftover_cash: float
    trades: Dict[str, Dict[str, object]]
    comparison: Optional[Dict[str, Dict[str, float]]] = None
