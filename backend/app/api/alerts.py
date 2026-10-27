from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/alerts", tags=["Price Alerts & Preferences"])

class PriceAlertItem(BaseModel):
    id: str
    crop_name: str
    target_price: float
    mandi_name: str
    is_active: bool

# In-memory saved alerts for demo
SAVED_ALERTS: List[PriceAlertItem] = [
    PriceAlertItem(id="ALT_1", crop_name="Tomato (Hybrid)", target_price=2200.0, mandi_name="Hassan APMC", is_active=True),
    PriceAlertItem(id="ALT_2", crop_name="Onion (Medium)", target_price=2500.0, mandi_name="Mysore Mandi", is_active=False)
]

@router.get("", response_model=List[PriceAlertItem])
def get_alerts():
    return SAVED_ALERTS

@router.post("/toggle/{alert_id}")
def toggle_alert(alert_id: str):
    for a in SAVED_ALERTS:
        if a.id == alert_id:
            a.is_active = not a.is_active
            return {"success": True, "alert_id": alert_id, "is_active": a.is_active}
    return {"success": False, "message": "Alert not found"}
