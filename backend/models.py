from pydantic import BaseModel
from typing import Any


class PushKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscription(BaseModel):
    endpoint: str
    keys: PushKeys


class SubscribeRequest(BaseModel):
    user_id: str
    subscription: PushSubscription


class NotifyCheckinRequest(BaseModel):
    visitor_id: str
    visitor_name: str
    host_id: str
    property_name: str | None = None
