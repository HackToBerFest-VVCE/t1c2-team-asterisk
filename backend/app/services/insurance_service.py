import os
import uuid
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from backend.app.core.snowflake import snowflake_manager

logger = logging.getLogger("farmprice.insurance")

from backend.app.core.config import get_uploads_dir

# Upload directory for crop loss documents
UPLOAD_DIR = os.path.join(get_uploads_dir(), "crop_loss")
try:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
except Exception:
    pass

VALID_DAMAGE_TYPES = {
    "flood": {"en": "Flood / Inundation", "kn": "ಪ್ರವಾಹ / ಜಲಾವೃತ"},
    "drought": {"en": "Drought / Dry Spell", "kn": "ಬರಗಾಲ / ಮಳೆ ಅಭಾವ"},
    "excess_rainfall": {"en": "Excess Rainfall / Cloudburst", "kn": "ಅತಿಯಾದ ಮಳೆ / ಮೇಘಸ್ಫೋಟ"},
    "pest_attack": {"en": "Pest Attack / Infestation", "kn": "ಕೀಟಬಾಧೆ"},
    "disease": {"en": "Crop Disease / Fungal Blight", "kn": "ಬೆಳೆ ರೋಗ / ಶಿಲೀಂಧ್ರ ಬಾಧೆ"},
    "storm": {"en": "Storm / Cyclone / High Winds", "kn": "ಬಿರುಗಾಳಿ / ಚಂಡಮಾರುತ"},
    "hailstorm": {"en": "Hailstorm", "kn": "ಆಲಿಕಲ್ಲು ಮಳೆ"},
    "other": {"en": "Other Natural Peril", "kn": "ಇತರ ನೈಸರ್ಗಿಕ ವಿಕೋಪ"}
}

VALID_SEASONS = ["Kharif", "Rabi", "Summer", "Annual Commercial"]

