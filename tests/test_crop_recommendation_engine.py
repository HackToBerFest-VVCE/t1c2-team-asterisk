import pytest
from datetime import date
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.snowflake import snowflake_manager
from backend.app.services.crop_recommendation_engine import (
    crop_recommendation_engine,
    KARNATAKA_DISTRICT_COORDS,
    DISTRICT_AGRO_CLIMATIC_ZONE
)
from backend.app.services.agronomic_data import convert_kg_ha_to_quintals_acre

client = TestClient(app)

class TestAgriculturalWarehouseArchitecture:
    """Tests Phase 2: Schema architecture and table integrity in FARMPRICE_DB.AGRICULTURE."""

    def test_all_eight_agriculture_tables_exist(self):
        """Verifies that all 8 mandatory tables exist and can be queried."""
        required_tables = [
            "CROP_REQUIREMENTS",
            "WEATHER_HISTORY",
            "WEATHER_FORECAST",
            "MANDI_PRICES",
            "CROP_YIELD_HISTORY",
            "CULTIVATION_COSTS",
            "CROP_PROFIT_ANALYSIS",
            "DATA_SOURCE_LOG"
        ]
        for tbl in required_tables:
            rows = snowflake_manager.execute_query(f"SELECT COUNT(*) as cnt FROM {tbl}")
            assert rows is not None, f"Failed to query table {tbl}"
            assert "cnt" in rows[0]

    def test_crop_requirements_catalog_diversity(self):
        """Verifies that crop catalog covers vegetables, fruits, cereals, millets, and commercial crops."""
        crops = snowflake_manager.get_crop_requirements()
        assert len(crops) >= 20, "Expected at least 20 verified crops in catalog"
        categories = set(c["category"] for c in crops)
        assert "Vegetables" in categories
        assert "Fruits" in categories
        assert "Cereals" in categories

        # Check key Karnataka crops
        crop_names = [c["crop_name"] for c in crops]
        assert "Tomato" in crop_names
        assert "Potato" in crop_names
        assert "Onion" in crop_names
        assert "Banana" in crop_names
        assert "Pomegranate" in crop_names
        assert "Green Chilli" in crop_names
        assert "Ragi (Finger Millet)" in crop_names

    def test_mandi_prices_table_preserved(self):
        """Verifies that existing MANDI_PRICES table and records are preserved."""
        mandi_rows = snowflake_manager.execute_query("SELECT COUNT(*) as cnt FROM MANDI_PRICES WHERE state = 'Karnataka'")
        assert mandi_rows[0]["cnt"] >= 20, "Existing MANDI_PRICES records must be preserved"

    def test_data_source_provenance_logs(self):
        """Verifies official data source verification logs."""
        logs = snowflake_manager.get_data_source_audit_logs()
        assert len(logs) >= 5
        source_names = [log["source_name"] for log in logs]
        assert any("Open-Meteo" in s for s in source_names)
        assert any("AGMARKNET" in s for s in source_names)
        assert any("ICAR" in s for s in source_names)
        assert any("University" in s or "UAS" in s for s in source_names)
        assert any("DA&FW" in s for s in source_names)


class TestMathematicalProfitAndUnitConversions:
    """Tests Phase 5: Mathematical profit calculations and accurate unit conversions."""

    def test_hectare_to_acre_unit_conversion(self):
        """
        Validates exact formula:
        Yield (q/acre) = Yield (kg/ha) / (100 * 2.47105381)
        """
        # 26,000 kg/ha -> 105.22 quintals/acre
        conv1 = convert_kg_ha_to_quintals_acre(26000.0)
        assert conv1 == 105.22

        # 18,500 kg/ha -> 74.87 quintals/acre
        conv2 = convert_kg_ha_to_quintals_acre(18500.0)
        assert conv2 == 74.87

    def test_net_profit_and_breakeven_formulas(self):
        """Verifies gross revenue, cultivation costs, transport deductions, and break-even math."""
        crop_reqs = snowflake_manager.get_crop_requirements(crop_name="Tomato")
        assert len(crop_reqs) > 0
        tomato = crop_reqs[0]

        calc = crop_recommendation_engine.calculate_crop_profit_and_mandi(
            crop=tomato,
            district="Hassan",
            farmer_lat=13.0033,
            farmer_lon=76.1004,
            acres=1.0
        )

        fin = calc["financials"]
        costs = calc["costs"]
        yld = calc["yield"]
        mandi = calc["mandi"]

        # Math checks
        expected_gross = round(yld["marketable_yield_q_acre"] * mandi["modal_price"], 2)
        assert fin["gross_revenue_acre"] == expected_gross

        expected_total_cost = round(costs["cultivation_cost_acre"] + costs["transport_cost_acre"], 2)
        assert fin["total_cost_acre"] == expected_total_cost

        expected_net_profit = round(expected_gross - expected_total_cost, 2)
        assert fin["net_profit_acre"] == expected_net_profit

        # Break-even price = total_cost / marketable_yield
        expected_breakeven = round(expected_total_cost / yld["marketable_yield_q_acre"], 2)
        assert fin["break_even_price_per_q"] == expected_breakeven

    def test_three_tier_scenarios(self):
        """Verifies Conservative, Baseline, and Optimistic scenario modeling."""
        crop_reqs = snowflake_manager.get_crop_requirements(crop_name="Onion")
        onion = crop_reqs[0]

        calc = crop_recommendation_engine.calculate_crop_profit_and_mandi(
            crop=onion,
            district="Belagavi",
            farmer_lat=15.8497,
            farmer_lon=74.4977
        )

        sc = calc["scenarios"]
        assert "conservative" in sc
        assert "baseline" in sc
        assert "optimistic" in sc

        # Conservative yield must be lower than baseline
        assert sc["conservative"]["yield_q_acre"] < sc["baseline"]["yield_q_acre"]
        # Optimistic yield must be higher than baseline
        assert sc["optimistic"]["yield_q_acre"] > sc["baseline"]["yield_q_acre"]
        # Conservative profit must be less than optimistic profit
        assert sc["conservative"]["net_profit_acre"] < sc["optimistic"]["net_profit_acre"]


