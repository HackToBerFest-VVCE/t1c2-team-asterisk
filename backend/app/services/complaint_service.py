import os
import uuid
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from backend.app.core.snowflake import snowflake_manager

logger = logging.getLogger("farmprice.complaints")

from backend.app.core.config import get_uploads_dir

# Upload directory for complaint evidence attachments (serverless-aware)
UPLOAD_DIR = os.path.join(get_uploads_dir(), "complaints")
try:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
except Exception:
    pass

COMPLAINT_CATEGORIES = {
    "incorrect_mandi_prices": {"en": "Incorrect Mandi Price / Rate Discrepancy", "kn": "ತಪ್ಪಾದ ಮಂಡಿ ಬೆಲೆ / ದರ ವ್ಯತ್ಯಾಸ"},
    "missing_arrivals": {"en": "Missing or Outdated Arrival Volume Data", "kn": "ಬೆಳೆ ಆವಕ ಮಾಹಿತಿ ಕೊರತೆ"},
    "market_issues": {"en": "APMC Yard / Market Facility Concern", "kn": "ಎಪಿಎಂಸಿ ಮಾರುಕಟ್ಟೆ ಸಮಸ್ಯೆ"},
    "calculation_discrepancy": {"en": "Net Return or Freight Calculation Discrepancy", "kn": "ಲಾಭ ಅಥವಾ ಸಾರಿಗೆ ವೆಚ್ಚ ಲೆಕ್ಕಾಚಾರದಲ್ಲಿ ವ್ಯತ್ಯಾಸ"},
    "insurance_guidance": {"en": "Crop Insurance / Scheme Guidance Query", "kn": "ಬೆಳೆ ವಿಮೆ / ಯೋಜನೆ ಮಾಹಿತಿ ಪ್ರಶ್ನೆ"},
    "technical_issue": {"en": "FARMPRICE AI Application Technical Issue", "kn": "ತಾಂತ್ರಿಕ ದೋಷ"},
    "other": {"en": "Other Agricultural Market Concern", "kn": "ಇತರ ಕೃಷಿ ಮಾರುಕಟ್ಟೆ ಕಾಳಜಿ"}
}

VALID_STATUSES = ["Submitted", "Under Review", "Resolved", "Rejected"]

