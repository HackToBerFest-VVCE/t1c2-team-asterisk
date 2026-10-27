"""
FARMPRICE AI — Snowflake Marketplace Service
Authoritative Transactional & Analytical Service connecting the Agri Marketplace to Snowflake.
Executes against FARMPRICE_DB.AGRICULTURE (Snowflake Live) with dual-write to Local SQLite mirror.
Enforces business rules, quantity limits, duplicate prevention, and concurrency integrity.
"""

import os
import uuid
import sqlite3
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from fastapi import HTTPException

from backend.app.core.snowflake import snowflake_manager
from backend.app.schemas.marketplace import (
    ProduceListingCreate,
    ProduceListingUpdate,
    PurchaseEnquiryCreate,
    PurchaseEnquiryStatusUpdate,
    MarketplaceProfileCreate
)

logger = logging.getLogger("farmprice.marketplace_service")
LOCAL_DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "snowflake", "farmprice_local.db")

class MarketplaceService:
    def __init__(self):
        self._ensure_local_mirror_schema()

    def _get_local_connection(self) -> sqlite3.Connection:
        os.makedirs(os.path.dirname(LOCAL_DB_PATH), exist_ok=True)
        conn = sqlite3.connect(LOCAL_DB_PATH, check_same_thread=False, timeout=10.0)
        conn.row_factory = sqlite3.Row
        return conn

    def _ensure_local_mirror_schema(self):
        try:
            conn = self._get_local_connection()
            cur = conn.cursor()
            cur.execute("""
                CREATE TABLE IF NOT EXISTS MARKETPLACE_PROFILES (
                    profile_id TEXT PRIMARY KEY,
                    user_id TEXT UNIQUE NOT NULL,
                    role TEXT NOT NULL,
                    full_name TEXT NOT NULL,
                    phone TEXT NOT NULL,
                    email TEXT,
                    state TEXT DEFAULT 'Karnataka',
                    district TEXT NOT NULL,
                    village_or_town TEXT,
                    business_name TEXT,
                    kisan_card_or_gst TEXT,
                    is_verified INTEGER DEFAULT 1,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS PRODUCE_LISTINGS (
                    listing_id TEXT PRIMARY KEY,
                    farmer_id TEXT NOT NULL,
                    farmer_name TEXT NOT NULL,
                    farmer_phone TEXT NOT NULL,
                    crop_name TEXT NOT NULL,
                    variety TEXT DEFAULT 'Standard / Hybrid',
                    available_quantity REAL NOT NULL,
                    initial_quantity REAL NOT NULL,
                    quantity_unit TEXT DEFAULT 'Quintals',
                    expected_price REAL NOT NULL,
                    state TEXT DEFAULT 'Karnataka',
                    district TEXT NOT NULL,
                    village_or_town TEXT NOT NULL,
                    pickup_address TEXT,
                    harvest_date TEXT NOT NULL,
                    quality_grade TEXT DEFAULT 'Grade A / Fair Average',
                    listing_status TEXT DEFAULT 'ACTIVE',
                    description TEXT,
                    photo_url TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS PURCHASE_ENQUIRIES (
                    enquiry_id TEXT PRIMARY KEY,
                    buyer_id TEXT NOT NULL,
                    buyer_name TEXT NOT NULL,
                    buyer_phone TEXT NOT NULL,
                    buyer_company TEXT,
                    listing_id TEXT NOT NULL,
                    requested_quantity REAL NOT NULL,
                    offered_price REAL NOT NULL,
                    enquiry_status TEXT DEFAULT 'SUBMITTED',
                    message TEXT,
                    farmer_response_note TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
            conn.close()
        except Exception as e:
            logger.warning(f"Local mirror schema warning: {e}")

    # =====================================================================
    # 1. PRODUCE LISTINGS (READ / WRITE / UPDATE)
    # =====================================================================

    def get_listings(
        self,
        crop_name: Optional[str] = None,
        district: Optional[str] = None,
        status: Optional[str] = None,
        farmer_id: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Retrieves active produce listings from Snowflake live database.
        Includes attached farmer profile metadata and enquiry counts.
        """
        query = """
            SELECT 
                l.listing_id,
                l.farmer_id,
                l.farmer_name,
                l.farmer_phone,
                l.crop_name,
                l.variety,
                l.available_quantity,
                l.initial_quantity,
                l.quantity_unit,
                l.expected_price,
                l.state,
                l.district,
                l.village_or_town,
                l.pickup_address,
                TO_VARCHAR(l.harvest_date, 'YYYY-MM-DD') AS harvest_date,
                l.quality_grade,
                l.listing_status,
                l.description,
                l.photo_url,
                TO_VARCHAR(l.created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at,
                TO_VARCHAR(l.updated_at, 'YYYY-MM-DD HH24:MI:SS') AS updated_at,
                p.business_name AS farmer_farm_name,
                p.is_verified AS farmer_is_verified
            FROM PRODUCE_LISTINGS l
            LEFT JOIN MARKETPLACE_PROFILES p ON l.farmer_id = p.user_id OR l.farmer_id = p.profile_id
            WHERE 1=1
        """
        params = []
        if crop_name:
            query += " AND LOWER(l.crop_name) LIKE LOWER(?)"
            params.append(f"%{crop_name}%")
        if district:
            query += " AND LOWER(l.district) = LOWER(?)"
            params.append(district)
        if status:
            query += " AND UPPER(l.listing_status) = UPPER(?)"
            params.append(status)
        else:
            # Default to active & partially fulfilled listings
            query += " AND l.listing_status IN ('ACTIVE', 'PARTIALLY_FULFILLED')"
        if farmer_id:
            query += " AND (l.farmer_id = ? OR l.farmer_name = ?)"
            params.extend([farmer_id, farmer_id])
        if min_price is not None:
            query += " AND l.expected_price >= ?"
            params.append(min_price)
        if max_price is not None:
            query += " AND l.expected_price <= ?"
            params.append(max_price)

        query += " ORDER BY l.created_at DESC LIMIT ?"
        params.append(limit)

        records = snowflake_manager.execute_query(query, tuple(params))

        # Query enquiry counts
        enquiries_map = {}
        try:
            enq_counts = snowflake_manager.execute_query("""
                SELECT listing_id, COUNT(*) AS cnt 
                FROM PURCHASE_ENQUIRIES 
                GROUP BY listing_id
            """)
            for ec in enq_counts:
                enquiries_map[ec["listing_id"]] = int(ec.get("cnt", 0))
        except Exception:
            pass

        results = []
        for r in records:
            item = dict(r)
            # normalize harvest_date
            hd = item.get("harvest_date")
            if hd and hasattr(hd, "isoformat"):
                item["harvest_date"] = hd.isoformat()
            else:
                item["harvest_date"] = str(hd or "").split("T")[0]

            item["available_quantity"] = float(item.get("available_quantity") or 0.0)
            item["initial_quantity"] = float(item.get("initial_quantity") or item["available_quantity"])
            item["expected_price"] = float(item.get("expected_price") or 0.0)
            item["enquiries_count"] = enquiries_map.get(item["listing_id"], 0)
            results.append(item)

        return results

    def get_listing_by_id(self, listing_id: str) -> Dict[str, Any]:
        """Fetch a single listing from Snowflake by listing_id."""
        query = """
            SELECT 
                l.listing_id,
                l.farmer_id,
                l.farmer_name,
                l.farmer_phone,
                l.crop_name,
                l.variety,
                l.available_quantity,
                l.initial_quantity,
                l.quantity_unit,
                l.expected_price,
                l.state,
                l.district,
                l.village_or_town,
                l.pickup_address,
                TO_VARCHAR(l.harvest_date, 'YYYY-MM-DD') AS harvest_date,
                l.quality_grade,
                l.listing_status,
                l.description,
                l.photo_url,
                TO_VARCHAR(l.created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at,
                TO_VARCHAR(l.updated_at, 'YYYY-MM-DD HH24:MI:SS') AS updated_at,
                p.business_name AS farmer_farm_name,
                p.is_verified AS farmer_is_verified
            FROM PRODUCE_LISTINGS l
            LEFT JOIN MARKETPLACE_PROFILES p ON l.farmer_id = p.user_id OR l.farmer_id = p.profile_id
            WHERE l.listing_id = ?
        """
        rows = snowflake_manager.execute_query(query, (listing_id,))
        if not rows:
            raise HTTPException(status_code=404, detail=f"Produce listing '{listing_id}' not found.")

        item = dict(rows[0])
        hd = item.get("harvest_date")
        if hd and hasattr(hd, "isoformat"):
            item["harvest_date"] = hd.isoformat()
        else:
            item["harvest_date"] = str(hd or "").split("T")[0]

        item["available_quantity"] = float(item.get("available_quantity") or 0.0)
        item["initial_quantity"] = float(item.get("initial_quantity") or item["available_quantity"])
        item["expected_price"] = float(item.get("expected_price") or 0.0)

        # Count enquiries
        try:
            enqs = snowflake_manager.execute_query(
                "SELECT COUNT(*) as cnt FROM PURCHASE_ENQUIRIES WHERE listing_id = ?", (listing_id,)
            )
            item["enquiries_count"] = int(enqs[0].get("cnt", 0)) if enqs else 0
        except Exception:
            item["enquiries_count"] = 0

        return item

    def create_listing(self, data: ProduceListingCreate) -> Dict[str, Any]:
        """Creates a new produce listing and saves it to Snowflake and local SQLite mirror."""
        listing_id = f"LST_{data.crop_name.upper().replace(' ', '_')}_{uuid.uuid4().hex[:6].upper()}"
        now_dt = datetime.now(timezone.utc)
        now_iso = now_dt.strftime("%Y-%m-%d %H:%M:%S")

        insert_query = """
            INSERT INTO PRODUCE_LISTINGS (
                listing_id, farmer_id, farmer_name, farmer_phone, crop_name, variety,
                available_quantity, initial_quantity, quantity_unit, expected_price,
                state, district, village_or_town, pickup_address, harvest_date,
                quality_grade, listing_status, description, photo_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
        """
        params = (
            listing_id, data.farmer_id, data.farmer_name, data.farmer_phone, data.crop_name,
            data.variety or "Standard / Hybrid", data.available_quantity, data.available_quantity,
            data.quantity_unit, data.expected_price, data.state, data.district,
            data.village_or_town, data.pickup_address, data.harvest_date,
            data.quality_grade or "Grade A / Fair Average", data.description, data.photo_url
        )

        # 1. Authoritative write to Snowflake
        snowflake_manager.execute_query(insert_query, params)

        # 2. Synchronous mirror write to local SQLite
        try:
            conn = self._get_local_connection()
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO PRODUCE_LISTINGS (
                    listing_id, farmer_id, farmer_name, farmer_phone, crop_name, variety,
                    available_quantity, initial_quantity, quantity_unit, expected_price,
                    state, district, village_or_town, pickup_address, harvest_date,
                    quality_grade, listing_status, description, photo_url, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?)
            """, (*params, now_iso, now_iso))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.warning(f"Error mirroring listing to SQLite: {e}")

        logger.info(f"Created produce listing {listing_id} for crop {data.crop_name} by farmer {data.farmer_name}.")
        return self.get_listing_by_id(listing_id)

    def update_listing(self, listing_id: str, data: ProduceListingUpdate, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Updates an existing listing in Snowflake when a farmer edits details."""
        existing = self.get_listing_by_id(listing_id)

        # Permission check
        if user_id and existing["farmer_id"] != user_id and user_id != "admin":
            raise HTTPException(status_code=403, detail="Unauthorized: you can only edit your own produce listings.")

        updates = []
        params = []

        if data.crop_name is not None:
            updates.append("crop_name = ?")
            params.append(data.crop_name)
        if data.variety is not None:
            updates.append("variety = ?")
            params.append(data.variety)
        if data.available_quantity is not None:
            if data.available_quantity < 0:
                raise HTTPException(status_code=400, detail="Available quantity cannot be negative.")
            updates.append("available_quantity = ?")
            params.append(data.available_quantity)
            if data.available_quantity == 0 and not data.listing_status:
                updates.append("listing_status = 'FULFILLED'")
        if data.expected_price is not None:
            if data.expected_price <= 0:
                raise HTTPException(status_code=400, detail="Expected price must be greater than zero.")
            updates.append("expected_price = ?")
            params.append(data.expected_price)
        if data.district is not None:
            updates.append("district = ?")
            params.append(data.district)
        if data.village_or_town is not None:
            updates.append("village_or_town = ?")
            params.append(data.village_or_town)
        if data.pickup_address is not None:
            updates.append("pickup_address = ?")
            params.append(data.pickup_address)
        if data.harvest_date is not None:
            updates.append("harvest_date = ?")
            params.append(data.harvest_date)
        if data.quality_grade is not None:
            updates.append("quality_grade = ?")
            params.append(data.quality_grade)
        if data.listing_status is not None:
            updates.append("listing_status = ?")
            params.append(data.listing_status)
        if data.description is not None:
            updates.append("description = ?")
            params.append(data.description)
        if data.photo_url is not None:
            updates.append("photo_url = ?")
            params.append(data.photo_url)

        if not updates:
            return existing

        updates.append("updated_at = CURRENT_TIMESTAMP()")
        sql = f"UPDATE PRODUCE_LISTINGS SET {', '.join(updates)} WHERE listing_id = ?"
        params.append(listing_id)

        snowflake_manager.execute_query(sql, tuple(params))

        # Mirror to local SQLite
        try:
            conn = self._get_local_connection()
            cur = conn.cursor()
            sql_sqlite = sql.replace("CURRENT_TIMESTAMP()", "CURRENT_TIMESTAMP")
            cur.execute(sql_sqlite, tuple(params))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.warning(f"Error mirroring listing update to SQLite: {e}")

        logger.info(f"Updated listing {listing_id} in Snowflake.")
        return self.get_listing_by_id(listing_id)

    # =====================================================================
    # 2. PURCHASE ENQUIRIES (SUBMIT / STATUS / CONCURRENCY VALIDATION)
    # =====================================================================

    def create_purchase_enquiry(self, listing_id: str, data: PurchaseEnquiryCreate) -> Dict[str, Any]:
        """
        Validates input, checks available quantity, prevents duplicate active enquiries,
        and records buyer purchase enquiry in Snowflake.
        """
        listing = self.get_listing_by_id(listing_id)

        # 1. Validate listing availability
        if listing["listing_status"] not in ("ACTIVE", "PARTIALLY_FULFILLED"):
            raise HTTPException(
                status_code=400,
                detail=f"Produce listing '{listing_id}' is {listing['listing_status']} and cannot accept new enquiries."
            )

        # 2. Validate requested quantity against available quantity
        if data.requested_quantity > listing["available_quantity"]:
            raise HTTPException(
                status_code=400,
                detail=f"Requested quantity ({data.requested_quantity} {listing['quantity_unit']}) exceeds available stock ({listing['available_quantity']} {listing['quantity_unit']})."
            )

        # 3. Prevent duplicate active enquiry from the same buyer on this listing
        existing_enquiries = snowflake_manager.execute_query("""
            SELECT enquiry_id FROM PURCHASE_ENQUIRIES 
            WHERE buyer_id = ? AND listing_id = ? AND enquiry_status = 'SUBMITTED'
        """, (data.buyer_id, listing_id))
        if existing_enquiries:
            raise HTTPException(
                status_code=409,
                detail="You already have a pending purchase enquiry submitted for this produce listing. Please wait for the farmer's response."
            )

        enquiry_id = f"ENQ_{data.buyer_name[:4].upper()}_{uuid.uuid4().hex[:6].upper()}"
        now_dt = datetime.now(timezone.utc)
        now_iso = now_dt.strftime("%Y-%m-%d %H:%M:%S")

        insert_sql = """
            INSERT INTO PURCHASE_ENQUIRIES (
                enquiry_id, buyer_id, buyer_name, buyer_phone, buyer_company,
                listing_id, requested_quantity, offered_price, enquiry_status,
                message, farmer_response_note
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', ?, 'Pending review by farmer.')
        """
        params = (
            enquiry_id, data.buyer_id, data.buyer_name, data.buyer_phone,
            data.buyer_company or "Independent Buyer", listing_id,
            data.requested_quantity, data.offered_price, data.message or "Ready for trade."
        )

        snowflake_manager.execute_query(insert_sql, params)

        # SQLite mirror
        try:
            conn = self._get_local_connection()
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO PURCHASE_ENQUIRIES (
                    enquiry_id, buyer_id, buyer_name, buyer_phone, buyer_company,
                    listing_id, requested_quantity, offered_price, enquiry_status,
                    message, farmer_response_note, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', ?, 'Pending review by farmer.', ?, ?)
            """, (*params, now_iso, now_iso))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.warning(f"Error mirroring enquiry to SQLite: {e}")

        logger.info(f"Submitted purchase enquiry {enquiry_id} for listing {listing_id} by {data.buyer_name}.")
        return self.get_enquiry_by_id(enquiry_id)

    def get_enquiry_by_id(self, enquiry_id: str) -> Dict[str, Any]:
        """Fetch a single purchase enquiry by ID with joined listing and farmer details."""
        query = """
            SELECT 
                e.enquiry_id,
                e.buyer_id,
                e.buyer_name,
                e.buyer_phone,
                e.buyer_company,
                e.listing_id,
                e.requested_quantity,
                e.offered_price,
                e.enquiry_status,
                e.message,
                e.farmer_response_note,
                TO_VARCHAR(e.created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at,
                TO_VARCHAR(e.updated_at, 'YYYY-MM-DD HH24:MI:SS') AS updated_at,
                l.crop_name,
                l.farmer_id,
                l.farmer_name,
                l.quantity_unit,
                l.expected_price AS listing_expected_price
            FROM PURCHASE_ENQUIRIES e
            LEFT JOIN PRODUCE_LISTINGS l ON e.listing_id = l.listing_id
            WHERE e.enquiry_id = ?
        """
        rows = snowflake_manager.execute_query(query, (enquiry_id,))
        if not rows:
            raise HTTPException(status_code=404, detail=f"Purchase enquiry '{enquiry_id}' not found.")

        item = dict(rows[0])
        item["requested_quantity"] = float(item.get("requested_quantity") or 0.0)
        item["offered_price"] = float(item.get("offered_price") or 0.0)
        item["listing_expected_price"] = float(item.get("listing_expected_price") or 0.0)
        return item

    def get_enquiries(
        self,
        buyer_id: Optional[str] = None,
        farmer_id: Optional[str] = None,
        listing_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Fetch enquiries filtered by buyer, farmer, listing, or status."""
        query = """
            SELECT 
                e.enquiry_id,
                e.buyer_id,
                e.buyer_name,
                e.buyer_phone,
                e.buyer_company,
                e.listing_id,
                e.requested_quantity,
                e.offered_price,
                e.enquiry_status,
                e.message,
                e.farmer_response_note,
                TO_VARCHAR(e.created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at,
                TO_VARCHAR(e.updated_at, 'YYYY-MM-DD HH24:MI:SS') AS updated_at,
                l.crop_name,
                l.farmer_id,
                l.farmer_name,
                l.quantity_unit,
                l.expected_price AS listing_expected_price,
                l.district AS listing_district
            FROM PURCHASE_ENQUIRIES e
            LEFT JOIN PRODUCE_LISTINGS l ON e.listing_id = l.listing_id
            WHERE 1=1
        """
        params = []
        if buyer_id:
            query += " AND e.buyer_id = ?"
            params.append(buyer_id)
        if farmer_id:
            query += " AND l.farmer_id = ?"
            params.append(farmer_id)
        if listing_id:
            query += " AND e.listing_id = ?"
            params.append(listing_id)
        if status:
            query += " AND UPPER(e.enquiry_status) = UPPER(?)"
            params.append(status)

        query += " ORDER BY e.created_at DESC LIMIT ?"
        params.append(limit)

        records = snowflake_manager.execute_query(query, tuple(params))
        results = []
        for r in records:
            item = dict(r)
            item["requested_quantity"] = float(item.get("requested_quantity") or 0.0)
            item["offered_price"] = float(item.get("offered_price") or 0.0)
            item["listing_expected_price"] = float(item.get("listing_expected_price") or 0.0)
            results.append(item)
        return results

    def update_enquiry_status(
        self,
        enquiry_id: str,
        data: PurchaseEnquiryStatusUpdate,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Updates enquiry status (ACCEPTED, REJECTED, COMPLETED, CANCELLED).
        When an enquiry is ACCEPTED:
        - Automatically decrements listing available_quantity by requested_quantity
        - Updates listing_status to PARTIALLY_FULFILLED or FULFILLED
        Enforces atomic transaction integrity.
        """
        enquiry = self.get_enquiry_by_id(enquiry_id)
        listing_id = enquiry["listing_id"]
        listing = self.get_listing_by_id(listing_id)

        target_status = data.enquiry_status.upper()
        if target_status not in ("ACCEPTED", "REJECTED", "COMPLETED", "CANCELLED"):
            raise HTTPException(status_code=400, detail=f"Invalid enquiry status: {target_status}")

        # Permission check: farmer who owns the listing can accept/reject
        if user_id and user_id != "admin" and user_id != enquiry["buyer_id"] and user_id != listing["farmer_id"]:
            raise HTTPException(status_code=403, detail="Unauthorized to change status of this enquiry.")

        # Business logic for ACCEPTED status: decrement stock
        if target_status == "ACCEPTED" and enquiry["enquiry_status"] != "ACCEPTED":
            requested_qty = enquiry["requested_quantity"]
            curr_avail = listing["available_quantity"]

            if requested_qty > curr_avail:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot accept enquiry: requested quantity ({requested_qty}) exceeds current stock ({curr_avail})."
                )

            new_avail = round(curr_avail - requested_qty, 2)
            new_listing_status = "FULFILLED" if new_avail <= 0.0 else "PARTIALLY_FULFILLED"

            # Update listing quantity and status in Snowflake
            snowflake_manager.execute_query("""
                UPDATE PRODUCE_LISTINGS 
                SET available_quantity = ?, listing_status = ?, updated_at = CURRENT_TIMESTAMP()
                WHERE listing_id = ?
            """, (new_avail, new_listing_status, listing_id))

            # Mirror to SQLite
            try:
                conn = self._get_local_connection()
                cur = conn.cursor()
                cur.execute("""
                    UPDATE PRODUCE_LISTINGS 
                    SET available_quantity = ?, listing_status = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE listing_id = ?
                """, (new_avail, new_listing_status, listing_id))
                conn.commit()
                conn.close()
            except Exception as e:
                logger.warning(f"Error mirroring listing stock update: {e}")

        # Update Enquiry in Snowflake
        snowflake_manager.execute_query("""
            UPDATE PURCHASE_ENQUIRIES 
            SET enquiry_status = ?, farmer_response_note = ?, updated_at = CURRENT_TIMESTAMP()
            WHERE enquiry_id = ?
        """, (target_status, data.farmer_response_note or enquiry.get("farmer_response_note"), enquiry_id))

        # Mirror to SQLite
        try:
            conn = self._get_local_connection()
            cur = conn.cursor()
            cur.execute("""
                UPDATE PURCHASE_ENQUIRIES 
                SET enquiry_status = ?, farmer_response_note = ?, updated_at = CURRENT_TIMESTAMP
                WHERE enquiry_id = ?
            """, (target_status, data.farmer_response_note or enquiry.get("farmer_response_note"), enquiry_id))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.warning(f"Error mirroring enquiry status update: {e}")

        logger.info(f"Updated enquiry {enquiry_id} to status {target_status}.")
        return self.get_enquiry_by_id(enquiry_id)

    # =====================================================================
    # 3. MARKETPLACE PROFILES (FARMERS & BUYERS)
    # =====================================================================

    def get_profiles(self, role: Optional[str] = None, district: Optional[str] = None) -> List[Dict[str, Any]]:
        """Fetch farmer and buyer marketplace profiles from Snowflake."""
        query = """
            SELECT 
                profile_id, user_id, role, full_name, phone, email, state, district,
                village_or_town, business_name, kisan_card_or_gst, is_verified,
                TO_VARCHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at,
                TO_VARCHAR(updated_at, 'YYYY-MM-DD HH24:MI:SS') AS updated_at
            FROM MARKETPLACE_PROFILES
            WHERE 1=1
        """
        params = []
        if role:
            query += " AND LOWER(role) = LOWER(?)"
            params.append(role)
        if district:
            query += " AND LOWER(district) = LOWER(?)"
            params.append(district)

        query += " ORDER BY role ASC, full_name ASC"
        return snowflake_manager.execute_query(query, tuple(params) if params else None)

    def upsert_profile(self, data: MarketplaceProfileCreate) -> Dict[str, Any]:
        """Creates or updates a farmer/buyer profile in Snowflake."""
        existing = snowflake_manager.execute_query(
            "SELECT profile_id FROM MARKETPLACE_PROFILES WHERE user_id = ?", (data.user_id,)
        )
        profile_id = existing[0]["profile_id"] if existing else f"PROF_{data.role.upper()[:4]}_{uuid.uuid4().hex[:6].upper()}"

        if existing:
            snowflake_manager.execute_query("""
                UPDATE MARKETPLACE_PROFILES
                SET full_name = ?, phone = ?, email = ?, district = ?, village_or_town = ?,
                    business_name = ?, kisan_card_or_gst = ?, updated_at = CURRENT_TIMESTAMP()
                WHERE profile_id = ?
            """, (
                data.full_name, data.phone, data.email, data.district, data.village_or_town,
                data.business_name, data.kisan_card_or_gst, profile_id
            ))
        else:
            snowflake_manager.execute_query("""
                INSERT INTO MARKETPLACE_PROFILES (
                    profile_id, user_id, role, full_name, phone, email, state, district,
                    village_or_town, business_name, kisan_card_or_gst, is_verified
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                profile_id, data.user_id, data.role, data.full_name, data.phone, data.email,
                data.state, data.district, data.village_or_town, data.business_name,
                data.kisan_card_or_gst, data.is_verified
            ))

        # SQLite mirror
        try:
            conn = self._get_local_connection()
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO MARKETPLACE_PROFILES (
                    profile_id, user_id, role, full_name, phone, email, state, district,
                    village_or_town, business_name, kisan_card_or_gst, is_verified
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(profile_id) DO UPDATE SET
                    full_name=excluded.full_name,
                    phone=excluded.phone,
                    email=excluded.email,
                    district=excluded.district,
                    village_or_town=excluded.village_or_town,
                    business_name=excluded.business_name,
                    kisan_card_or_gst=excluded.kisan_card_or_gst
            """, (
                profile_id, data.user_id, data.role, data.full_name, data.phone, data.email,
                data.state, data.district, data.village_or_town, data.business_name,
                data.kisan_card_or_gst, 1 if data.is_verified else 0
            ))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.warning(f"Error mirroring profile to SQLite: {e}")

        rows = snowflake_manager.execute_query(
            "SELECT * FROM MARKETPLACE_PROFILES WHERE profile_id = ?", (profile_id,)
        )
        return dict(rows[0]) if rows else {"profile_id": profile_id, "user_id": data.user_id}


marketplace_service = MarketplaceService()