class InsuranceService:
    """
    Comprehensive Crop Loss & Agricultural Insurance Service.
    Manages crop damage reports, verified government insurance schemes,
    preliminary eligibility determination, and claim preparation checklists.
    """

    def generate_report_id(self) -> str:
        """Generates a verifiable, human-readable Crop Loss Reference ID (e.g. CLR-2026-7842)."""
        year = datetime.now().year
        suffix = uuid.uuid4().hex[:6].upper()
        return f"CLR-{year}-{suffix}"

    def submit_crop_loss_report(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validates, persists, and confirms a farmer's crop loss or crop disease incident report.
        Strictly persists to the operational database.
        """
        farmer_name = str(data.get("farmer_name") or "").strip()
        phone = str(data.get("phone") or "").strip()
        district = str(data.get("district") or "").strip()
        crop_name = str(data.get("crop_name") or "").strip()
        growing_season = str(data.get("growing_season") or "Kharif").strip()
        damage_type = str(data.get("damage_type") or "other").strip().lower()
        damage_description = str(data.get("damage_description") or "").strip()

        # Validation
        if not farmer_name or len(farmer_name) < 2:
            raise ValueError("Farmer name is mandatory (minimum 2 characters).")
        if not phone or len(phone) < 10:
            raise ValueError("A valid 10-digit mobile contact number is mandatory.")
        if not district:
            raise ValueError("District is mandatory.")
        if not crop_name:
            raise ValueError("Crop name is mandatory.")
        if not damage_description or len(damage_description) < 5:
            raise ValueError("Please provide a description of the observed crop damage (minimum 5 characters).")

        try:
            land_area = float(data.get("land_area_affected") or 1.0)
            if land_area <= 0:
                raise ValueError()
        except Exception:
            raise ValueError("Affected land area must be a positive number.")

        area_unit = str(data.get("area_unit") or "Acres").strip()
        
        # Loss percentage (optional)
        loss_pct = data.get("estimated_loss_percentage")
        if loss_pct is not None and loss_pct != "":
            try:
                loss_pct = float(loss_pct)
                if not (0 <= loss_pct <= 100):
                    raise ValueError()
            except Exception:
                raise ValueError("Estimated loss percentage must be between 0 and 100.")
        else:
            loss_pct = None

        today_str = datetime.now().strftime("%Y-%m-%d")
        damage_noticed_date = str(data.get("damage_noticed_date") or today_str).strip()
        incident_date = str(data.get("incident_date") or today_str).strip()
        sowing_date = str(data.get("sowing_date") or "").strip() or None
        expected_harvest_date = str(data.get("expected_harvest_date") or "").strip() or None

        report_id = self.generate_report_id()
        photo_urls = json.dumps(data.get("photo_urls") or [])
        document_urls = json.dumps(data.get("document_urls") or [])
        preferred_lang = str(data.get("preferred_language") or "en").strip()
        user_id = data.get("user_id")

        query = """
            INSERT INTO CROP_LOSS_REPORTS (
                report_id, farmer_name, phone, state, district, taluk, village, location,
                crop_name, crop_variety, growing_season, sowing_date, expected_harvest_date,
                land_area_affected, area_unit, damage_noticed_date, incident_date,
                damage_type, damage_description, estimated_loss_percentage,
                photo_urls, document_urls, status, preferred_language, user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        params = (
            report_id, farmer_name, phone, data.get("state") or "Karnataka",
            district, data.get("taluk") or district, data.get("village") or "",
            data.get("location") or f"{district}, Karnataka",
            crop_name, data.get("crop_variety") or "Standard",
            growing_season, sowing_date, expected_harvest_date,
            land_area, area_unit, damage_noticed_date, incident_date,
            damage_type, damage_description, loss_pct,
            photo_urls, document_urls, "SUBMITTED", preferred_lang, user_id
        )

        snowflake_manager.execute_query(query, params)
        logger.info("Successfully created Crop Loss Report %s for farmer %s", report_id, farmer_name)

        return self.get_crop_loss_report(report_id)

    def get_crop_loss_report(self, report_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves an existing Crop Loss Report by reference ID."""
        query = "SELECT * FROM CROP_LOSS_REPORTS WHERE report_id = ?"
        rows = snowflake_manager.execute_query(query, (report_id,))
        if not rows:
            return None
        r = dict(rows[0])
        try:
            r["photo_urls"] = json.loads(r.get("photo_urls") or "[]")
        except Exception:
            r["photo_urls"] = []
        try:
            r["document_urls"] = json.loads(r.get("document_urls") or "[]")
        except Exception:
            r["document_urls"] = []
        return r

    def list_crop_loss_reports(self, phone: Optional[str] = None, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Lists crop loss reports for the authenticated farmer or specified phone number."""
        if user_id:
            query = "SELECT * FROM CROP_LOSS_REPORTS WHERE user_id = ? ORDER BY created_at DESC"
            rows = snowflake_manager.execute_query(query, (user_id,))
        elif phone:
            query = "SELECT * FROM CROP_LOSS_REPORTS WHERE phone = ? ORDER BY created_at DESC"
            rows = snowflake_manager.execute_query(query, (phone,))
        else:
            query = "SELECT * FROM CROP_LOSS_REPORTS ORDER BY created_at DESC LIMIT 50"
            rows = snowflake_manager.execute_query(query)

        result = []
        for r in rows:
            item = dict(r)
            try:
                item["photo_urls"] = json.loads(item.get("photo_urls") or "[]")
            except Exception:
                item["photo_urls"] = []
            try:
                item["document_urls"] = json.loads(item.get("document_urls") or "[]")
            except Exception:
                item["document_urls"] = []
            result.append(item)
        return result

    def get_verified_schemes(self) -> List[Dict[str, Any]]:
        """
        Returns verified Indian government crop insurance schemes.
        Sources: Ministry of Agriculture and Farmers Welfare (pmfby.gov.in) &
        Government of Karnataka Department of Agriculture (samrakshane.karnataka.gov.in).
        """
        query = "SELECT * FROM INSURANCE_SCHEMES WHERE active_status = 1 ORDER BY scheme_id ASC"
        rows = snowflake_manager.execute_query(query)
        result = []
        for r in rows:
            item = dict(r)
            try:
                item["required_documents"] = json.loads(item.get("required_documents") or "[]")
            except Exception:
                item["required_documents"] = []
            try:
                item["required_documents_kannada"] = json.loads(item.get("required_documents_kannada") or "[]")
            except Exception:
                item["required_documents_kannada"] = []
            result.append(item)
        return result

    def evaluate_preliminary_eligibility(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluates preliminary eligibility for verified government schemes.
        Labels the result as preliminary guidance only.
        Never guarantees official approval or compensation.
        """
        district = str(data.get("district") or "").strip()
        crop_name = str(data.get("crop_name") or "").strip()
        season = str(data.get("season") or "Kharif").strip()
        is_insured = bool(data.get("is_insured", True))
        incident_date_str = str(data.get("incident_date") or datetime.now().strftime("%Y-%m-%d")).strip()
        damage_type = str(data.get("damage_type") or "flood").strip().lower()

        # Compute notification window: PMFBY 72-hour localized damage deadline rule
        within_72_hours = True
        hours_elapsed = 0
        try:
            inc_dt = datetime.strptime(incident_date_str, "%Y-%m-%d")
            delta = datetime.now() - inc_dt
            hours_elapsed = int(delta.total_seconds() / 3600)
            if hours_elapsed > 72:
                within_72_hours = False
        except Exception:
            hours_elapsed = 24

        matching_criteria = []
        attention_items = []

        if is_insured:
            matching_criteria.append("Farmer has active crop insurance coverage / enrollment for the current agricultural season.")
        else:
            attention_items.append("Crop insurance policy was not active at the time of damage. Direct PMFBY claim requires active enrollment; however, state disaster relief (SDRF/NDRF) through Tahsildar may apply.")

        if within_72_hours:
            matching_criteria.append(f"Incident is within the mandatory 72-hour localized calamity intimation window ({hours_elapsed} hours elapsed).")
        else:
            attention_items.append(f"Incident occurred approximately {hours_elapsed} hours ago (exceeding the standard 72-hour intimation rule). Contact your Raitha Samparka Kendra (RSK) or Village Accountant immediately for emergency condonation.")

        if damage_type in ["flood", "excess_rainfall", "drought", "hailstorm", "storm"]:
            matching_criteria.append(f"Damage peril ({VALID_DAMAGE_TYPES.get(damage_type, {}).get('en', damage_type)}) qualifies as non-preventable natural calamity under PMFBY & RWBCIS guidelines.")
        elif damage_type in ["pest_attack", "disease"]:
            matching_criteria.append("Pest / Disease damage is covered under PMFBY standing crop yield loss (assessed via General Crop Estimation Surveys & Crop Cutting Experiments).")

        schemes = self.get_verified_schemes()
        recommended_schemes = []
        for s in schemes:
            recommended_schemes.append({
                "scheme_id": s["scheme_id"],
                "scheme_name": s["scheme_name"],
                "scheme_name_kannada": s["scheme_name_kannada"],
                "portal_url": s["portal_url"],
                "helpline_number": s["helpline_number"],
                "preliminary_status": "MATCHES_CRITERIA" if is_insured and within_72_hours else "SPECIAL_REVIEW_REQUIRED",
                "next_steps": "Submit formal claim intimation via National Crop Insurance Portal (pmfby.gov.in) or call 14447 within 72 hours." if is_insured else "Visit your local Hobli Raitha Samparka Kendra (RSK) or Taluk Tahsildar office for government calamity relief."
            })

        return {
            "evaluation_timestamp": datetime.now(timezone.utc).isoformat(),
            "is_preliminary_guidance_only": True,
            "disclaimer": "This analysis provides educational preliminary guidance based on published PMFBY/State guidelines. It does not constitute an official insurance claim, decision, or guarantee of compensation. All payouts depend on official field inspection and insurer verification.",
            "district": district,
            "crop_name": crop_name,
            "hours_elapsed": hours_elapsed,
            "within_72_hour_window": within_72_hours,
            "within_72_hours": within_72_hours,
            "guidance_en": " ".join(matching_criteria + attention_items),
            "guidance_kn": "ಪ್ರಸ್ತುತ ಹಾನಿ ವಿವರಗಳನ್ನು PMFBY ಮಾರ್ಗಸೂಚಿಗಳೊಂದಿಗೆ ಮೌಲ್ಯಮಾಪನ ಮಾಡಲಾಗಿದೆ. " + ("72 ಗಂಟೆಗಳ ಕಾಲಮಿತಿಯ ಒಳಗೆ ಮಾಹಿತಿ ನೀಡಬೇಕು." if within_72_hours else "72 ಗಂಟೆಗಳ ಕಾಲಾವಕಾಶ ಮೀರಿದ್ದು, ತಕ್ಷಣವೇ RSK ಅಧಿಕಾರಿಗಳನ್ನು ಸಂಪರ್ಕಿಸಿ."),
            "matching_criteria": matching_criteria,
            "attention_items": attention_items,
            "recommended_schemes": recommended_schemes
        }

    def get_document_checklist(self, scheme_id: Optional[str] = None, damage_type: Optional[str] = None) -> Dict[str, Any]:
        """
        Provides a dynamic verified checklist of required documents for claim preparation.
        """
        checklist = [
            {
                "id": "DOC_AADHAAR",
                "title": "Aadhaar Card / Government Photo ID",
                "title_kn": "ಆಧಾರ್ ಕಾರ್ಡ್ / ಸರ್ಕಾರದ ಗುರುತಿನ ಚೀಟಿ",
                "category": "Identity",
                "is_mandatory": True,
                "description": "Primary identity verification of the landholding or cultivating farmer (Aadhaar number seeded with bank).",
                "description_kn": "ರೈತರ ಅಧಿಕೃತ ಗುರುತಿನ ಚೀಟಿ ಹಾಗೂ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ಲಿಂಕ್ ಆಗಿರುವ ಆಧಾರ್ ಪ್ರತಿ."
            },
            {
                "id": "DOC_BANK",
                "title": "Bank Passbook Copy / Cancelled Cheque",
                "title_kn": "ಬ್ಯಾಂಕ್ ಪಾಸ್‌ಬುಕ್ ಪ್ರತಿ / ಚೆಕ್",
                "category": "Financial",
                "is_mandatory": True,
                "description": "Clear copy showing Account Number, IFSC code, and Farmer Name for Direct Benefit Transfer (DBT).",
                "description_kn": "ನೇರ ಪರಿಹಾರ ಜಮೆಗಾಗಿ ಬ್ಯಾಂಕ್ ಖಾತೆ ಸಂಖ್ಯೆ ಮತ್ತು ಐಎಫ್‌ಎಸ್‌ಸಿ (IFSC) ಕೋಡ್ ಸ್ಪಷ್ಟವಾಗಿ ಕಾಣುವ ಪಾಸ್‌ಬುಕ್ ಪ್ರತಿ."
            },
            {
                "id": "DOC_RTC",
                "title": "Land Records: Bhoomi RTC / Pahani",
                "title_kn": "ಭೂಮಿ ಪಹಣಿ / ಆರ್‌ಟಿಸಿ (RTC) ದಾಖಲೆ",
                "category": "Land Records",
                "is_mandatory": True,
                "description": "Current agricultural year RTC/Pahani issued by Karnataka Revenue Department proving survey number and land extent.",
                "description_kn": "ಪ್ರಸ್ತುತ ಸಾಲಿನ ಸರ್ವೆ ನಂಬರ್ ಮತ್ತು ಜಮೀನಿನ ವಿಸ್ತೀರ್ಣ ಸ್ಪಷ್ಟವಾಗಿರುವ ಅಧಿಕೃತ ಪಹಣಿ ಪ್ರತಿ."
            },
            {
                "id": "DOC_SOWING",
                "title": "Sowing Certificate / Self-Declaration",
                "title_kn": "ಬಿತ್ತನೆ ದೃಢೀಕರಣ ಪತ್ರ / ಸ್ವಯಂ ಘೋಷಣೆ",
                "category": "Cultivation Proof",
                "is_mandatory": True,
                "description": "Certificate issued by Village Accountant, Raitha Samparka Kendra (RSK) or self-declaration confirming crop sown in the survey number.",
                "description_kn": "ಗ್ರಾಮ ಲೆಕ್ಕಿಗರು ಅಥವಾ ರೈತ ಸಂಪರ್ಕ ಕೇಂದ್ರದಿಂದ ಪಡೆದ ಬಿತ್ತನೆ ಪ್ರಮಾಣಪತ್ರ ಅಥವಾ ಸ್ವಯಂ ಘೋಷಣೆ."
            },
            {
                "id": "DOC_INS_RECEIPT",
                "title": "Crop Insurance Policy / Acknowledgment Receipt",
                "title_kn": "ಬೆಳೆ ವಿಮಾ ರಶೀದಿ / ಪಾಲಿಸಿ ಪ್ರತಿ",
                "category": "Insurance Proof",
                "is_mandatory": True,
                "description": "Premium deduction receipt or acknowledgment number issued by bank, CSC (Common Service Center), or PMFBY portal.",
                "description_kn": "ಬ್ಯಾಂಕ್ ಅಥವಾ ಸಿಎಸ್‌ಸಿ ಕೇಂದ್ರದಿಂದ ಪಡೆದ ಬೆಳೆ ವಿಮೆ ಪ್ರೀಮಿಯಂ ರಶೀದಿ ಅಥವಾ ಅಕ್ನಾಲೆಡ್ಜ್‌ಮೆಂಟ್ ಸ್ಲಿಪ್."
            },
            {
                "id": "DOC_PHOTOS",
                "title": "Geotagged Crop Loss Photographs (2 to 3 photos)",
                "title_kn": "ಜಿಯೋಟ್ಯಾಗ್ ಬೆಳೆ ಹಾನಿ ಛಾಯಾಚಿತ್ರಗಳು",
                "category": "Evidence",
                "is_mandatory": False,
                "description": "Photographs of damaged standing crop showing field background with location geotag or date watermark.",
                "description_kn": "ಹಾನಿಗೊಳಗಾದ ಹೊಲದ ಸ್ಪಷ್ಟ ಫೋಟೋಗಳು (ದಿನಾಂಕ ಮತ್ತು ಸ್ಥಳ ವಿವರಗಳೊಂದಿಗೆ)."
            },
            {
                "id": "DOC_TENANCY",
                "title": "Tenancy Agreement / Cultivation Agreement (If Tenant)",
                "title_kn": "ಗೇಣಿ ಒಪ್ಪಂದ ಪತ್ರ (ಗೇಣಿ ರೈತರಾಗಿದ್ದರೆ ಮಾತ್ರ)",
                "category": "Tenancy",
                "is_mandatory": False,
                "description": "Notarized or GP-certified agreement proving tenant farming right over the surveyed parcel.",
                "description_kn": "ಗೇಣಿ ಜಮೀನಿನಲ್ಲಿ ಸಾಗುವಳಿ ಮಾಡುತ್ತಿರುವ ಬಗ್ಗೆ ದೃಢೀಕರಣ ಪತ್ರ."
            }
        ]

        return {
            "scheme_name": "PMFBY & Karnataka Samrakshane Standard Claim Package",
            "total_documents": len(checklist),
            "mandatory_documents_count": sum(1 for d in checklist if d["is_mandatory"]),
            "documents": checklist,
            "official_portal_url": "https://pmfby.gov.in",
            "state_portal_url": "https://samrakshane.karnataka.gov.in",
            "helpline": "14447"
        }

insurance_service = InsuranceService()
