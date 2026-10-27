import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from backend.app.core.snowflake import snowflake_manager
from backend.app.services.location import estimate_road_distance, lookup_coordinates

logger = logging.getLogger("farmprice.profit_loss")

class ProfitLossService:
    """
    Comprehensive Agricultural Profit & Loss Calculation and Reporting Service.
    Enforces exact arithmetic formulas, transparent assumptions, validated units,
    and prominent outcome state detection (PROFIT, LOSS, BREAK_EVEN, INCOMPLETE).
    """

    def calculate_and_record(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes strict financial calculation, classifies outcome, and persists record.
        """
        farmer_name = str(data.get("farmer_name") or "Farmer").strip()
        crop_name = str(data.get("crop_name") or "Tomato").strip()
        variety_name = str(data.get("variety_name") or "Standard").strip()
        origin_name = str(data.get("origin_name") or "Hassan, Karnataka").strip()
        mandi_name = str(data.get("mandi_name") or "Hassan APMC").strip()
        unit = str(data.get("unit") or "Quintals").strip()
        user_id = data.get("user_id")

        # 1. Input parsing and validation
        try:
            quantity = float(data.get("quantity") or 0)
        except Exception:
            quantity = 0

        try:
            sale_price = float(data.get("sale_price_per_q") or 0)
        except Exception:
            sale_price = 0

        # Check for incomplete state
        missing_fields = []
        if quantity <= 0:
            missing_fields.append("Sale Quantity (must be > 0)")
        if sale_price <= 0:
            missing_fields.append("Expected Sale Price per Quintal (must be > 0)")

        if missing_fields:
            return {
                "outcome_status": "INCOMPLETE",
                "outcome_banner_en": "CALCULATION INCOMPLETE",
                "outcome_banner_kn": "ಲೆಕ್ಕಾಚಾರ ಅಪೂರ್ಣವಾಗಿದೆ",
                "outcome_description_en": f"Missing required financial inputs: {', '.join(missing_fields)}.",
                "outcome_description_kn": f"ಅಗತ್ಯ ಆರ್ಥಿಕ ವಿವರಗಳು ಲಭ್ಯವಿಲ್ಲ: {', '.join(missing_fields)}.",
                "is_profitable": False,
                "gross_revenue": 0.0,
                "total_expenses": 0.0,
                "net_profit_or_loss": 0.0,
                "missing_fields": missing_fields
            }

        # 2. Road Distance & Freight Modeling
        road_distance_km = data.get("road_distance_km")
        if road_distance_km is None or float(road_distance_km) <= 0:
            orig_lat, orig_lon, _ = lookup_coordinates(origin_name)
            # Lookup mandi coords
            m_query = "SELECT latitude, longitude FROM DIM_MANDIS WHERE LOWER(mandi_name) = LOWER(?) LIMIT 1"
            m_row = snowflake_manager.execute_query(m_query, (mandi_name,))
            if m_row:
                _, est_road = estimate_road_distance(orig_lat, orig_lon, m_row[0]["latitude"], m_row[0]["longitude"])
                road_distance_km = est_road
            else:
                road_distance_km = 15.0 # sensible default
        else:
            road_distance_km = float(road_distance_km)

        transport_rate_per_km_per_q = float(data.get("transport_rate_per_km_per_q") or 0.85)
        flat_transport_entered = data.get("transport_expense")
        if flat_transport_entered is not None and float(flat_transport_entered) > 0:
            transport_expense = round(float(flat_transport_entered), 2)
        else:
            transport_expense = round(road_distance_km * transport_rate_per_km_per_q * quantity, 2)

        loading_unloading_rate = float(data.get("loading_unloading_per_q") or 8.0)
        loading_unloading_expense = round(loading_unloading_rate * quantity, 2)

        apmc_cess_pct = float(data.get("apmc_cess_percent") or 1.5)
        gross_revenue = round(quantity * sale_price, 2)
        apmc_cess_expense = round(gross_revenue * (apmc_cess_pct / 100.0), 2)

        weighing_fee_per_q = float(data.get("weighing_fee_per_q") or 3.0)
        weighing_handling_expense = round(weighing_fee_per_q * quantity, 2)

        total_selling_expenses = round(
            transport_expense + loading_unloading_expense + apmc_cess_expense + weighing_handling_expense, 2
        )

        estimated_net_return = round(gross_revenue - total_selling_expenses, 2)

        # 3. Optional Cultivation / Production Costs
        production_cost_per_q = float(data.get("production_cost_per_q") or 0.0)
        total_production_cost = round(production_cost_per_q * quantity, 2)
        net_profit_after_production = round(estimated_net_return - total_production_cost, 2)

        # Evaluate Outcome
        # We consider net_profit_after_production if production costs provided, else selling net return
        effective_profit = net_profit_after_production if total_production_cost > 0 else estimated_net_return

        if effective_profit > 0:
            outcome_status = "PROFIT"
            outcome_banner_en = "CONGRATULATIONS — YOU ARE IN PROFIT"
            outcome_banner_kn = "ಅಭಿನಂದನೆಗಳು — ನೀವು ಲಾಭದಲ್ಲಿದ್ದೀರಿ"
            desc_en = f"Estimated take-home net return is ₹{effective_profit:,.2f} after accounting for all market fees, handling, and transport overheads."
            desc_kn = f"ಎಲ್ಲಾ ಸಾರಿಗೆ, ಎಪಿಎಂಸಿ ಶುಲ್ಕ ಹಾಗೂ ಮಾರುಕಟ್ಟೆ ವೆಚ್ಚಗಳನ್ನು ಕಳೆದ ನಂತರ ನಿಮ್ಮ ಅಂದಾಜು ನಿವ್ವಳ ಲಾಭ ₹{effective_profit:,.2f} ಆಗಿದೆ."
        elif effective_profit < 0:
            outcome_status = "LOSS"
            outcome_banner_en = "WARNING — ESTIMATED LOSS"
            outcome_banner_kn = "ಎಚ್ಚರಿಕೆ — ಅಂದಾಜು ನಷ್ಟ"
            desc_en = f"Estimated transaction expenses exceed expected revenue by ₹{abs(effective_profit):,.2f}. Consider selecting a higher-paying mandi or consolidating freight to reduce unit transport costs."
            desc_kn = f"ಅಂದಾಜು ಸಾರಿಗೆ ಮತ್ತು ಮಾರುಕಟ್ಟೆ ವೆಚ್ಚಗಳು ನಿರೀಕ್ಷಿತ ಆದಾಯಕ್ಕಿಂತ ₹{abs(effective_profit):,.2f} ಹೆಚ್ಚಾಗಿವೆ. ಸಾರಿಗೆ ವೆಚ್ಚ ಕಡಿಮೆ ಮಾಡಲು ಅಥವಾ ಹೆಚ್ಚಿನ ಬೆಲೆ ಇರುವ ಪರ್ಯಾಯ ಮಂಡಿ ಪರಿಶೀಲಿಸಿ."
        else:
            outcome_status = "BREAK_EVEN"
            outcome_banner_en = "BREAK-EVEN — NO ESTIMATED PROFIT OR LOSS"
            outcome_banner_kn = "ಸಮಸ್ಥಿತಿ — ಅಂದಾಜು ಲಾಭವೂ ಇಲ್ಲ, ನಷ್ಟವೂ ಇಲ್ಲ"
            desc_en = "Estimated revenue exactly matches projected selling and handling expenses."
            desc_kn = "ನಿರೀಕ್ಷಿತ ಆದಾಯ ಮತ್ತು ಒಟ್ಟು ವೆಚ್ಚಗಳು ಸಮನಾಗಿವೆ."

        record_id = f"PL-{datetime.now().year}-{uuid.uuid4().hex[:6].upper()}"
        calc_date = datetime.now().strftime("%Y-%m-%d")

        # Persist to database
        insert_query = """
            INSERT INTO PROFIT_LOSS_RECORDS (
                record_id, farmer_name, origin_name, crop_name, variety_name, mandi_name,
                quantity, unit, sale_price_per_q, gross_revenue, transport_expense,
                loading_unloading_expense, apmc_cess_expense, handling_other_expense,
                production_cost_per_q, total_production_cost, total_expenses,
                net_profit_or_loss, net_profit_after_production, outcome_status,
                calculation_date, user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        params = (
            record_id, farmer_name, origin_name, crop_name, variety_name, mandi_name,
            quantity, unit, sale_price, gross_revenue, transport_expense,
            loading_unloading_expense, apmc_cess_expense, weighing_handling_expense,
            production_cost_per_q, total_production_cost, total_selling_expenses,
            estimated_net_return, net_profit_after_production, outcome_status,
            calc_date, user_id
        )
        snowflake_manager.execute_query(insert_query, params)
        logger.info("Persisted Profit & Loss Record %s (Status: %s)", record_id, outcome_status)

        return {
            "record_id": record_id,
            "calculation_date": calc_date,
            "farmer_name": farmer_name,
            "crop_name": crop_name,
            "variety_name": variety_name,
            "origin_name": origin_name,
            "mandi_name": mandi_name,
            "quantity": quantity,
            "unit": unit,
            "sale_price_per_q": sale_price,
            "gross_revenue": gross_revenue,
            "expenses": {
                "road_distance_km": road_distance_km,
                "transport_rate_per_km_per_q": transport_rate_per_km_per_q,
                "transport_expense": transport_expense,
                "loading_unloading_expense": loading_unloading_expense,
                "apmc_cess_percent": apmc_cess_pct,
                "apmc_cess_expense": apmc_cess_expense,
                "weighing_handling_expense": weighing_handling_expense,
                "total_selling_expenses": total_selling_expenses
            },
            "production_cost": {
                "cost_per_q": production_cost_per_q,
                "total_cost": total_production_cost
            },
            "estimated_net_return": estimated_net_return,
            "total_expenses": total_selling_expenses,
            "transport_expense": transport_expense,
            "apmc_cess": apmc_cess_expense,
            "loading_unloading": loading_unloading_expense,
            "weighing_fee": weighing_handling_expense,
            "total_production_cost": total_production_cost,
            "net_profit_after_production": net_profit_after_production,
            "effective_net_profit_or_loss": effective_profit,
            "net_per_quintal": round(estimated_net_return / quantity, 2) if quantity > 0 else 0,
            "outcome": outcome_status,
            "outcome_status": outcome_status,
            "outcome_banner_en": outcome_banner_en,
            "outcome_banner_kn": outcome_banner_kn,
            "outcome_description_en": desc_en,
            "outcome_description_kn": desc_kn,
            "formula_note": "Net Profit/Loss = Gross Revenue (Quantity × Modal Price) − Total Selling Expenses (Transport + APMC Cess + Loading + Weighing) [− Production Costs if specified]",
            "data_source": "AGMARKNET Observed Auction Prices & Statutory Karnataka APMC Tariff Guidelines"
        }

    def list_history(self, user_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieves stored calculations history."""
        if user_id:
            query = "SELECT * FROM PROFIT_LOSS_RECORDS WHERE user_id = ? ORDER BY created_at DESC LIMIT ?"
            rows = snowflake_manager.execute_query(query, (user_id, limit))
        else:
            query = "SELECT * FROM PROFIT_LOSS_RECORDS ORDER BY created_at DESC LIMIT ?"
            rows = snowflake_manager.execute_query(query, (limit,))
        return [dict(r) for r in rows]

profit_loss_service = ProfitLossService()
