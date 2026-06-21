import os
from fastapi import Header, HTTPException, Depends
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

_db: Client | None = None


def get_db() -> Client:
    global _db
    if _db is None:
        _db = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        )
    return _db


async def get_caller_id(
    authorization: str = Header(None),
    db: Client = Depends(get_db),
) -> str:
    """Verify Bearer token and return the authenticated user's ID."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ", 1)[1]
    try:
        resp = db.auth.get_user(token)
        return resp.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
