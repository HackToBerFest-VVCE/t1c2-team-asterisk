"""
FARMPRICE AI — Snowflake Marketplace Data Migration & Idempotent Seeder
Migrates and syncs canonical mock data for:
1. MARKETPLACE_PROFILES (Farmers and Buyers)
2. PRODUCE_LISTINGS (Live Crop Listings)
3. PURCHASE_ENQUIRIES (Buyer Purchase Requests)

Authoritatively connects to Live Snowflake (FARMPRICE_DB.AGRICULTURE)
and ensures seamless dual-mirror synchronization with local fallback.
Guarantees strict idempotency: running this script multiple times will NEVER create duplicates.
"""

import os
import sys
import sqlite3
import logging
from datetime import datetime, timezone

# Ensure project root is in path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.app.core.snowflake import snowflake_manager

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("marketplace_seeder")

LOCAL_DB_PATH = os.path.join(CURRENT_DIR, "farmprice_local.db")

# =====================================================================
# CANONICAL REUSABLE MOCK DATA
# =====================================================================

MARKETPLACE_PROFILES_DATA = [
    # Farmers
    {
        "profile_id": "PROF_FARMER_001",
        "user_id": "usr_chethan",
        "role": "farmer",
        "full_name": "Chethan Patel",
        "phone": "+91 98765 43210",
        "email": "chethan.patel@farmprice.ai",
        "state": "Karnataka",
        "district": "Hassan",
        "village_or_town": "Sakleshpur",
        "business_name": "Patel Organic Spice & Veg Estate",
        "kisan_card_or_gst": "KCC-KA-HAS-2023-8891",
        "is_verified": True
    },
    {
        "profile_id": "PROF_FARMER_002",
        "user_id": "usr_suresh",
        "role": "farmer",
        "full_name": "Suresh Gowda",
        "phone": "+91 94481 22334",
        "email": "suresh.gowda@gmail.com",
        "state": "Karnataka",
        "district": "Hassan",
        "village_or_town": "Channarayapatna",
        "business_name": "Gowda Agro Farms",
        "kisan_card_or_gst": "KCC-KA-HAS-2022-4412",
        "is_verified": True
    },
    {
        "profile_id": "PROF_FARMER_003",
        "user_id": "usr_manjunath",
        "role": "farmer",
        "full_name": "Manjunath K",
        "phone": "+91 98452 77889",
        "email": "manju.k@kaveriagri.org",
        "state": "Karnataka",
        "district": "Mysore",
        "village_or_town": "Hunsur",
        "business_name": "Kaveri Basin Produce Co.",
        "kisan_card_or_gst": "KCC-KA-MYS-2021-9031",
        "is_verified": True
    },
    {
        "profile_id": "PROF_FARMER_004",
        "user_id": "usr_ramesh",
        "role": "farmer",
        "full_name": "Ramesh Patil",
        "phone": "+91 99803 55667",
        "email": "ramesh.patil@belagavifarm.in",
        "state": "Karnataka",
        "district": "Belagavi",
        "village_or_town": "Athani",
        "business_name": "Patil Green Acres",
        "kisan_card_or_gst": "KCC-KA-BEL-2023-1102",
        "is_verified": True
    },
    {
        "profile_id": "PROF_FARMER_005",
        "user_id": "usr_devendrappa",
        "role": "farmer",
        "full_name": "Devendrappa B",
        "phone": "+91 97410 99881",
        "email": "devendrappa.b@agrikannada.net",
        "state": "Karnataka",
        "district": "Davanagere",
        "village_or_town": "Harihar",
        "business_name": "Tungabhadra Agri Holdings",
        "kisan_card_or_gst": "KCC-KA-DAV-2022-7749",
        "is_verified": True
    },

    # Buyers & APMC Traders
    {
        "profile_id": "PROF_BUYER_001",
        "user_id": "buyer_hassan_apmc",
        "role": "buyer",
        "full_name": "Dr. S. K. Ramesh (Secretary)",
        "phone": "08172-268420",
        "email": "apmc.hassan@karnataka.gov.in",
        "state": "Karnataka",
        "district": "Hassan",
        "village_or_town": "Hassan APMC Market Yard",
        "business_name": "Hassan APMC Procurement Yard",
        "kisan_card_or_gst": "APMC-LIC-KA-HAS-01",
        "is_verified": True
    },
    {
        "profile_id": "PROF_BUYER_002",
        "user_id": "buyer_crpatna_apmc",
        "role": "buyer",
        "full_name": "B. M. Shivakumar (Lead Purchaser)",
        "phone": "08176-252110",
        "email": "apmc.crpatna@karnataka.gov.in",
        "state": "Karnataka",
        "district": "Hassan",
        "village_or_town": "Channarayapatna APMC Yard",
        "business_name": "Channarayapatna Regulated Market",
        "kisan_card_or_gst": "APMC-LIC-KA-CRP-04",
        "is_verified": True
    },
    {
        "profile_id": "PROF_BUYER_003",
        "user_id": "buyer_mysore_apmc",
        "role": "buyer",
        "full_name": "H. G. Manjunath (Superintendent)",
        "phone": "0821-2480350",
        "email": "apmc.mysore@karnataka.gov.in",
        "state": "Karnataka",
        "district": "Mysore",
        "village_or_town": "Bandipalya Market",
        "business_name": "Mysore Bandipalya Wholesale Exchange",
        "kisan_card_or_gst": "APMC-LIC-KA-MYS-12",
        "is_verified": True
    },
    {
        "profile_id": "PROF_BUYER_004",
        "user_id": "buyer_agrocorp",
        "role": "buyer",
        "full_name": "Rajesh Singhania (Procurement Head)",
        "phone": "+91 98200 12345",
        "email": "r.singhania@agrocorp.in",
        "state": "Karnataka",
        "district": "Bengaluru Urban",
        "village_or_town": "Yeshwanthpur Industrial Suburb",
        "business_name": "AgroCorp India Processing Ltd",
        "kisan_card_or_gst": "29AAACA1234F1Z5",
        "is_verified": True
    },
    {
        "profile_id": "PROF_BUYER_005",
        "user_id": "buyer_ka_exports",
        "role": "buyer",
        "full_name": "Anand Kothari (Managing Partner)",
        "phone": "+91 98450 67890",
        "email": "anand@kafoodexports.com",
        "state": "Karnataka",
        "district": "Bengaluru Urban",
        "village_or_town": "K.R. Market Wholesale Hub",
        "business_name": "Karnataka Wholesale Food Exporters",
        "kisan_card_or_gst": "29AAEFK5678B1Z2",
        "is_verified": True
    }
]

