import json
import os
from fastapi import APIRouter, HTTPException, Request
from pywebpush import webpush, WebPushException
from models import NotifyCheckinRequest

router = APIRouter(prefix="/notify", tags=["notify"])

VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY")
VAPID_CLAIM_EMAIL = os.getenv("VAPID_CLAIM_EMAIL")


@router.post("/checkin", status_code=204)
async def notify_checkin(body: NotifyCheckinRequest, request: Request):
    db = request.app.state.db

    result = db.table("users").select("push_subscription").eq("id", body.host_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Host not found")

    subscription = result.data.get("push_subscription")
    if not subscription:
        # Host hasn't granted push permission — silently succeed
        return

    location = f" at {body.property_name}" if body.property_name else ""
    payload = json.dumps({
        "title": "Visitor Arrived",
        "body": f"{body.visitor_name} has arrived{location}.",
        "visitor_id": body.visitor_id,
    })

    try:
        webpush(
            subscription_info=subscription,
            data=payload,
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": VAPID_CLAIM_EMAIL},
        )
    except WebPushException as e:
        # 410 Gone means subscription is expired — clean it up
        if e.response and e.response.status_code == 410:
            db.table("users").update({"push_subscription": None}).eq("id", body.host_id).execute()
        else:
            raise HTTPException(status_code=502, detail=f"Push failed: {e}")
