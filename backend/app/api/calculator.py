from fastapi import APIRouter, HTTPException
from backend.app.schemas.calculator import NetReturnCalculationRequest, NetReturnCalculationResponse
from backend.app.services.calculator import calculate_net_return

router = APIRouter(prefix="/calculate-net-return", tags=["Net Return Calculator"])

@router.post("", response_model=NetReturnCalculationResponse)
def compute_net_return(req: NetReturnCalculationRequest):
    try:
        return calculate_net_return(req)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Calculation error: {str(e)}")