PRODUCE_LISTINGS_DATA = [
    {
        "listing_id": "LST_TOMATO_001",
        "farmer_id": "usr_chethan",
        "farmer_name": "Chethan Patel",
        "farmer_phone": "+91 98765 43210",
        "crop_name": "Tomato",
        "variety": "Hybrid Shivam / Vaishnavi",
        "available_quantity": 50.0,
        "initial_quantity": 50.0,
        "quantity_unit": "Quintals",
        "expected_price": 1450.0,
        "state": "Karnataka",
        "district": "Hassan",
        "village_or_town": "Sakleshpur",
        "pickup_address": "Survey 42, Kadamane Estate Road, Sakleshpur Taluk",
        "harvest_date": "2026-10-25",
        "quality_grade": "Grade A / Fair Average",
        "listing_status": "ACTIVE",
        "description": "Naturally ripened, firm field tomatoes. Hand-picked at dawn, sorted for export and wholesale mandi standard.",
        "photo_url": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop"
    },
    {
        "listing_id": "LST_ONION_002",
        "farmer_id": "usr_suresh",
        "farmer_name": "Suresh Gowda",
        "farmer_phone": "+91 94481 22334",
        "crop_name": "Onion",
        "variety": "Bangalore Rose / Nasik Red",
        "available_quantity": 80.0,
        "initial_quantity": 80.0,
        "quantity_unit": "Quintals",
        "expected_price": 1600.0,
        "state": "Karnataka",
        "district": "Hassan",
        "village_or_town": "Channarayapatna",
        "pickup_address": "Byrapura Road Farm 3, Channarayapatna",
        "harvest_date": "2026-10-22",
        "quality_grade": "Grade A / Export Quality",
        "listing_status": "ACTIVE",
        "description": "Double skin, cured medium-to-large bulbs. Low moisture content, ideal for storage and long-distance transport.",
        "photo_url": "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600&auto=format&fit=crop"
    },
    {
        "listing_id": "LST_GINGER_003",
        "farmer_id": "usr_chethan",
        "farmer_name": "Chethan Patel",
        "farmer_phone": "+91 98765 43210",
        "crop_name": "Ginger",
        "variety": "Himachal Fresh / Rio de Janeiro",
        "available_quantity": 35.0,
        "initial_quantity": 40.0,
        "quantity_unit": "Quintals",
        "expected_price": 4500.0,
        "state": "Karnataka",
        "district": "Hassan",
        "village_or_town": "Sakleshpur",
        "pickup_address": "Plot 7, Hanbal Road, Sakleshpur",
        "harvest_date": "2026-10-20",
        "quality_grade": "Grade A / Organic Certified",
        "listing_status": "PARTIALLY_FULFILLED",
        "description": "Shade-grown aromatic hill ginger with bold rhizomes. Clean washed, high oleoresin and gingerol percentage.",
        "photo_url": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop"
    },
    {
        "listing_id": "LST_POTATO_004",
        "farmer_id": "usr_manjunath",
        "farmer_name": "Manjunath K",
        "farmer_phone": "+91 98452 77889",
        "crop_name": "Potato",
        "variety": "Kufri Jyoti / Chipsona",
        "available_quantity": 120.0,
        "initial_quantity": 120.0,
        "quantity_unit": "Quintals",
        "expected_price": 1350.0,
        "state": "Karnataka",
        "district": "Mysore",
        "village_or_town": "Hunsur",
        "pickup_address": "Kallahalli Gate, Hunsur-Mysore Highway",
        "harvest_date": "2026-10-24",
        "quality_grade": "Grade A / Processing Grade",
        "listing_status": "ACTIVE",
        "description": "High-starch grading tubers, free from greening and blight. Packed in 50 kg ventilated jute sacks.",
        "photo_url": "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop"
    },
    {
        "listing_id": "LST_CHILLI_005",
        "farmer_id": "usr_ramesh",
        "farmer_name": "Ramesh Patil",
        "farmer_phone": "+91 99803 55667",
        "crop_name": "Green Chilli",
        "variety": "G4 / Teja Super Hot",
        "available_quantity": 25.0,
        "initial_quantity": 25.0,
        "quantity_unit": "Quintals",
        "expected_price": 2800.0,
        "state": "Karnataka",
        "district": "Belagavi",
        "village_or_town": "Athani",
        "pickup_address": "Athani Rural Post, Shedbal Road",
        "harvest_date": "2026-10-26",
        "quality_grade": "Grade A / Pungent Grade",
        "listing_status": "ACTIVE",
        "description": "Crisp deep green uniform chillies. Picked within 24 hours, pre-cooled and crated for fresh mandi delivery.",
        "photo_url": "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=600&auto=format&fit=crop"
    },
    {
        "listing_id": "LST_RAGI_006",
        "farmer_id": "usr_devendrappa",
        "farmer_name": "Devendrappa B",
        "farmer_phone": "+91 97410 99881",
        "crop_name": "Ragi",
        "variety": "GPU-28 / MR-1 Finger Millet",
        "available_quantity": 150.0,
        "initial_quantity": 150.0,
        "quantity_unit": "Quintals",
        "expected_price": 3200.0,
        "state": "Karnataka",
        "district": "Davanagere",
        "village_or_town": "Harihar",
        "pickup_address": "Amaravathi Colony Cross, Harihar",
        "harvest_date": "2026-10-18",
        "quality_grade": "Grade FAQ / Clean Machine-Dressed",
        "listing_status": "ACTIVE",
        "description": "Double-winnowed dry finger millet, moisture under 10.5%. Rich nutritional density, organic cultivation practices.",
        "photo_url": "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop"
    },
    {
        "listing_id": "LST_MAIZE_007",
        "farmer_id": "usr_suresh",
        "farmer_name": "Suresh Gowda",
        "farmer_phone": "+91 94481 22334",
        "crop_name": "Maize",
        "variety": "DeKalb Super 900M",
        "available_quantity": 200.0,
        "initial_quantity": 200.0,
        "quantity_unit": "Quintals",
        "expected_price": 2150.0,
        "state": "Karnataka",
        "district": "Hassan",
        "village_or_town": "Channarayapatna",
        "pickup_address": "NH-75 Service Road, Channarayapatna Rural",
        "harvest_date": "2026-10-23",
        "quality_grade": "Grade A / Feed & Starch Industry",
        "listing_status": "ACTIVE",
        "description": "Sun-dried golden yellow kernels, test weight > 72 kg/hl. Negligible broken grain percentage.",
        "photo_url": "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=600&auto=format&fit=crop"
    }
]

