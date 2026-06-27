import json
import os
import random
import string
from fastapi import APIRouter, HTTPException, Depends
from pywebpush import webpush, WebPushException
from supabase import Client
from models import SelfCheckinRequest, VisitorSubscribeRequest
from deps import get_db, get_caller_id

router = APIRouter(tags=["visitor"])

VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY")
VAPID_CLAIM_EMAIL = os.getenv("VAPID_CLAIM_EMAIL")


def _generate_badge() -> str:
    chars = string.ascii_uppercase + string.digits
    return "VMS-" + "".join(random.choices(chars, k=6))


def _send_push_to_subscription(subscription: dict, payload: dict):
    """Send a push to any subscription dict (host or visitor)."""
    try:
        webpush(
            subscription_info=subscription,
            data=json.dumps(payload),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": VAPID_CLAIM_EMAIL},
        )
    except WebPushException:
        pass
    except Exception:
        pass


def _send_push(db: Client, host_id: str, payload: dict):
    try:
        result = db.table("users").select("push_subscription").eq("id", host_id).single().execute()
        if not result.data:
            return
        subscription = result.data.get("push_subscription")
        if not subscription:
            return
        webpush(
            subscription_info=subscription,
            data=json.dumps(payload),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": VAPID_CLAIM_EMAIL},
        )
    except WebPushException as e:
        if e.response and e.response.status_code == 410:
            try:
                db.table("users").update({"push_subscription": None}).eq("id", host_id).execute()
            except Exception:
                pass
    except Exception:
        pass  # push is best-effort; never block the visitor check-in


@router.post("/visit", status_code=201)
async def self_checkin(body: SelfCheckinRequest, db: Client = Depends(get_db)):
    try:
        unit_res = db.table("units").select("id, unit_number, host_id, property_id").eq("id", body.unit_id).single().execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    if not unit_res.data:
        raise HTTPException(status_code=404, detail="Unit not found")

    unit = unit_res.data
    host_id = unit.get("host_id")
    host_name = None

    if host_id:
        try:
            host_res = db.table("users").select("name").eq("id", host_id).single().execute()
            if host_res.data:
                host_name = host_res.data["name"]
        except Exception:
            pass

    property_id = unit["property_id"]
    try:
        prop_res = db.table("properties").select("name").eq("id", property_id).single().execute()
        property_name = prop_res.data["name"] if prop_res.data else None
    except Exception:
        property_name = None

    try:
        visitor_res = db.table("visitors").insert({
            "name": body.name,
            "phone": body.phone,
            "purpose": body.purpose,
            "unit_id": unit["id"],
            "unit_number": unit["unit_number"],
            "host_id": host_id,
            "host_name": host_name,
            "property_id": property_id,
            "badge_number": _generate_badge(),
            "status": "pending",
        }).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create visitor record: {e}")

    if not visitor_res.data:
        raise HTTPException(status_code=500, detail="Failed to create visitor record")

    visitor_id = visitor_res.data[0]["id"]

    # Push-notify the host
    if host_id:
        location = f" at {property_name}" if property_name else ""
        unit_label = f" for Flat {unit['unit_number']}" if unit.get("unit_number") else ""
        _send_push(db, host_id, {
            "title": "Visitor Request",
            "body": f"{body.name} wants to visit{unit_label}{location}.",
            "visitor_id": visitor_id,
        })

    return {"visitor_id": visitor_id}


@router.post("/visit/{visitor_id}/push-subscribe", status_code=204)
async def subscribe_visitor_push(visitor_id: str, body: VisitorSubscribeRequest, db: Client = Depends(get_db)):
    res = db.table("visitors").select("id").eq("id", visitor_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Visitor not found")
    db.table("visitors").update({"push_subscription": body.subscription.model_dump()}).eq("id", visitor_id).execute()


@router.post("/visit/{visitor_id}/approve", status_code=204)
async def approve_visitor(
    visitor_id: str,
    caller_id: str = Depends(get_caller_id),
    db: Client = Depends(get_db),
):
    visitor_res = db.table("visitors").select("host_id, status, name, push_subscription").eq("id", visitor_id).single().execute()
    if not visitor_res.data:
        raise HTTPException(status_code=404, detail="Visitor not found")
    if visitor_res.data["host_id"] != caller_id:
        raise HTTPException(status_code=403, detail="Not your visitor")
    if visitor_res.data["status"] != "pending":
        raise HTTPException(status_code=409, detail="Visitor already actioned")

    db.table("visitors").update({"status": "approved"}).eq("id", visitor_id).execute()

    subscription = visitor_res.data.get("push_subscription")
    if subscription:
        _send_push_to_subscription(subscription, {
            "title": "Entry Approved",
            "body": "Show this screen to the security guard to enter.",
            "url": f"/visitor/{visitor_id}",
            "vibrate": [100, 50, 100, 50, 400],
        })


@router.post("/visit/{visitor_id}/reject", status_code=204)
async def reject_visitor(
    visitor_id: str,
    caller_id: str = Depends(get_caller_id),
    db: Client = Depends(get_db),
):
    visitor_res = db.table("visitors").select("host_id, status, name, push_subscription").eq("id", visitor_id).single().execute()
    if not visitor_res.data:
        raise HTTPException(status_code=404, detail="Visitor not found")
    if visitor_res.data["host_id"] != caller_id:
        raise HTTPException(status_code=403, detail="Not your visitor")
    if visitor_res.data["status"] != "pending":
        raise HTTPException(status_code=409, detail="Visitor already actioned")

    db.table("visitors").update({"status": "rejected"}).eq("id", visitor_id).execute()

    subscription = visitor_res.data.get("push_subscription")
    if subscription:
        _send_push_to_subscription(subscription, {
            "title": "Entry Not Approved",
            "body": "Your entry request was declined by the resident.",
            "url": f"/visitor/{visitor_id}",
            "vibrate": [300, 100, 300],
        })


@router.get("/visit/{visitor_id}/status")
async def get_visitor_status(visitor_id: str, db: Client = Depends(get_db)):
    res = db.table("visitors").select("id, name, status, host_name, unit_number, badge_number, checked_in_at").eq("id", visitor_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Visitor not found")
    return res.data
