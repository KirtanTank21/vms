from fastapi import APIRouter, HTTPException, Depends
from supabase import Client
from models import SubscribeRequest
from deps import get_db

router = APIRouter(prefix="/push", tags=["push"])


@router.post("/subscribe", status_code=204)
async def subscribe(body: SubscribeRequest, db: Client = Depends(get_db)):
    result = db.table("users").update(
        {"push_subscription": body.subscription.model_dump()}
    ).eq("id", body.user_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")


@router.delete("/subscribe", status_code=204)
async def unsubscribe(user_id: str, db: Client = Depends(get_db)):
    db.table("users").update({"push_subscription": None}).eq("id", user_id).execute()