PURCHASE_ENQUIRIES_DATA = [
    {
        "enquiry_id": "ENQ_TOMATO_001",
        "buyer_id": "buyer_hassan_apmc",
        "buyer_name": "Dr. S. K. Ramesh (Secretary)",
        "buyer_phone": "08172-268420",
        "buyer_company": "Hassan APMC Procurement Yard",
        "listing_id": "LST_TOMATO_001",
        "requested_quantity": 20.0,
        "offered_price": 1400.0,
        "enquiry_status": "SUBMITTED",
        "message": "Ready to lift 20 quintals tomorrow morning for APMC daily wholesale trading. We provide direct digital weighing.",
        "farmer_response_note": "Farmer reviewing offer schedule."
    },
    {
        "enquiry_id": "ENQ_GINGER_002",
        "buyer_id": "buyer_agrocorp",
        "buyer_name": "Rajesh Singhania (Procurement Head)",
        "buyer_phone": "+91 98200 12345",
        "buyer_company": "AgroCorp India Processing Ltd",
        "listing_id": "LST_GINGER_003",
        "requested_quantity": 5.0,
        "offered_price": 4500.0,
        "enquiry_status": "ACCEPTED",
        "message": "Urgent requirement for spice processing plant. Will dispatch refrigerated container vehicle upon confirmation.",
        "farmer_response_note": "Offer accepted! Farm gate pickup scheduled."
    },
    {
        "enquiry_id": "ENQ_ONION_003",
        "buyer_id": "buyer_crpatna_apmc",
        "buyer_name": "B. M. Shivakumar (Lead Purchaser)",
        "buyer_phone": "08176-252110",
        "buyer_company": "Channarayapatna Regulated Market",
        "listing_id": "LST_ONION_002",
        "requested_quantity": 40.0,
        "offered_price": 1580.0,
        "enquiry_status": "SUBMITTED",
        "message": "Requesting 40 quintals for wholesale auction. Quality inspection scheduled at yard.",
        "farmer_response_note": "Awaiting final lot inspection."
    },
    {
        "enquiry_id": "ENQ_POTATO_004",
        "buyer_id": "buyer_ka_exports",
        "buyer_name": "Anand Kothari (Managing Partner)",
        "buyer_phone": "+91 98450 67890",
        "buyer_company": "Karnataka Wholesale Food Exporters",
        "listing_id": "LST_POTATO_004",
        "requested_quantity": 60.0,
        "offered_price": 1320.0,
        "enquiry_status": "SUBMITTED",
        "message": "Export shipment batch scheduled for next week. Direct farm pickup arranged with dedicated truck.",
        "farmer_response_note": "Awaiting farmer verification."
    }
]

