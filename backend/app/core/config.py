import os
from pydantic import BaseModel
from dotenv import load_dotenv

# Load .env if present
load_dotenv()

class Settings(BaseModel):
    app_env: str = os.getenv("APP_ENV", "development")
    app_port: int = int(os.getenv("APP_PORT", "8000"))
    app_host: str = os.getenv("APP_HOST", "0.0.0.0")
    cors_origins: list[str] = [
        origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173").split(",")
    ]
    
    # Snowflake Configuration
    snowflake_use_local_fallback: bool = os.getenv("SNOWFLAKE_USE_LOCAL_FALLBACK", "true").lower() in ("true", "1", "t")
    snowflake_account: str = os.getenv("SNOWFLAKE_ACCOUNT", "mdsfbiq-cr91823")
    snowflake_user: str = os.getenv("SNOWFLAKE_USER", "")
    snowflake_password: str = os.getenv("SNOWFLAKE_PASSWORD", "")
    snowflake_warehouse: str = os.getenv("SNOWFLAKE_WAREHOUSE", "FARMPRICE_WH")
    snowflake_database: str = os.getenv("SNOWFLAKE_DATABASE", "FARMPRICE_DB")
    snowflake_schema: str = os.getenv("SNOWFLAKE_SCHEMA", "AGRICULTURE")
    snowflake_role: str = os.getenv("SNOWFLAKE_ROLE", "ACCOUNTADMIN")

    # AGMARKNET & Open Government Data (data.gov.in) Configuration
    data_gov_in_api_key: str = os.getenv("DATA_GOV_IN_API_KEY", os.getenv("AGMARKNET_API_KEY", ""))
    data_gov_in_base_url: str = os.getenv(
        "DATA_GOV_IN_BASE_URL", 
        os.getenv("AGMARKNET_BASE_URL", "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070")
    )
    agmarknet_resource_id: str = os.getenv("AGMARKNET_RESOURCE_ID", "9ef84268-d588-465a-a308-a864a43d0070")
    sync_interval_minutes: int = int(os.getenv("SYNC_INTERVAL_MINUTES", "60"))

    # Calculation defaults
    default_transport_per_km_per_q: float = float(os.getenv("DEFAULT_TRANSPORT_PER_KM_PER_QUINTAL", "0.85"))
    default_loading_unloading_per_q: float = float(os.getenv("DEFAULT_LOADING_UNLOADING_PER_QUINTAL", "8.0"))
    default_market_cess_percent: float = float(os.getenv("DEFAULT_MARKET_CESS_PERCENT", "1.5"))

settings = Settings()


def get_local_db_path() -> str:
    """
    Returns absolute path to local SQLite database mirror.
    In serverless or read-only environments (e.g. Vercel, AWS Lambda),
    copies the pre-seeded repository database to a writable /tmp directory
    so that SQLite write operations and WAL journals succeed.
    """
    from pathlib import Path
    import tempfile
    import shutil

    base_dir = Path(__file__).resolve().parent.parent.parent
    repo_db = base_dir / "snowflake" / "farmprice_local.db"

    is_serverless = bool(os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"))
    if is_serverless:
        tmp_db = Path(tempfile.gettempdir()) / "farmprice_local.db"
        if not tmp_db.exists() and repo_db.exists():
            try:
                shutil.copy2(str(repo_db), str(tmp_db))
            except Exception:
                return str(repo_db)
        if tmp_db.exists():
            return str(tmp_db)
    return str(repo_db)


def get_uploads_dir() -> str:
    """
    Returns directory for uploaded files (avatars, reports, exports).
    Uses /tmp in serverless environments to prevent read-only filesystem errors.
    """
    import tempfile

    is_serverless = bool(os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"))
    if is_serverless:
        target = os.path.join(tempfile.gettempdir(), "farmprice_uploads")
    else:
        target = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads")

    try:
        os.makedirs(target, exist_ok=True)
        os.makedirs(os.path.join(target, "avatars"), exist_ok=True)
    except Exception:
        target = os.path.join(tempfile.gettempdir(), "farmprice_uploads")
        os.makedirs(target, exist_ok=True)
        os.makedirs(os.path.join(target, "avatars"), exist_ok=True)
    return target

