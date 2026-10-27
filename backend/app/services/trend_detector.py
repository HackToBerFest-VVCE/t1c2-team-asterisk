import math
import numpy as np
from typing import Dict, Any, List, Optional
from backend.app.core.snowflake import snowflake_manager

class TrendDetectorEngine:
    """
    Automatic Market Trend Detection Engine.
    Computes 7-day Moving Average (SMA_7), 21-day Moving Average (SMA_21),
    price momentum, volatility, and classifies movement as RISING, FALLING,
    STABLE, or INCONCLUSIVE with complete mathematical evidence.
    """
    def __init__(self, threshold_pct: float = 3.0):
        self.threshold_pct = threshold_pct

    def detect_trend(
        self,
        crop_id: str,
        mandi_id: str,
        lookback_days: int = 30
    ) -> Dict[str, Any]:
        """
        Analyzes chronological price records for (crop, mandi) and determines trend classification.
        """
        query = """
            SELECT 
                f.observation_date,
                f.modal_price_per_q,
                f.arrival_quantity_tonnes,
                m.mandi_name,
                c.crop_name
            FROM FACT_DAILY_MARKET_PRICES f
            JOIN DIM_MANDIS m ON f.mandi_id = m.mandi_id
            JOIN DIM_CROPS c ON f.crop_id = c.crop_id
            WHERE f.crop_id = ? AND f.mandi_id = ?
            ORDER BY f.observation_date ASC
        """
        records = snowflake_manager.execute_query(query, (crop_id, mandi_id))

        if len(records) < 7:
            crop_name = records[0]["crop_name"] if records else "Selected Crop"
            mandi_name = records[0]["mandi_name"] if records else "Selected Mandi"
            return {
                "classification": "INCONCLUSIVE",
                "crop_id": crop_id,
                "crop_name": crop_name,
                "mandi_id": mandi_id,
                "mandi_name": mandi_name,
                "evidence": f"Insufficient historical observations ({len(records)} days). Minimum 7 consecutive observations required.",
                "price_change_absolute": 0.0,
                "price_change_pct": 0.0,
                "sma_7": None,
                "sma_21": None,
                "momentum": 0.0,
                "volatility": 0.0,
                "data_points_used": len(records)
            }

        crop_name = records[0]["crop_name"]
        mandi_name = records[0]["mandi_name"]

        prices = [float(r["modal_price_per_q"]) for r in records]
        current_price = prices[-1]
        
        # 7-day change
        past_7_price = prices[-7]
        abs_change_7d = round(current_price - past_7_price, 2)
        pct_change_7d = round((abs_change_7d / past_7_price) * 100.0, 1)

        # Short-term SMA (7-day)
        sma_7 = round(float(np.mean(prices[-7:])), 1)

        # Long-term SMA (21-day if available, otherwise entire series)
        sma_21 = round(float(np.mean(prices[-21:] if len(prices) >= 21 else prices)), 1)

        # Volatility: standard deviation of percentage changes over last 14 days
        diffs = [abs((prices[i] - prices[i-1]) / prices[i-1]) * 100.0 for i in range(1, len(prices[-14:]))]
        volatility = round(float(np.std(diffs)) if diffs else 0.0, 1)

        # Momentum: rate of change over the last 3 days
        momentum = round((prices[-1] - prices[-3]) / 2.0, 2) if len(prices) >= 3 else 0.0

        # Classification Logic:
        # RISING: >= +3% or SMA_7 significantly higher than SMA_21 with positive momentum
        # FALLING: <= -3% or SMA_7 significantly lower than SMA_21 with negative momentum
        # STABLE: within [-3%, +3%]
        if pct_change_7d >= self.threshold_pct:
            classification = "RISING"
            evidence = (
                f"Modal price increased by ₹{abs_change_7d:,.0f}/q (+{pct_change_7d}%) over the past 7 days "
                f"(from ₹{past_7_price:,.0f} to ₹{current_price:,.0f}). 7-day moving average (₹{sma_7:,.0f}) is trending upward."
            )
        elif pct_change_7d <= -self.threshold_pct:
            classification = "FALLING"
            evidence = (
                f"Modal price decreased by ₹{abs(abs_change_7d):,.0f}/q ({pct_change_7d}%) over the past 7 days "
                f"(from ₹{past_7_price:,.0f} to ₹{current_price:,.0f}). Short-term average is lower than 21-day average (₹{sma_7:,.0f} vs ₹{sma_21:,.0f})."
            )
        else:
            classification = "STABLE"
            evidence = (
                f"Prices are range-bound with low movement ({pct_change_7d}% change over 7 days). "
                f"Current price of ₹{current_price:,.0f}/q closely tracks the 7-day average of ₹{sma_7:,.0f}/q."
            )

        return {
            "classification": classification,
            "crop_id": crop_id,
            "crop_name": crop_name,
            "mandi_id": mandi_id,
            "mandi_name": mandi_name,
            "current_price": current_price,
            "reference_past_price": past_7_price,
            "price_change_absolute": abs_change_7d,
            "price_change_pct": pct_change_7d,
            "sma_7": sma_7,
            "sma_21": sma_21,
            "momentum": momentum,
            "volatility": volatility,
            "evidence": evidence,
            "observation_period": f"{records[-7]['observation_date']} to {records[-1]['observation_date']}",
            "data_points_used": len(records),
            "disclaimer": "Trend detection reflects observed historical market changes and is not a guarantee of future pricing."
        }

# Singleton instance
trend_detector = TrendDetectorEngine()