# =====================================================================
# SEEDING FUNCTIONS
# =====================================================================

def init_sqlite_tables(conn: sqlite3.Connection):
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


def seed_sqlite(conn: sqlite3.Connection):
    init_sqlite_tables(conn)
    cur = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()

    # 1. Profiles
    for p in MARKETPLACE_PROFILES_DATA:
        cur.execute("""
            INSERT INTO MARKETPLACE_PROFILES (
                profile_id, user_id, role, full_name, phone, email, state, district,
                village_or_town, business_name, kisan_card_or_gst, is_verified, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(profile_id) DO UPDATE SET
                full_name=excluded.full_name,
                phone=excluded.phone,
                email=excluded.email,
                district=excluded.district,
                village_or_town=excluded.village_or_town,
                business_name=excluded.business_name,
                kisan_card_or_gst=excluded.kisan_card_or_gst,
                updated_at=excluded.updated_at
        """, (
            p["profile_id"], p["user_id"], p["role"], p["full_name"], p["phone"], p["email"],
            p["state"], p["district"], p["village_or_town"], p["business_name"], p["kisan_card_or_gst"],
            1 if p["is_verified"] else 0, now_iso, now_iso
        ))

    # 2. Listings
    for l in PRODUCE_LISTINGS_DATA:
        cur.execute("""
            INSERT INTO PRODUCE_LISTINGS (
                listing_id, farmer_id, farmer_name, farmer_phone, crop_name, variety,
                available_quantity, initial_quantity, quantity_unit, expected_price,
                state, district, village_or_town, pickup_address, harvest_date,
                quality_grade, listing_status, description, photo_url, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(listing_id) DO UPDATE SET
                farmer_name=excluded.farmer_name,
                farmer_phone=excluded.farmer_phone,
                crop_name=excluded.crop_name,
                variety=excluded.variety,
                available_quantity=excluded.available_quantity,
                expected_price=excluded.expected_price,
                district=excluded.district,
                listing_status=excluded.listing_status,
                description=excluded.description,
                photo_url=excluded.photo_url,
                updated_at=excluded.updated_at
        """, (
            l["listing_id"], l["farmer_id"], l["farmer_name"], l["farmer_phone"], l["crop_name"],
            l["variety"], l["available_quantity"], l["initial_quantity"], l["quantity_unit"],
            l["expected_price"], l["state"], l["district"], l["village_or_town"], l["pickup_address"],
            l["harvest_date"], l["quality_grade"], l["listing_status"], l["description"],
            l["photo_url"], now_iso, now_iso
        ))

    # 3. Enquiries
    for e in PURCHASE_ENQUIRIES_DATA:
        cur.execute("""
            INSERT INTO PURCHASE_ENQUIRIES (
                enquiry_id, buyer_id, buyer_name, buyer_phone, buyer_company,
                listing_id, requested_quantity, offered_price, enquiry_status,
                message, farmer_response_note, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(enquiry_id) DO UPDATE SET
                requested_quantity=excluded.requested_quantity,
                offered_price=excluded.offered_price,
                enquiry_status=excluded.enquiry_status,
                message=excluded.message,
                farmer_response_note=excluded.farmer_response_note,
                updated_at=excluded.updated_at
        """, (
            e["enquiry_id"], e["buyer_id"], e["buyer_name"], e["buyer_phone"], e["buyer_company"],
            e["listing_id"], e["requested_quantity"], e["offered_price"], e["enquiry_status"],
            e["message"], e["farmer_response_note"], now_iso, now_iso
        ))

    conn.commit()
    logger.info("Local SQLite marketplace tables initialized and seeded successfully.")


