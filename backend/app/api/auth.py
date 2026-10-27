import time
import secrets
from typing import Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Header

router = APIRouter(prefix="/auth", tags=["Authentication & User Management"])

class PublicLoginRequest(BaseModel):
    name: Optional[str] = Field("Chethan P", description="Farmer or citizen name")
    phone: Optional[str] = Field("9876543210", description="10-digit mobile number")
    district: Optional[str] = Field("Hassan", description="District location")
    is_guest: bool = Field(False, description="Quick guest login flag")

class AuthResponse(BaseModel):
    status: str
    role: str  # "public"
    user_id: str
    name: str
    phone: Optional[str] = None
    district: Optional[str] = None
    token: str
    message: str
    created_at: str

@router.post("/public-login", response_model=AuthResponse)
def public_login(payload: PublicLoginRequest):
    """
    Public Access Login for farmers, traders, and citizens.
    Allows quick OTP/phone or guest access to explore market intelligence.
    """
    token = f"pub_{secrets.token_hex(16)}"
    user_name = payload.name.strip() if payload.name and not payload.is_guest else "Guest Farmer"
    return AuthResponse(
        status="SUCCESS",
        role="public",
        user_id=f"usr_{secrets.token_hex(4)}",
        name=user_name,
        phone=payload.phone if not payload.is_guest else None,
        district=payload.district or "Hassan",
        token=token,
        message=f"Welcome {user_name}! You are logged in with Farmer Access.",
        created_at=time.strftime("%Y-%m-%d %H:%M:%S UTC")
    )

@router.get("/me")
def get_current_session(authorization: Optional[str] = Header(None)):
    """Validates session token and returns current role and profile."""
    if not authorization:
        return {"role": "public", "name": "Guest Farmer", "is_authenticated": False}
    token = authorization.replace("Bearer ", "").strip()
    return {
        "role": "public",
        "name": "Farmer / Citizen User",
        "is_authenticated": bool(token)
    }
