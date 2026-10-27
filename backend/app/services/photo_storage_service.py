import os
import io
import time
import uuid
from typing import Dict, Any, Optional
from PIL import Image, ImageOps
from fastapi import HTTPException
from backend.app.core.config import get_uploads_dir
from backend.app.services.user_profile_service import user_profile_service

# Path to uploads directory (serverless-aware)
UPLOAD_DIR = os.path.join(get_uploads_dir(), "avatars")

MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}

class PhotoStorageService:
    """
    Manages secure disk storage, image validation, format normalization,
    resizing, and metadata association for user profile photos.
    """
    def __init__(self):
        os.makedirs(UPLOAD_DIR, exist_ok=True)

    def validate_and_process_image(self, file_bytes: bytes, original_filename: str) -> Image.Image:
        """
        Validates size, verifies magic bytes and internal image integrity,
        normalizes EXIF orientation, and returns a PIL Image.
        """
        if len(file_bytes) > MAX_FILE_SIZE_BYTES:
            size_mb = len(file_bytes) / (1024 * 1024)
            raise HTTPException(
                status_code=400,
                detail=f"Image size ({size_mb:.2f} MB) exceeds maximum allowed size of 5.0 MB."
            )

        if len(file_bytes) == 0:
            raise HTTPException(
                status_code=400,
                detail="Uploaded file is empty. Please choose a valid image."
            )

        # 1. Verify image integrity with PIL
        try:
            temp_stream = io.BytesIO(file_bytes)
            test_img = Image.open(temp_stream)
            detected_format = test_img.format
            test_img.verify()
        except Exception:
            raise HTTPException(
                status_code=400,
                detail="Corrupted or invalid image file. Please upload a valid JPEG, PNG, or WebP photo."
            )

        # 2. Re-open image for actual processing (verify() invalidates file pointer)
        img_stream = io.BytesIO(file_bytes)
        image = Image.open(img_stream)

        if detected_format not in ALLOWED_FORMATS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported format '{detected_format}'. Allowed formats are JPEG, PNG, and WebP."
            )

        # 3. Transpose according to EXIF orientation tag if present
        try:
            image = ImageOps.exif_transpose(image)
        except Exception:
            pass

        return image

    def save_profile_photo(self, user_id: str, file_bytes: bytes, original_filename: str) -> Dict[str, Any]:
        """
        Validates image, center-crops/resizes to 512x512 WebP avatar,
        deletes any previously stored file for the user, and persists reference in database.
        """
        image = self.validate_and_process_image(file_bytes, original_filename)

        # Square center crop
        w, h = image.size
        min_dim = min(w, h)
        left = (w - min_dim) // 2
        top = (h - min_dim) // 2
        right = left + min_dim
        bottom = top + min_dim
        cropped = image.crop((left, top, right, bottom))

        # High-resolution thumbnail (512x512)
        resized = cropped.resize((512, 512), Image.Resampling.LANCZOS)

        # Convert to RGB if palette/RGBA for clean WebP conversion
        if resized.mode in ("RGBA", "P"):
            canvas = Image.new("RGBA", (512, 512), (255, 255, 255, 0))
            canvas.paste(resized, (0, 0), resized if resized.mode == "RGBA" else None)
            final_img = canvas
        else:
            final_img = resized.convert("RGB")

        # Clean up existing file on disk if any
        self._cleanup_old_avatar_file(user_id)

        # Generate unique cache-safe filename
        ts = int(time.time())
        token = uuid.uuid4().hex[:8]
        safe_filename = f"avatar_{user_id}_{ts}_{token}.webp"
        file_path = os.path.join(UPLOAD_DIR, safe_filename)

        # Save optimized WebP image
        final_img.save(file_path, format="WEBP", quality=88, method=6)

        # Relative URL served by FastAPI static files
        avatar_url = f"/uploads/avatars/{safe_filename}?t={ts}"

        # Update profile table in SQLite
        updated_profile = user_profile_service.update_avatar_url(user_id, avatar_url)

        return {
            "avatar_url": avatar_url,
            "filename": safe_filename,
            "size_bytes": os.path.getsize(file_path),
            "profile": updated_profile
        }

    def remove_profile_photo(self, user_id: str) -> Dict[str, Any]:
        """
        Removes saved avatar file on disk and clears avatar_url from database.
        """
        self._cleanup_old_avatar_file(user_id)
        updated_profile = user_profile_service.remove_avatar_url(user_id)
        return {
            "message": "Profile photo removed successfully. Initials restored.",
            "avatar_url": None,
            "profile": updated_profile
        }

    def _cleanup_old_avatar_file(self, user_id: str):
        """Safely removes existing avatar file on disk for user_id to prevent orphaned files."""
        try:
            profile = user_profile_service.get_profile(user_id)
            old_url = profile.get("avatar_url")
            if old_url and "/uploads/avatars/" in old_url:
                filename = old_url.split("/uploads/avatars/")[1].split("?")[0]
                old_path = os.path.join(UPLOAD_DIR, filename)
                if os.path.exists(old_path) and os.path.isfile(old_path):
                    os.remove(old_path)
        except Exception:
            pass

photo_storage_service = PhotoStorageService()
