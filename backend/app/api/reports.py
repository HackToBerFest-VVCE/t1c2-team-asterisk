from fastapi import APIRouter, Response, HTTPException
from backend.app.schemas.market import MarketComparisonRequest
from backend.app.services.recommendation import evaluate_market_comparison
from backend.app.services.reports import generate_csv_report, generate_pdf_report

router = APIRouter(prefix="/reports", tags=["Reports & Exports"])

@router.post("/export-csv")
def export_csv_report(req: MarketComparisonRequest):
    try:
        comparison = evaluate_market_comparison(req)
        csv_content = generate_csv_report(comparison.model_dump())
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=FarmPrice_Comparison_{req.crop_id}.csv"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CSV generation failed: {str(e)}")

@router.post("/export-pdf")
def export_pdf_report(req: MarketComparisonRequest):
    try:
        comparison = evaluate_market_comparison(req)
        pdf_bytes = generate_pdf_report(comparison.model_dump())
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=FarmPrice_Comparison_{req.crop_id}.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")
