import os
import uuid
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Body, UploadFile, File, Form
from pydantic import BaseModel, Field

from backend.app.services.insurance_service import insurance_service, VALID_DAMAGE_TYPES, VALID_SEASONS
from backend.app.core.config import get_uploads_dir

router = APIRouter(prefix="/insurance", tags=["Crop Loss & Government Insurance Guidance"])

class CropLossSubmissionRequest(BaseModel):
    farmer_name: str = Field(..., description="Farmer full name")
    phone: str = Field(..., description="10-digit mobile number")
    state: str = Field("Karnataka", description="State")
    district: str = Field(..., description="District (e.g. Hassan)")
    taluk: Optional[str] = Field(None, description="Taluk / Block")
    village: Optional[str] = Field(None, description="Village")
    location: Optional[str] = Field(None, description="Farm location description")
    crop_name: str = Field(..., description="Affected crop name (e.g. Tomato, Onion)")
    crop_variety: Optional[str] = Field(None, description="Crop variety")
    growing_season: str = Field("Kharif", description="Growing season: Kharif, Rabi, Summer")
    sowing_date: Optional[str] = Field(None, description="Sowing date (YYYY-MM-DD)")
    expected_harvest_date: Optional[str] = Field(None, description="Expected harvest date (YYYY-MM-DD)")
    land_area_affected: float = Field(..., gt=0, description="Affected area (acres/hectares)")
    area_unit: str = Field("Acres", description="Unit: Acres, Hectares, Guntas")
    damage_noticed_date: str = Field(..., description="Date damage was noticed (YYYY-MM-DD)")
    incident_date: str = Field(..., description="Approximate incident occurrence date (YYYY-MM-DD)")
    damage_type: str = Field(..., description="flood, drought, excess_rainfall, pest_attack, disease, storm, hailstorm, other")
    damage_description: str = Field(..., min_length=5, description="Clear description of damage")
    estimated_loss_percentage: Optional[float] = Field(None, ge=0, le=100, description="Estimated % crop loss")
    photo_urls: Optional[List[str]] = Field(default_factory=list, description="Uploaded crop photos")
    document_urls: Optional[List[str]] = Field(default_factory=list, description="Uploaded supporting documents")
    preferred_language: str = Field("en", description="Preferred language (en or kn)")
    user_id: Optional[str] = Field(None, description="Optional logged-in user identifier")

class EligibilityCheckRequest(BaseModel):
    district: str
    crop_name: str
    season: str = "Kharif"
    is_insured: bool = True
    incident_date: Optional[str] = None
    damage_type: str = "flood"

@router.post("/crop-loss")
def submit_crop_loss_report(req: CropLossSubmissionRequest):
    """
    Submits and permanently records a farmer's crop loss or disease report.
    Generates a unique verifiable reference ID (e.g. CLR-2026-XXXX).
    """
    try:
        report = insurance_service.submit_crop_loss_report(req.model_dump())
        return {
            "success": True,
            "message": "Crop loss report successfully submitted and recorded.",
            "report_id": report["report_id"],
            "data": report,
            "disclaimer": "Submission in FARMPRICE AI does not constitute an official insurance claim or guarantee compensation. Please follow the official PMFBY/State submission steps provided."
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit crop loss report: {str(e)}")

@router.get("/crop-loss/{report_id}")
def get_crop_loss_report(report_id: str):
    """Retrieves an existing crop loss report by reference ID."""
    report = insurance_service.get_crop_loss_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail=f"Crop loss report '{report_id}' not found.")
    return report

@router.get("/crop-loss")
def list_crop_loss_reports(
    phone: Optional[str] = Query(None, description="Filter by farmer phone"),
    user_id: Optional[str] = Query(None, description="Filter by user account")
):
    """Lists crop loss reports submitted by the farmer."""
    return insurance_service.list_crop_loss_reports(phone=phone, user_id=user_id)

@router.get("/schemes")
def get_government_schemes():
    """Returns verified Indian government crop insurance schemes (PMFBY, RWBCIS, Samrakshane, UPIS)."""
    return insurance_service.get_verified_schemes()

@router.post("/eligibility-check")
def evaluate_eligibility(req: EligibilityCheckRequest):
    """
    Provides preliminary eligibility guidance based on verified PMFBY guidelines.
    Evaluates 72-hour localized damage rule, covered natural perils, and next official actions.
    """
    return insurance_service.evaluate_preliminary_eligibility(req.model_dump())

@router.get("/checklist")
def get_document_checklist(
    scheme_id: Optional[str] = Query(None),
    damage_type: Optional[str] = Query(None)
):
    """Returns the verified required document checklist for insurance claim preparation."""
    return insurance_service.get_document_checklist(scheme_id=scheme_id, damage_type=damage_type)

@router.post("/upload")
async def upload_crop_loss_attachment(file: UploadFile = File(...)):
    """
    Safely stores photos or supporting documents for crop loss reporting.
    Validates file formats (JPEG, PNG, WebP, PDF) and 5MB size limit.
    """
    allowed_extensions = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Invalid file type. Permitted: JPG, PNG, WEBP, PDF.")

    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds maximum 5MB limit.")

    safe_name = f"crop_loss_{uuid.uuid4().hex[:12]}{ext}"
    dest_dir = os.path.join(get_uploads_dir(), "crop_loss")
    os.makedirs(dest_dir, exist_ok=True)
    file_path = os.path.join(dest_dir, safe_name)

    with open(file_path, "wb") as f:
        f.write(contents)

    return {
        "success": True,
        "filename": safe_name,
        "original_name": file.filename,
        "file_url": f"/uploads/crop_loss/{safe_name}",
        "size_bytes": len(contents)
    }