class TestWeatherCompatibilityAndHarvestForecasting:
    """Tests Phase 4 & 6: Meteorological matching and harvest price projections."""

    def test_temperature_compatibility_scoring(self):
        """Tests that optimal temperatures yield 100% score and extreme temps drop score."""
        crop_mock = {
            "crop_name": "Tomato",
            "min_temp_c": 15.0,
            "max_temp_c": 34.0,
            "opt_temp_min_c": 20.0,
            "opt_temp_max_c": 27.0,
            "weather_sensitivities": "High humidity causes blight"
        }

        # Perfect optimal weather
        weather_opt = {
            "current": {"temperature": 24.0},
            "forecast": [{"temp_max": 26.0, "temp_min": 22.0, "rain_sum_mm": 5.0}]
        }
        score_opt, risks_opt = crop_recommendation_engine.evaluate_weather_compatibility(crop_mock, weather_opt)
        assert score_opt == 100.0
        assert len(risks_opt) == 0

        # Excessive heat >35°C
        weather_hot = {
            "current": {"temperature": 37.0},
            "forecast": [{"temp_max": 38.0, "temp_min": 32.0, "rain_sum_mm": 0.0}]
        }
        score_hot, risks_hot = crop_recommendation_engine.evaluate_weather_compatibility(crop_mock, weather_hot)
        assert score_hot < 50.0
        assert len(risks_hot) > 0

    def test_harvest_date_and_model_evaluation(self):
        """Tests harvest window estimation and error evaluation metrics."""
        crop_reqs = snowflake_manager.get_crop_requirements(crop_name="Banana")
        banana = crop_reqs[0]

        calc = crop_recommendation_engine.calculate_crop_profit_and_mandi(
            crop=banana,
            district="Mysuru",
            farmer_lat=12.2958,
            farmer_lon=76.6394
        )

        h = calc["forecast_at_harvest"]
        assert "expected_harvest_date" in h
        assert h["duration_days"] >= 300
        assert "projected_price_range" in h
        assert "model_evaluation" in h
        assert h["model_evaluation"]["mape_pct"] < h["model_evaluation"]["baseline_mape_pct"]


class TestAPIEndpoints:
    """Tests Phase 8: Full API route testing."""

    def test_get_recommendations_endpoint(self):
        """Tests GET /api/recommendations with location and filters."""
        res = client.get("/api/recommendations?district=Hassan&acres=2.0")
        assert res.status_code == 200
        data = res.json()
        assert "recommendations" in data
        assert len(data["recommendations"]) > 0
        assert "kpis" in data
        assert "weather_summary" in data

        top_rec = data["recommendations"][0]
        assert top_rec["rank"] == 1
        assert "profit_data" in top_rec
        assert "suitability_score" in top_rec

    def test_get_recommendations_category_filter(self):
        """Tests category filter: Vegetables only."""
        res = client.get("/api/recommendations?district=Kolar&category=Vegetables")
        assert res.status_code == 200
        data = res.json()
        for r in data["recommendations"]:
            assert r["category"] == "Vegetables"

    def test_get_profit_estimates_endpoint(self):
        """Tests GET /api/profit-estimates."""
        res = client.get("/api/profit-estimates?crop_name=Tomato&district=Hassan&acres=1.5")
        assert res.status_code == 200
        data = res.json()
        assert data["crop"]["crop_name"] == "Tomato"
        assert "profit_data" in data
        assert data["profit_data"]["financials"]["break_even_price_per_q"] > 0

    def test_get_crop_suitability_endpoint(self):
        """Tests GET /api/crops/suitability."""
        res = client.get("/api/crops/suitability?crop_name=Tomato&district=Hassan")
        assert res.status_code == 200
        data = res.json()
        assert data["suitability_score"] > 0
        assert "agro_climatic_fit" in data

    def test_get_market_prices_alias(self):
        """Tests GET /api/market-prices alias endpoint."""
        res = client.get("/api/market-prices?state=Karnataka&page_size=5")
        assert res.status_code == 200
        data = res.json()
        assert "records" in data

    def test_get_weather_endpoint(self):
        """Tests GET /api/weather endpoint."""
        res = client.get("/api/weather?latitude=13.0033&longitude=76.1004")
        assert res.status_code == 200
        data = res.json()
        assert "temperature_celsius" in data or "current" in data
