import base64
import json
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException

from ..deps import get_current_user
from ..db import get_db
from ..models import UserPublic
from ..config import get_settings

router = APIRouter(prefix="/profile", tags=["profile"])

# Path to profile photos folder
PROFILE_PHOTOS_DIR = Path(__file__).resolve().parent.parent / "profilephotos"
PROFILE_PHOTOS_DIR.mkdir(parents=True, exist_ok=True)

# JSON file for storing profile photo paths (fallback if DB fails)
PROFILE_PHOTOS_JSON = PROFILE_PHOTOS_DIR / "profile_photos.json"


def load_profile_photos_json():
    """Load profile photos mapping from JSON file."""
    if PROFILE_PHOTOS_JSON.exists():
        try:
            with open(PROFILE_PHOTOS_JSON, "r") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def save_profile_photos_json(data):
    """Save profile photos mapping to JSON file."""
    try:
        with open(PROFILE_PHOTOS_JSON, "w") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Failed to save profile photos JSON: {e}")


@router.get("", response_model=UserPublic)
async def get_profile(current=Depends(get_current_user)):
    # Check if there's a profile photo in JSON fallback
    photos_data = load_profile_photos_json()
    user_id_str = str(current["_id"])
    if user_id_str in photos_data and not current.get("profile_photo"):
        current["profile_photo"] = photos_data[user_id_str]
    return UserPublic(**current)


@router.post("/photo")
async def upload_photo(file: UploadFile = File(...), current=Depends(get_current_user), db=Depends(get_db), settings=Depends(get_settings)):
    contents = await file.read()
    if len(contents) > 2_000_000:
        raise HTTPException(status_code=400, detail="Photo too large (max 2MB)")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}")
    
    # Generate unique filename
    user_id_str = str(current['_id'])
    timestamp = int(datetime.now(timezone.utc).timestamp())
    # Clean filename to remove special characters
    safe_filename = "".join(c for c in file.filename if c.isalnum() or c in "._-")
    filename = f"{user_id_str}_{timestamp}_{safe_filename}"
    
    # Save to profilephotos folder
    path = PROFILE_PHOTOS_DIR / filename
    try:
        with open(path, "wb") as f:
            f.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    photo_url = f"/profilephotos/{filename}"
    
    # Try to update database
    db_updated = False
    try:
        await db.users.update_one({"_id": current["_id"]}, {"$set": {"profile_photo": photo_url}})
        db_updated = True
    except Exception as e:
        print(f"Database update failed: {e}")
    
    # Also save to JSON as fallback
    photos_data = load_profile_photos_json()
    photos_data[user_id_str] = photo_url
    save_profile_photos_json(photos_data)
    
    current["profile_photo"] = photo_url
    return {
        "profile_photo": photo_url,
        "db_updated": db_updated,
        "message": "Profile photo uploaded successfully"
    }
