from fastapi import APIRouter, HTTPException, Depends
from supabase import Client
from models import SubscribeRequest
from deps import get_db, get_caller_id

router = APIRouter(prefix="/push", tags=["push"])


@router.post("/subscribe", status_code=204)
async def subscribe(
    body: SubscribeRequest,
    caller_id: str = Depends(get_caller_id),
    db: Client = Depends(get_db),
):
    if body.user_id != caller_id:
        raise HTTPException(status_code=403, detail="Cannot register push subscription for another user")

    result = db.table("users").update(
        {"push_subscription": body.subscription.model_dump()}
    ).eq("id", caller_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")


@router.delete("/subscribe", status_code=204)
async def unsubscribe(
    user_id: str,
    caller_id: str = Depends(get_caller_id),
    db: Client = Depends(get_db),
):
    if user_id != caller_id:
        raise HTTPException(status_code=403, detail="Cannot remove push subscription for another user")

    db.table("users").update({"push_subscription": None}).eq("id", caller_id).execute()
