import io
import os
import pytest
from PIL import Image
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.photo_storage_service import UPLOAD_DIR

client = TestClient(app)

def create_test_image(format="JPEG", size=(300, 300), color=(16, 185, 129)) -> bytes:
    """Helper to generate valid in-memory image bytes."""
    buf = io.BytesIO()
    img = Image.new("RGB", size, color=color)
    img.save(buf, format=format)
    return buf.getvalue()

def test_upload_valid_jpeg_profile_photo():
    """Verify valid JPEG profile photo upload, 512x512 WebP processing, and persistence."""
    img_bytes = create_test_image(format="JPEG", size=(400, 300), color=(5, 150, 105))
    
    files = {"file": ("avatar.jpg", img_bytes, "image/jpeg")}
    response = client.post("/api/user/profile-photo", files=files)
    
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["status"] == "SUCCESS"
    assert "data" in res_data
    assert "avatar_url" in res_data["data"]
    
    avatar_url = res_data["data"]["avatar_url"]
    assert avatar_url.startswith("/uploads/avatars/avatar_usr_chethan_")
    assert avatar_url.endswith(".webp") or "?t=" in avatar_url

    # Verify profile endpoint returns new avatar_url
    prof_res = client.get("/api/user/profile")
    assert prof_res.status_code == 200
    assert prof_res.json()["data"]["avatar_url"] == avatar_url

    # Verify static file is actually served via FastAPI static mount
    clean_url = avatar_url.split("?")[0]
    file_res = client.get(clean_url)
    assert file_res.status_code == 200
    assert file_res.headers["content-type"] in ("image/webp", "application/octet-stream")

def test_replace_profile_photo_cleans_up_orphaned_file():
    """Verify replacing an existing profile photo removes previous file on disk."""
    # First upload
    first_bytes = create_test_image(format="PNG", size=(250, 250), color=(37, 99, 235))
    res1 = client.post("/api/user/profile-photo", files={"file": ("first.png", first_bytes, "image/png")})
    assert res1.status_code == 200
    first_url = res1.json()["data"]["avatar_url"]
    first_filename = first_url.split("/uploads/avatars/")[1].split("?")[0]
    first_path = os.path.join(UPLOAD_DIR, first_filename)
    assert os.path.exists(first_path)

    # Second upload (replacement)
    second_bytes = create_test_image(format="JPEG", size=(350, 350), color=(217, 119, 6))
    res2 = client.post("/api/user/profile-photo", files={"file": ("second.jpg", second_bytes, "image/jpeg")})
    assert res2.status_code == 200
    second_url = res2.json()["data"]["avatar_url"]
    second_filename = second_url.split("/uploads/avatars/")[1].split("?")[0]
    second_path = os.path.join(UPLOAD_DIR, second_filename)

    # First file should be deleted, second file must exist
    assert not os.path.exists(first_path), "Old avatar file was not cleaned up!"
    assert os.path.exists(second_path), "New avatar file was not saved!"
    assert first_url != second_url

def test_remove_profile_photo():
    """Verify deleting profile photo removes disk file and resets avatar_url to None."""
    # Ensure a photo exists
    img_bytes = create_test_image(format="JPEG", size=(200, 200))
    res_upload = client.post("/api/user/profile-photo", files={"file": ("to_remove.jpg", img_bytes, "image/jpeg")})
    assert res_upload.status_code == 200
    uploaded_url = res_upload.json()["data"]["avatar_url"]
    filename = uploaded_url.split("/uploads/avatars/")[1].split("?")[0]
    file_path = os.path.join(UPLOAD_DIR, filename)
    assert os.path.exists(file_path)

    # Call DELETE endpoint
    del_res = client.delete("/api/user/profile-photo")
    assert del_res.status_code == 200
    del_data = del_res.json()
    assert del_data["status"] == "SUCCESS"
    assert del_data["data"]["avatar_url"] is None

    # Check file removed from disk
    assert not os.path.exists(file_path), "Avatar file was not removed from storage upon deletion!"

    # Verify profile state in database has avatar_url = None and valid initials
    prof_res = client.get("/api/user/profile")
    assert prof_res.status_code == 200
    assert prof_res.json()["data"]["avatar_url"] is None
    assert prof_res.json()["data"]["avatar_initials"] is not None

def test_reject_corrupted_or_non_image_bytes():
    """Verify corrupted files or fake extensions are rejected by byte inspection."""
    corrupted_data = b"This is not a real image binary data at all. Just plain text."
    files = {"file": ("malicious_photo.jpg", corrupted_data, "image/jpeg")}
    res = client.post("/api/user/profile-photo", files=files)
    
    assert res.status_code == 400
    assert "Corrupted or invalid image file" in res.json()["detail"]

def test_reject_empty_file():
    """Verify 0-byte uploaded file is rejected with 400."""
    files = {"file": ("empty.png", b"", "image/png")}
    res = client.post("/api/user/profile-photo", files=files)
    assert res.status_code == 400
    assert "Uploaded file is empty" in res.json()["detail"]

def test_reject_oversized_file():
    """Verify files larger than 5 MB are rejected with descriptive message."""
    # 5.2 MB of dummy data
    oversized_data = b"A" * (int(5.2 * 1024 * 1024))
    files = {"file": ("huge.jpg", oversized_data, "image/jpeg")}
    res = client.post("/api/user/profile-photo", files=files)
    assert res.status_code == 400
    assert "exceeds maximum allowed size" in res.json()["detail"]


