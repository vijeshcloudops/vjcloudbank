# app/schemas/account_schema.py
#
# Pydantic schemas define the SHAPE of data coming in and going out.
# FastAPI uses these automatically to:
#   1. Validate incoming request bodies (like express-validator)
#   2. Serialize outgoing responses (convert Python objects to JSON)
#   3. Generate automatic API documentation at /docs
#
# Think of schemas as contracts:
#   "If you call this endpoint, send THIS shape of data"
#   "You will receive back THIS shape of data"

from pydantic import BaseModel, Field
from typing import Optional, Literal
from decimal import Decimal
from datetime import datetime
import uuid


# ── Request Schemas (what the CLIENT sends to us) ──────────────────────

class CreateAccountRequest(BaseModel):
    """Data required to open a new bank account."""
    account_type: Literal["savings", "current", "fixed"] = Field(
        default="savings",
        description="Type of bank account"
    )
    currency: str = Field(
        default="INR",
        min_length=3,
        max_length=3,
        description="3-letter currency code e.g. INR, USD"
    )
    description: Optional[str] = Field(
        default=None,
        max_length=255,
        description="Optional label e.g. 'My salary account'"
    )
    initial_deposit: Optional[Decimal] = Field(
        default=Decimal("0.00"),
        ge=0,
        description="Opening balance amount"
    )

    # Example shown in auto-generated /docs page
    model_config = {
        "json_schema_extra": {
            "example": {
                "account_type": "savings",
                "currency": "INR",
                "description": "My primary savings account",
                "initial_deposit": 5000.00
            }
        }
    }


# ── Response Schemas (what WE send back to the client) ─────────────────

class AccountResponse(BaseModel):
    """Full account details returned after create or get."""
    id: uuid.UUID
    user_id: uuid.UUID
    account_number: str
    account_type: str
    balance: Decimal
    currency: str
    status: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime


class BalanceResponse(BaseModel):
    """Lightweight response for balance check."""
    account_id: uuid.UUID
    account_number: str
    balance: Decimal
    currency: str
    status: str


class AccountListResponse(BaseModel):
    """List of accounts with a count."""
    success: bool
    count: int
    data: list[AccountResponse]


class StandardResponse(BaseModel):
    """Generic wrapper used for all responses."""
    success: bool
    message: Optional[str] = None
    data: Optional[AccountResponse] = None