class ComplaintService:
    """
    Complaint Management & Dispute Tracking Service.
    Handles complaint registration, lifecycle state machine (Submitted -> Under Review -> Resolved),
    audit trail history, and privacy-protected tracking.
    """

    def generate_complaint_id(self) -> str:
        """Generates unique, human-readable complaint reference ID (e.g. CMP-2026-8942)."""
        year = datetime.now().year
        suffix = uuid.uuid4().hex[:6].upper()
        return f"CMP-{year}-{suffix}"

    def register_complaint(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Registers and persists a new complaint.
        Initiates the lifecycle with status 'Submitted' and logs initial audit history.
        """
        category = str(data.get("category") or "other").strip()
        subject = str(data.get("subject") or "").strip()
        description = str(data.get("description") or "").strip()
        farmer_name = str(data.get("farmer_name") or "").strip()
        phone = str(data.get("phone") or "").strip()

        # Validation
        if not farmer_name or len(farmer_name) < 2:
            raise ValueError("Farmer / Complainant name is mandatory.")
        if not phone or len(phone) < 10:
            raise ValueError("A valid 10-digit mobile contact number is mandatory.")
        if not subject or len(subject) < 3:
            raise ValueError("Subject is mandatory (minimum 3 characters).")
        if not description or len(description) < 10:
            raise ValueError("Detailed description of the concern is mandatory (minimum 10 characters).")

        complaint_id = self.generate_complaint_id()
        attachments = json.dumps(data.get("attachments") or [])
        preferred_lang = str(data.get("preferred_language") or "en").strip()
        user_id = data.get("user_id")

        query = """
            INSERT INTO COMPLAINTS (
                complaint_id, category, subject, description, farmer_name, phone, email,
                district, mandi_id, mandi_name, crop_name, incident_date, status,
                preferred_language, attachments, user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        params = (
            complaint_id, category, subject, description, farmer_name, phone,
            data.get("email") or "", data.get("district") or "Hassan",
            data.get("mandi_id") or "", data.get("mandi_name") or "",
            data.get("crop_name") or "", data.get("incident_date") or datetime.now().strftime("%Y-%m-%d"),
            "Submitted", preferred_lang, attachments, user_id
        )

        snowflake_manager.execute_query(query, params)

        # Log initial lifecycle audit entry
        self._record_history(
            complaint_id=complaint_id,
            previous_status=None,
            new_status="Submitted",
            actor_name=farmer_name,
            actor_role="farmer",
            notes="Complaint submitted by farmer through FARMPRICE AI portal."
        )

        logger.info("Successfully registered Complaint %s by %s", complaint_id, farmer_name)
        return self.get_complaint(complaint_id)

    def get_complaint(self, complaint_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves raw complaint data."""
        query = "SELECT * FROM COMPLAINTS WHERE complaint_id = ?"
        rows = snowflake_manager.execute_query(query, (complaint_id,))
        if not rows:
            return None
        r = dict(rows[0])
        try:
            r["attachments"] = json.loads(r.get("attachments") or "[]")
        except Exception:
            r["attachments"] = []
        return r

    def track_complaint(
        self,
        complaint_id: str,
        phone: Optional[str] = None,
        user_id: Optional[str] = None,
        is_admin: bool = False
    ) -> Dict[str, Any]:
        """
        Public/authenticated tracking endpoint.
        Requires phone verification or authenticated user ownership to protect personal farmer data.
        Returns full complaint record along with immutable lifecycle status history.
        """
        complaint = self.get_complaint(complaint_id)
        if not complaint:
            raise KeyError("Complaint reference ID not found. Please verify the reference number.")

        # Ownership / verification check
        if not is_admin:
            matches_user = bool(user_id and complaint.get("user_id") == user_id)
            matches_phone = False
            if phone:
                clean_in_phone = "".join(filter(str.isdigit, phone))[-10:]
                clean_rec_phone = "".join(filter(str.isdigit, str(complaint.get("phone") or "")))[-10:]
                matches_phone = bool(clean_in_phone and clean_in_phone == clean_rec_phone)

            if not (matches_user or matches_phone):
                raise PermissionError(
                    "Verification required. Please provide the registered 10-digit mobile number associated with this complaint."
                )

        # Fetch lifecycle audit history
        h_query = "SELECT * FROM COMPLAINT_HISTORY WHERE complaint_id = ? ORDER BY timestamp ASC"
        h_rows = snowflake_manager.execute_query(h_query, (complaint_id,))
        history = [dict(h) for h in h_rows]

        complaint["history"] = history
        complaint["category_label"] = COMPLAINT_CATEGORIES.get(complaint["category"], {}).get("en", complaint["category"])
        complaint["category_label_kn"] = COMPLAINT_CATEGORIES.get(complaint["category"], {}).get("kn", complaint["category"])
        return complaint

    def list_user_complaints(self, phone: Optional[str] = None, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Lists complaints filed by a particular farmer."""
        if user_id:
            query = "SELECT * FROM COMPLAINTS WHERE user_id = ? ORDER BY created_at DESC"
            rows = snowflake_manager.execute_query(query, (user_id,))
        elif phone:
            clean_phone = "".join(filter(str.isdigit, phone))[-10:]
            query = "SELECT * FROM COMPLAINTS WHERE phone LIKE ? ORDER BY created_at DESC"
            rows = snowflake_manager.execute_query(query, (f"%{clean_phone}%",))
        else:
            return []

        result = []
        for r in rows:
            item = dict(r)
            try:
                item["attachments"] = json.loads(item.get("attachments") or "[]")
            except Exception:
                item["attachments"] = []
            item["category_label"] = COMPLAINT_CATEGORIES.get(item["category"], {}).get("en", item["category"])
            item["category_label_kn"] = COMPLAINT_CATEGORIES.get(item["category"], {}).get("kn", item["category"])
            result.append(item)
        return result

    def list_all_complaints(
        self,
        status: Optional[str] = None,
        category: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Administrative endpoint: Lists complaints with filtering for staff review."""
        query = "SELECT * FROM COMPLAINTS WHERE 1=1"
        params = []
        if status and status != "ALL":
            query += " AND status = ?"
            params.append(status)
        if category and category != "ALL":
            query += " AND category = ?"
            params.append(category)
        if search:
            query += " AND (complaint_id LIKE ? OR farmer_name LIKE ? OR subject LIKE ? OR district LIKE ?)"
            term = f"%{search.strip()}%"
            params.extend([term, term, term, term])

        query += " ORDER BY created_at DESC LIMIT 100"
        rows = snowflake_manager.execute_query(query, tuple(params) if params else None)

        result = []
        for r in rows:
            item = dict(r)
            try:
                item["attachments"] = json.loads(item.get("attachments") or "[]")
            except Exception:
                item["attachments"] = []
            item["category_label"] = COMPLAINT_CATEGORIES.get(item["category"], {}).get("en", item["category"])
            item["category_label_kn"] = COMPLAINT_CATEGORIES.get(item["category"], {}).get("kn", item["category"])
            result.append(item)
        return result

    def update_complaint_status(
        self,
        complaint_id: str,
        new_status: str,
        actor_name: str,
        actor_role: str = "admin",
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Updates complaint lifecycle status with authorization and immutable audit logging.
        Never resolves complaints automatically.
        """
        if new_status not in VALID_STATUSES:
            raise ValueError(f"Invalid status '{new_status}'. Permitted: {', '.join(VALID_STATUSES)}")

        complaint = self.get_complaint(complaint_id)
        if not complaint:
            raise KeyError(f"Complaint {complaint_id} not found.")

        old_status = complaint["status"]
        if old_status == new_status:
            return complaint

        now_iso = datetime.now(timezone.utc).isoformat()
        resolved_at = now_iso if new_status == "Resolved" else None
        resolved_by = actor_name if new_status == "Resolved" else None

        query = """
            UPDATE COMPLAINTS 
            SET status = ?, resolution_notes = ?, resolved_by = ?, resolved_at = ?, updated_at = CURRENT_TIMESTAMP
            WHERE complaint_id = ?
        """
        params = (new_status, notes or complaint.get("resolution_notes"), resolved_by, resolved_at, complaint_id)
        snowflake_manager.execute_query(query, params)

        # Record audit trail
        self._record_history(
            complaint_id=complaint_id,
            previous_status=old_status,
            new_status=new_status,
            actor_name=actor_name,
            actor_role=actor_role,
            notes=notes or f"Status transitioned from {old_status} to {new_status}."
        )

        logger.info(
            "Complaint %s status updated: %s -> %s by %s (%s)",
            complaint_id, old_status, new_status, actor_name, actor_role
        )
        return self.get_complaint(complaint_id)

    def _record_history(
        self,
        complaint_id: str,
        previous_status: Optional[str],
        new_status: str,
        actor_name: str,
        actor_role: str,
        notes: Optional[str]
    ):
        """Appends an immutable audit log entry."""
        h_id = f"HIST_{uuid.uuid4().hex[:10]}"
        query = """
            INSERT INTO COMPLAINT_HISTORY (history_id, complaint_id, previous_status, new_status, actor_name, actor_role, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """
        snowflake_manager.execute_query(
            query,
            (h_id, complaint_id, previous_status, new_status, actor_name, actor_role, notes or "")
        )

complaint_service = ComplaintService()
