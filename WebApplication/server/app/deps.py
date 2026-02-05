from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from bson import ObjectId
from .db import get_db
from .auth import decode_token
from .config import get_settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
# optional OAuth scheme (does not auto-error when token absent)
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


async def get_current_user(token: str = Depends(oauth2_scheme), db=Depends(get_db)):
    payload = decode_token(token)
    user_id = payload.get("sub")
    jti = payload.get("jti")
    if not user_id or not jti:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    from pymongo.errors import PyMongoError
    from .config import get_settings
    import logging

    settings = get_settings()

    try:
        revoked = await db.revoked_tokens.find_one({"jti": jti})
    except PyMongoError as e:
        logging.exception("MongoDB error while checking revoked tokens")
        if settings.allow_db_offline_dev:
            logging.warning("DB unavailable — returning development fallback user")
            # Minimal dev user representation (avoid ObjectId dependency)
            return {"_id": None, "email": "dev@local", "dev": True}
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable")

    if revoked:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired or revoked")

    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except PyMongoError:
        logging.exception("MongoDB error while fetching user")
        if settings.allow_db_offline_dev:
            logging.warning("DB unavailable — returning development fallback user")
            return {"_id": None, "email": "dev@local", "dev": True}
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable")

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


async def get_current_user_optional(token: str = Depends(oauth2_scheme_optional), db=Depends(get_db)):
    """Optional authentication: returns user dict if valid token, otherwise None.

    This will swallow DB availability errors and simply return None so that
    non-auth-critical endpoints (like /forecast) can still function while DB is down.
    """
    if not token:
        return None
    try:
        return await get_current_user(token, db)
    except HTTPException:
        # Do not propagate; treat as unauthenticated
        return None


async def require_token(token: str = Depends(oauth2_scheme)):
    return decode_token(token)


def get_settings_dep():
    return get_settings()

