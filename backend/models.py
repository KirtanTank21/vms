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
    unit_number: str | None = None


class CreateUserRequest(BaseModel):
    name: str
    phone: str
    password: str
    role: str  # "guard" | "host"
    property_id: str | None = None


class CreateUnitRequest(BaseModel):
    property_id: str
    unit_number: str
    host_id: str | None = None


class CreatePropertyRequest(BaseModel):
    name: str
    address: str | None = None


class SelfCheckinRequest(BaseModel):
    name: str
    phone: str | None = None
    purpose: str | None = None
    unit_id: str


class VisitorSubscribeRequest(BaseModel):
    subscription: PushSubscription