def seed_snowflake_live():
    """Idempotently seeds live Snowflake tables using MERGE or existence check."""
    logger.info(f"Targeting Snowflake connection (Mode: {snowflake_manager.mode})...")

    # 1. Create tables in Snowflake if not present
    ddl_profiles = """
    CREATE TABLE IF NOT EXISTS FARMPRICE_DB.AGRICULTURE.MARKETPLACE_PROFILES (
        profile_id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) UNIQUE NOT NULL,
        role VARCHAR(30) NOT NULL,
        full_name VARCHAR(150) NOT NULL,
        phone VARCHAR(30) NOT NULL,
        email VARCHAR(150),
        state VARCHAR(100) DEFAULT 'Karnataka',
        district VARCHAR(100) NOT NULL,
        village_or_town VARCHAR(150),
        business_name VARCHAR(200),
        kisan_card_or_gst VARCHAR(100),
        is_verified BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
        updated_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
    )
    """

    ddl_listings = """
    CREATE TABLE IF NOT EXISTS FARMPRICE_DB.AGRICULTURE.PRODUCE_LISTINGS (
        listing_id VARCHAR(64) PRIMARY KEY,
        farmer_id VARCHAR(64) NOT NULL,
        farmer_name VARCHAR(150) NOT NULL,
        farmer_phone VARCHAR(30) NOT NULL,
        crop_name VARCHAR(100) NOT NULL,
        variety VARCHAR(100) DEFAULT 'Standard / Hybrid',
        available_quantity NUMBER(12, 2) NOT NULL,
        initial_quantity NUMBER(12, 2) NOT NULL,
        quantity_unit VARCHAR(30) DEFAULT 'Quintals',
        expected_price NUMBER(10, 2) NOT NULL,
        state VARCHAR(100) DEFAULT 'Karnataka',
        district VARCHAR(100) NOT NULL,
        village_or_town VARCHAR(150) NOT NULL,
        pickup_address VARCHAR(255),
        harvest_date DATE NOT NULL,
        quality_grade VARCHAR(80) DEFAULT 'Grade A / Fair Average',
        listing_status VARCHAR(50) DEFAULT 'ACTIVE',
        description VARCHAR(1000),
        photo_url VARCHAR(500),
        created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
        updated_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
    )
    """

    ddl_enquiries = """
    CREATE TABLE IF NOT EXISTS FARMPRICE_DB.AGRICULTURE.PURCHASE_ENQUIRIES (
        enquiry_id VARCHAR(64) PRIMARY KEY,
        buyer_id VARCHAR(64) NOT NULL,
        buyer_name VARCHAR(150) NOT NULL,
        buyer_phone VARCHAR(30) NOT NULL,
        buyer_company VARCHAR(200),
        listing_id VARCHAR(64) NOT NULL,
        requested_quantity NUMBER(12, 2) NOT NULL,
        offered_price NUMBER(10, 2) NOT NULL,
        enquiry_status VARCHAR(50) DEFAULT 'SUBMITTED',
        message VARCHAR(1000),
        farmer_response_note VARCHAR(1000),
        created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
        updated_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
    )
    """

    snowflake_manager.execute_query(ddl_profiles)
    snowflake_manager.execute_query(ddl_listings)
    snowflake_manager.execute_query(ddl_enquiries)

    # 2. Seed Profiles idempotently
    for p in MARKETPLACE_PROFILES_DATA:
        exists = snowflake_manager.execute_query(
            "SELECT profile_id FROM FARMPRICE_DB.AGRICULTURE.MARKETPLACE_PROFILES WHERE profile_id = ?",
            (p["profile_id"],)
        )
        if exists:
            snowflake_manager.execute_query("""
                UPDATE FARMPRICE_DB.AGRICULTURE.MARKETPLACE_PROFILES
                SET full_name = ?, phone = ?, email = ?, district = ?, village_or_town = ?,
                    business_name = ?, kisan_card_or_gst = ?, updated_at = CURRENT_TIMESTAMP()
                WHERE profile_id = ?
            """, (
                p["full_name"], p["phone"], p["email"], p["district"], p["village_or_town"],
                p["business_name"], p["kisan_card_or_gst"], p["profile_id"]
            ))
        else:
            snowflake_manager.execute_query("""
                INSERT INTO FARMPRICE_DB.AGRICULTURE.MARKETPLACE_PROFILES (
                    profile_id, user_id, role, full_name, phone, email, state, district,
                    village_or_town, business_name, kisan_card_or_gst, is_verified
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                p["profile_id"], p["user_id"], p["role"], p["full_name"], p["phone"], p["email"],
                p["state"], p["district"], p["village_or_town"], p["business_name"], p["kisan_card_or_gst"],
                p["is_verified"]
            ))

    # 3. Seed Listings idempotently
    for l in PRODUCE_LISTINGS_DATA:
        exists = snowflake_manager.execute_query(
            "SELECT listing_id FROM FARMPRICE_DB.AGRICULTURE.PRODUCE_LISTINGS WHERE listing_id = ?",
            (l["listing_id"],)
        )
        if exists:
            snowflake_manager.execute_query("""
                UPDATE FARMPRICE_DB.AGRICULTURE.PRODUCE_LISTINGS
                SET farmer_name = ?, farmer_phone = ?, crop_name = ?, variety = ?,
                    available_quantity = ?, expected_price = ?, district = ?,
                    listing_status = ?, description = ?, photo_url = ?, updated_at = CURRENT_TIMESTAMP()
                WHERE listing_id = ?
            """, (
                l["farmer_name"], l["farmer_phone"], l["crop_name"], l["variety"],
                l["available_quantity"], l["expected_price"], l["district"],
                l["listing_status"], l["description"], l["photo_url"], l["listing_id"]
            ))
        else:
            snowflake_manager.execute_query("""
                INSERT INTO FARMPRICE_DB.AGRICULTURE.PRODUCE_LISTINGS (
                    listing_id, farmer_id, farmer_name, farmer_phone, crop_name, variety,
                    available_quantity, initial_quantity, quantity_unit, expected_price,
                    state, district, village_or_town, pickup_address, harvest_date,
                    quality_grade, listing_status, description, photo_url
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                l["listing_id"], l["farmer_id"], l["farmer_name"], l["farmer_phone"], l["crop_name"],
                l["variety"], l["available_quantity"], l["initial_quantity"], l["quantity_unit"],
                l["expected_price"], l["state"], l["district"], l["village_or_town"], l["pickup_address"],
                l["harvest_date"], l["quality_grade"], l["listing_status"], l["description"],
                l["photo_url"]
            ))

    # 4. Seed Enquiries idempotently
    for e in PURCHASE_ENQUIRIES_DATA:
        exists = snowflake_manager.execute_query(
            "SELECT enquiry_id FROM FARMPRICE_DB.AGRICULTURE.PURCHASE_ENQUIRIES WHERE enquiry_id = ?",
            (e["enquiry_id"],)
        )
        if exists:
            snowflake_manager.execute_query("""
                UPDATE FARMPRICE_DB.AGRICULTURE.PURCHASE_ENQUIRIES
                SET requested_quantity = ?, offered_price = ?, enquiry_status = ?,
                    message = ?, farmer_response_note = ?, updated_at = CURRENT_TIMESTAMP()
                WHERE enquiry_id = ?
            """, (
                e["requested_quantity"], e["offered_price"], e["enquiry_status"],
                e["message"], e["farmer_response_note"], e["enquiry_id"]
            ))
        else:
            snowflake_manager.execute_query("""
                INSERT INTO FARMPRICE_DB.AGRICULTURE.PURCHASE_ENQUIRIES (
                    enquiry_id, buyer_id, buyer_name, buyer_phone, buyer_company,
                    listing_id, requested_quantity, offered_price, enquiry_status,
                    message, farmer_response_note
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                e["enquiry_id"], e["buyer_id"], e["buyer_name"], e["buyer_phone"], e["buyer_company"],
                e["listing_id"], e["requested_quantity"], e["offered_price"], e["enquiry_status"],
                e["message"], e["farmer_response_note"]
            ))

    logger.info("Live Snowflake marketplace tables verified and seeded successfully.")


def verify_counts():
    """Verify row counts across both Snowflake and Local SQLite."""
    print("\n" + "=" * 60)
    print("VERIFYING MARKETPLACE DATA COUNTS")
    print("=" * 60)

    # Snowflake
    try:
        sf_profiles = snowflake_manager.execute_query("SELECT COUNT(*) AS c FROM FARMPRICE_DB.AGRICULTURE.MARKETPLACE_PROFILES")[0].get("c", 0)
        sf_listings = snowflake_manager.execute_query("SELECT COUNT(*) AS c FROM FARMPRICE_DB.AGRICULTURE.PRODUCE_LISTINGS")[0].get("c", 0)
        sf_enquiries = snowflake_manager.execute_query("SELECT COUNT(*) AS c FROM FARMPRICE_DB.AGRICULTURE.PURCHASE_ENQUIRIES")[0].get("c", 0)
        print(f"[Snowflake Mode: {snowflake_manager.mode}]")
        print(f"  • MARKETPLACE_PROFILES : {sf_profiles} rows")
        print(f"  • PRODUCE_LISTINGS     : {sf_listings} rows")
        print(f"  • PURCHASE_ENQUIRIES   : {sf_enquiries} rows")
    except Exception as e:
        print(f"[Snowflake Verification Note]: {e}")

    # SQLite
    try:
        conn = sqlite3.connect(LOCAL_DB_PATH)
        cur = conn.cursor()
        sq_profiles = cur.execute("SELECT COUNT(*) FROM MARKETPLACE_PROFILES").fetchone()[0]
        sq_listings = cur.execute("SELECT COUNT(*) FROM PRODUCE_LISTINGS").fetchone()[0]
        sq_enquiries = cur.execute("SELECT COUNT(*) FROM PURCHASE_ENQUIRIES").fetchone()[0]
        conn.close()
        print(f"[SQLite Mirror: {LOCAL_DB_PATH}]")
        print(f"  • MARKETPLACE_PROFILES : {sq_profiles} rows")
        print(f"  • PRODUCE_LISTINGS     : {sq_listings} rows")
        print(f"  • PURCHASE_ENQUIRIES   : {sq_enquiries} rows")
    except Exception as e:
        print(f"[SQLite Verification Note]: {e}")
    print("=" * 60 + "\n")


def run_migration():
    logger.info("Starting FARMPRICE AI Marketplace Snowflake Integration...")

    # Seed local SQLite mirror
    conn = sqlite3.connect(LOCAL_DB_PATH)
    try:
        seed_sqlite(conn)
    finally:
        conn.close()

    # Seed live Snowflake
    try:
        seed_snowflake_live()
    except Exception as e:
        logger.error(f"Error seeding live Snowflake: {e}")
        raise e

    verify_counts()


if __name__ == "__main__":
    run_migration()
