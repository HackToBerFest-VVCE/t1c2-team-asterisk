import os
import sqlite3
import time
import json
from typing import Dict, Any, List, Optional
from backend.app.core.config import settings, get_local_db_path

LOCAL_DB_PATH = get_local_db_path()

class UserProfileService:
    """
    Persistent repository for User Profiles, Preferences, Notification configurations,
    Active Sessions, and Help/Feedback submissions.
    """
    def __init__(self):
        self._init_tables()

    def _get_connection(self):
        os.makedirs(os.path.dirname(LOCAL_DB_PATH), exist_ok=True)
        conn = sqlite3.connect(LOCAL_DB_PATH, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_tables(self):
        conn = self._get_connection()
        cur = conn.cursor()

        # 1. User Profiles
        cur.execute("""
            CREATE TABLE IF NOT EXISTS USER_PROFILES (
                user_id TEXT PRIMARY KEY,
                full_name TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                avatar_initials TEXT DEFAULT 'CP',
                avatar_url TEXT,
                preferred_language TEXT DEFAULT 'en',
                state TEXT DEFAULT 'Karnataka',
                district TEXT DEFAULT 'Hassan',
                village_or_town TEXT DEFAULT 'Channarayapatna Hobli',
                role TEXT DEFAULT 'public',
                email_verified INTEGER DEFAULT 1,
                created_at TEXT,
                updated_at TEXT
            )
        """)

        # 2. User Preferences (Appearance, Accessibility, Application Defaults)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS USER_PREFERENCES (
                user_id TEXT PRIMARY KEY,
                theme TEXT DEFAULT 'system',
                accent_color TEXT DEFAULT '#113826',
                dashboard_density TEXT DEFAULT 'comfortable',
                reduced_motion INTEGER DEFAULT 0,
                font_size TEXT DEFAULT 'normal',
                high_contrast INTEGER DEFAULT 0,
                default_crop_id TEXT DEFAULT 'CROP_TOMATO',
                default_mandi_id TEXT DEFAULT 'MND_HASSAN',
                default_quantity REAL DEFAULT 50.0,
                default_quantity_unit TEXT DEFAULT 'quintals',
                default_chart_range TEXT DEFAULT '3months',
                max_recommendation_distance_km REAL DEFAULT 150.0,
                analytics_consent INTEGER DEFAULT 1,
                updated_at TEXT
            )
        """)

        # 3. Notification Configurations
        cur.execute("""
            CREATE TABLE IF NOT EXISTS USER_NOTIFICATIONS_CONFIG (
                user_id TEXT PRIMARY KEY,
                price_rise_alerts INTEGER DEFAULT 1,
                price_fall_alerts INTEGER DEFAULT 1,
                selected_crop_alerts INTEGER DEFAULT 1,
                favorite_mandi_updates INTEGER DEFAULT 1,
                data_refresh_alerts INTEGER DEFAULT 0,
                weekly_market_summary INTEGER DEFAULT 1,
                alert_threshold_pct REAL DEFAULT 5.0,
                preferred_delivery_channel TEXT DEFAULT 'in_app',
                quiet_hours_start TEXT DEFAULT '22:00',
                quiet_hours_end TEXT DEFAULT '06:00',
                sms_connected INTEGER DEFAULT 0,
                whatsapp_connected INTEGER DEFAULT 0,
                email_connected INTEGER DEFAULT 0,
                updated_at TEXT
            )
        """)

        # 4. Active Sessions
        cur.execute("""
            CREATE TABLE IF NOT EXISTS USER_ACTIVE_SESSIONS (
                session_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                device_info TEXT NOT NULL,
                ip_address TEXT DEFAULT '127.0.0.1',
                browser_agent TEXT,
                last_active_at TEXT,
                is_current INTEGER DEFAULT 0
            )
        """)

        # 5. User Feedback & Support Submissions
        cur.execute("""
            CREATE TABLE IF NOT EXISTS USER_FEEDBACK_SUBMISSIONS (
                feedback_id TEXT PRIMARY KEY,
                user_id TEXT,
                category TEXT NOT NULL,
                subject TEXT NOT NULL,
                message TEXT NOT NULL,
                contact_email TEXT,
                status TEXT DEFAULT 'RECEIVED',
                created_at TEXT
            )
        """)

        # Seed default profile if not exists
        cur.execute("SELECT COUNT(*) as c FROM USER_PROFILES WHERE user_id = 'usr_chethan'")
        if cur.fetchone()["c"] == 0:
            now_str = time.strftime("%Y-%m-%d %H:%M:%S UTC")
            cur.execute("""
                INSERT INTO USER_PROFILES (
                    user_id, full_name, email, phone, avatar_initials, preferred_language,
                    state, district, village_or_town, role, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                "usr_chethan", "Chethan P", "chethan@farmer.ai", "+91 98765 43210",
                "CP", "en", "Karnataka", "Hassan", "Channarayapatna Hobli", "public",
                now_str, now_str
            ))

            cur.execute("""
                INSERT INTO USER_PREFERENCES (
                    user_id, theme, accent_color, dashboard_density, reduced_motion,
                    font_size, high_contrast, default_crop_id, default_mandi_id,
                    default_quantity, default_quantity_unit, default_chart_range,
                    max_recommendation_distance_km, analytics_consent, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                "usr_chethan", "system", "#113826", "comfortable", 0,
                "normal", 0, "CROP_TOMATO", "MND_HASSAN",
                50.0, "quintals", "3months", 150.0, 1, now_str
            ))

            cur.execute("""
                INSERT INTO USER_NOTIFICATIONS_CONFIG (
                    user_id, price_rise_alerts, price_fall_alerts, selected_crop_alerts,
                    favorite_mandi_updates, data_refresh_alerts, weekly_market_summary,
                    alert_threshold_pct, preferred_delivery_channel, quiet_hours_start,
                    quiet_hours_end, sms_connected, whatsapp_connected, email_connected, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                "usr_chethan", 1, 1, 1, 1, 0, 1,
                5.0, "in_app", "22:00", "06:00", 0, 0, 0, now_str
            ))

            # Seed default sessions
            cur.execute("""
                INSERT INTO USER_ACTIVE_SESSIONS (session_id, user_id, device_info, ip_address, browser_agent, last_active_at, is_current)
                VALUES ('sess_curr_1', 'usr_chethan', 'Chrome (Windows Desktop)', '127.0.0.1 (Localhost)', 'Mozilla/5.0 Windows NT 10.0', ?, 1)
            """, (now_str,))
            cur.execute("""
                INSERT INTO USER_ACTIVE_SESSIONS (session_id, user_id, device_info, ip_address, browser_agent, last_active_at, is_current)
                VALUES ('sess_mob_2', 'usr_chethan', 'Android Mobile Chrome', '192.168.1.45 (Local WiFi)', 'Mozilla/5.0 Mobile Safari', 'Yesterday 18:30 UTC', 0)
            """)

        conn.commit()
        conn.close()

    def get_profile(self, user_id: str = "usr_chethan") -> Dict[str, Any]:
        conn = self._get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM USER_PROFILES WHERE user_id = ?", (user_id,))
        row = cur.fetchone()
        if not row:
            # Fallback to usr_chethan
            cur.execute("SELECT * FROM USER_PROFILES WHERE user_id = 'usr_chethan'")
            row = cur.fetchone()
        res = dict(row) if row else {}
        conn.close()
        return res

    def update_profile(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        conn = self._get_connection()
        cur = conn.cursor()
        now_str = time.strftime("%Y-%m-%d %H:%M:%S UTC")

        # Sanitize avatar initials from name
        name = data.get("full_name", "").strip() or "Chethan P"
        words = name.split()
        initials = (words[0][0] + (words[-1][0] if len(words) > 1 else "")).upper() if words else "CP"

        # Ensure user cannot arbitrarily escalate their role in profile update
        cur.execute("""
            UPDATE USER_PROFILES
            SET full_name = ?,
                email = ?,
                phone = ?,
                avatar_initials = ?,
                preferred_language = ?,
                state = ?,
                district = ?,
                village_or_town = ?,
                updated_at = ?
            WHERE user_id = ?
        """, (
            name,
            data.get("email"),
            data.get("phone"),
            initials,
            data.get("preferred_language", "en"),
            data.get("state", "Karnataka"),
            data.get("district", "Hassan"),
            data.get("village_or_town"),
            now_str,
            user_id
        ))

        conn.commit()
        conn.close()
        return self.get_profile(user_id)

    def get_preferences(self, user_id: str = "usr_chethan") -> Dict[str, Any]:
        conn = self._get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM USER_PREFERENCES WHERE user_id = ?", (user_id,))
        row = cur.fetchone()
        if not row:
            cur.execute("SELECT * FROM USER_PREFERENCES WHERE user_id = 'usr_chethan'")
            row = cur.fetchone()
        res = dict(row) if row else {}
        conn.close()
        return res

    def update_preferences(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        conn = self._get_connection()
        cur = conn.cursor()
        now_str = time.strftime("%Y-%m-%d %H:%M:%S UTC")

        cur.execute("""
            UPDATE USER_PREFERENCES
            SET theme = ?,
                accent_color = ?,
                dashboard_density = ?,
                reduced_motion = ?,
                font_size = ?,
                high_contrast = ?,
                default_crop_id = ?,
                default_mandi_id = ?,
                default_quantity = ?,
                default_quantity_unit = ?,
                default_chart_range = ?,
                max_recommendation_distance_km = ?,
                analytics_consent = ?,
                updated_at = ?
            WHERE user_id = ?
        """, (
            data.get("theme", "system"),
            data.get("accent_color", "#113826"),
            data.get("dashboard_density", "comfortable"),
            1 if data.get("reduced_motion") else 0,
            data.get("font_size", "normal"),
            1 if data.get("high_contrast") else 0,
            data.get("default_crop_id", "CROP_TOMATO"),
            data.get("default_mandi_id", "MND_HASSAN"),
            float(data.get("default_quantity", 50.0)),
            data.get("default_quantity_unit", "quintals"),
            data.get("default_chart_range", "3months"),
            float(data.get("max_recommendation_distance_km", 150.0)),
            1 if data.get("analytics_consent", True) else 0,
            now_str,
            user_id
        ))

        conn.commit()
        conn.close()
        return self.get_preferences(user_id)

    def get_notifications(self, user_id: str = "usr_chethan") -> Dict[str, Any]:
        conn = self._get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM USER_NOTIFICATIONS_CONFIG WHERE user_id = ?", (user_id,))
        row = cur.fetchone()
        if not row:
            cur.execute("SELECT * FROM USER_NOTIFICATIONS_CONFIG WHERE user_id = 'usr_chethan'")
            row = cur.fetchone()
        res = dict(row) if row else {}
        conn.close()
        return res

    def update_notifications(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        conn = self._get_connection()
        cur = conn.cursor()
        now_str = time.strftime("%Y-%m-%d %H:%M:%S UTC")

        cur.execute("""
            UPDATE USER_NOTIFICATIONS_CONFIG
            SET price_rise_alerts = ?,
                price_fall_alerts = ?,
                selected_crop_alerts = ?,
                favorite_mandi_updates = ?,
                data_refresh_alerts = ?,
                weekly_market_summary = ?,
                alert_threshold_pct = ?,
                preferred_delivery_channel = ?,
                quiet_hours_start = ?,
                quiet_hours_end = ?,
                updated_at = ?
            WHERE user_id = ?
        """, (
            1 if data.get("price_rise_alerts") else 0,
            1 if data.get("price_fall_alerts") else 0,
            1 if data.get("selected_crop_alerts") else 0,
            1 if data.get("favorite_mandi_updates") else 0,
            1 if data.get("data_refresh_alerts") else 0,
            1 if data.get("weekly_market_summary") else 0,
            float(data.get("alert_threshold_pct", 5.0)),
            data.get("preferred_delivery_channel", "in_app"),
            data.get("quiet_hours_start", "22:00"),
            data.get("quiet_hours_end", "06:00"),
            now_str,
            user_id
        ))

        conn.commit()
        conn.close()
        return self.get_notifications(user_id)

    def get_sessions(self, user_id: str = "usr_chethan") -> List[Dict[str, Any]]:
        conn = self._get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM USER_ACTIVE_SESSIONS WHERE user_id = ? ORDER BY is_current DESC", (user_id,))
        rows = cur.fetchall()
        res = [dict(r) for r in rows]
        conn.close()
        return res

    def terminate_other_sessions(self, user_id: str = "usr_chethan") -> int:
        conn = self._get_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM USER_ACTIVE_SESSIONS WHERE user_id = ? AND is_current = 0", (user_id,))
        count = cur.rowcount
        conn.commit()
        conn.close()
        return count

    def submit_feedback(self, user_id: str, category: str, subject: str, message: str, contact_email: Optional[str] = None) -> Dict[str, Any]:
        conn = self._get_connection()
        cur = conn.cursor()
        now_str = time.strftime("%Y-%m-%d %H:%M:%S UTC")
        fid = f"fbk_{int(time.time())}"
        cur.execute("""
            INSERT INTO USER_FEEDBACK_SUBMISSIONS (feedback_id, user_id, category, subject, message, contact_email, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'RECEIVED', ?)
        """, (fid, user_id, category, subject, message, contact_email, now_str))
        conn.commit()
        conn.close()
        return {
            "feedback_id": fid,
            "status": "RECEIVED",
            "message": "Thank you! Your feedback has been recorded in the FARMPRICE AI operations registry.",
            "submitted_at": now_str
        }

    def export_user_account_bundle(self, user_id: str = "usr_chethan") -> Dict[str, Any]:
        profile = self.get_profile(user_id)
        preferences = self.get_preferences(user_id)
        notifications = self.get_notifications(user_id)
        sessions = self.get_sessions(user_id)

        return {
            "application": "FARMPRICE AI",
            "export_timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC"),
            "data_retrieval_standard": "Digital Personal Data Protection Act (DPDPA 2023) Compliant",
            "user_profile": profile,
            "application_preferences": preferences,
            "notification_settings": notifications,
            "active_sessions": sessions
        }

    def delete_user_account(self, user_id: str = "usr_chethan") -> Dict[str, Any]:
        conn = self._get_connection()
        cur = conn.cursor()
        # Remove user data across tables
        cur.execute("DELETE FROM USER_PREFERENCES WHERE user_id = ?", (user_id,))
        cur.execute("DELETE FROM USER_NOTIFICATIONS_CONFIG WHERE user_id = ?", (user_id,))
        cur.execute("DELETE FROM USER_ACTIVE_SESSIONS WHERE user_id = ?", (user_id,))
        cur.execute("DELETE FROM USER_PROFILES WHERE user_id = ?", (user_id,))
        conn.commit()
        conn.close()
        return {
            "status": "DELETED",
            "message": "Account data purged successfully in compliance with privacy retention guidelines.",
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC")
        }

    def update_avatar_url(self, user_id: str, avatar_url: str) -> Dict[str, Any]:
        conn = self._get_connection()
        cur = conn.cursor()
        now_str = time.strftime("%Y-%m-%d %H:%M:%S UTC")
        cur.execute("""
            UPDATE USER_PROFILES
            SET avatar_url = ?,
                updated_at = ?
            WHERE user_id = ?
        """, (avatar_url, now_str, user_id))
        conn.commit()
        conn.close()
        return self.get_profile(user_id)

    def remove_avatar_url(self, user_id: str) -> Dict[str, Any]:
        conn = self._get_connection()
        cur = conn.cursor()
        now_str = time.strftime("%Y-%m-%d %H:%M:%S UTC")
        cur.execute("""
            UPDATE USER_PROFILES
            SET avatar_url = NULL,
                updated_at = ?
            WHERE user_id = ?
        """, (now_str, user_id))
        conn.commit()
        conn.close()
        return self.get_profile(user_id)

user_profile_service = UserProfileService()
