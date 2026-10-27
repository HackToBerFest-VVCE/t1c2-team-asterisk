import os
import uuid
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Body, UploadFile, File
from pydantic import BaseModel, Field

from backend.app.services.complaint_service import complaint_service, COMPLAINT_CATEGORIES, VALID_STATUSES
from backend.app.core.config import get_uploads_dir

router = APIRouter(prefix="/complaints", tags=["Complaint Registration & Lifecycle Tracking"])

class ComplaintRegistrationRequest(BaseModel):
    category: str = Field(..., description="Complaint category")
    subject: str = Field(..., min_length=3, description="Brief subject of the complaint")
    description: str = Field(..., min_length=10, description="Detailed description")
    farmer_name: str = Field(..., min_length=2, description="Farmer full name")
    phone: str = Field(..., min_length=10, description="10-digit mobile number")
    email: Optional[str] = Field(None, description="Optional email address")
    district: Optional[str] = Field("Hassan", description="District")
    mandi_id: Optional[str] = Field(None, description="Related APMC Mandi ID")
    mandi_name: Optional[str] = Field(None, description="Related Mandi Name")
    crop_name: Optional[str] = Field(None, description="Related Crop Name")
    incident_date: Optional[str] = Field(None, description="Incident date (YYYY-MM-DD)")
    preferred_language: str = Field("en", description="Preferred language (en or kn)")
    attachments: Optional[List[str]] = Field(default_factory=list, description="Evidence attachment URLs")
    user_id: Optional[str] = Field(None, description="Optional user account ID")

class UpdateComplaintStatusRequest(BaseModel):
    status: str = Field(..., description="New status: Submitted, Under Review, Resolved, Rejected")
    actor_name: str = Field(..., min_length=2, description="Staff or administrator name updating the status")
    actor_role: str = Field("admin", description="Role: admin or staff")
    notes: Optional[str] = Field(None, description="Action or resolution notes explaining the decision")

@router.post("")
def register_complaint(req: ComplaintRegistrationRequest):
    """
    Submits and permanently records a farmer's complaint in the operational database.
    Generates an automated, unique reference number (e.g. CMP-2026-XXXX).
    """
    try:
        complaint = complaint_service.register_complaint(req.model_dump())
        return {
            "success": True,
            "message": "Complaint successfully registered.",
            "complaint_id": complaint["complaint_id"],
            "data": complaint
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to register complaint: {str(e)}")

@router.get("/track/{complaint_id}")
def track_complaint(
    complaint_id: str,
    phone: Optional[str] = Query(None, description="Farmer 10-digit phone number for verification"),
    user_id: Optional[str] = Query(None, description="Authenticated user account ID"),
    is_admin: bool = Query(False, description="Admin bypass flag")
):
    """
    Retrieves complaint details and complete lifecycle status history.
    Enforces privacy verification: requires the matching registered phone number or account ID.
    """
    try:
        return complaint_service.track_complaint(
            complaint_id=complaint_id,
            phone=phone,
            user_id=user_id,
            is_admin=is_admin
        )
    except KeyError:
        raise HTTPException(status_code=404, detail="Complaint reference ID not found. Please verify the reference number.")
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/my-complaints")
def list_my_complaints(
    phone: Optional[str] = Query(None, description="Farmer mobile number"),
    user_id: Optional[str] = Query(None, description="Farmer user account ID")
):
    """Lists complaints submitted by the requesting farmer."""
    if not (phone or user_id):
        raise HTTPException(status_code=400, detail="Please provide either farmer phone or user account ID.")
    return complaint_service.list_user_complaints(phone=phone, user_id=user_id)

@router.get("/admin/all")
def list_all_complaints_for_admin(
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None)
):
    """Staff/Administrative endpoint: Browse and filter all submitted complaints."""
    return complaint_service.list_all_complaints(status=status, category=category, search=search)

@router.put("/{complaint_id}/status")
def update_complaint_status(complaint_id: str, req: UpdateComplaintStatusRequest):
    """
    Authorized Staff/Admin Action: Transitions complaint lifecycle status
    (Submitted -> Under Review -> Resolved / Rejected) and appends an immutable audit log entry.
    """
    try:
        updated = complaint_service.update_complaint_status(
            complaint_id=complaint_id,
            new_status=req.status,
            actor_name=req.actor_name,
            actor_role=req.actor_role,
            notes=req.notes
        )
        return {
            "success": True,
            "message": f"Complaint {complaint_id} status updated to {req.status}.",
            "data": updated
        }
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Complaint {complaint_id} not found.")
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update status: {str(e)}")

@router.get("/categories")
def get_complaint_categories():
    """Returns official complaint categories and descriptions."""
    return COMPLAINT_CATEGORIES

@router.post("/upload")
async def upload_complaint_attachment(file: UploadFile = File(...)):
    """
    Safely stores supporting evidence for complaints.
    Validates file formats and 5MB size limit.
    """
    allowed_extensions = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Invalid file type. Permitted: JPG, PNG, WEBP, PDF.")

    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds maximum 5MB limit.")

    safe_name = f"complaint_{uuid.uuid4().hex[:12]}{ext}"
    dest_dir = os.path.join(get_uploads_dir(), "complaints")
    os.makedirs(dest_dir, exist_ok=True)
    file_path = os.path.join(dest_dir, safe_name)

    with open(file_path, "wb") as f:
        f.write(contents)

    return {
        "success": True,
        "filename": safe_name,
        "original_name": file.filename,
        "file_url": f"/uploads/complaints/{safe_name}",
        "size_bytes": len(contents)
    }
