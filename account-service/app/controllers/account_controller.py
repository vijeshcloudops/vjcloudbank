# app/controllers/account_controller.py
# Production version using asyncpg

import random
import string
from decimal import Decimal
from fastapi import HTTPException, status
from app.config.database import get_db


def generate_account_number() -> str:
    return ''.join(random.choices(string.digits, k=10))


async def create_account(user_id: str, request) -> dict:
    pool = get_db()
    async with pool.acquire() as conn:
        for _ in range(5):
            account_number = generate_account_number()
            existing = await conn.fetchval(
                "SELECT 1 FROM accounts WHERE account_number = $1",
                account_number
            )
            if not existing:
                break

        initial_balance = request.initial_deposit or Decimal("0.00")

        row = await conn.fetchrow("""
            INSERT INTO accounts
                (user_id, account_number, account_type, balance, currency, description)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        """,
            user_id,
            account_number,
            request.account_type,
            initial_balance,
            request.currency.upper(),
            request.description
        )
        return dict(row)


async def get_account_by_id(account_id: str, user_id: str) -> dict:
    pool = get_db()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM accounts WHERE id = $1 AND user_id = $2",
            account_id, user_id
        )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found or does not belong to you."
        )
    return dict(row)


async def get_balance(account_id: str, user_id: str) -> dict:
    pool = get_db()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """SELECT id, account_number, balance, currency, status
               FROM accounts WHERE id = $1 AND user_id = $2""",
            account_id, user_id
        )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found or does not belong to you."
        )
    return dict(row)


async def get_all_accounts(user_id: str) -> list:
    pool = get_db()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM accounts WHERE user_id = $1 ORDER BY created_at DESC",
            user_id
        )
    return [dict(r) for r in rows]


async def close_account(account_id: str, user_id: str) -> dict:
    pool = get_db()
    async with pool.acquire() as conn:
        existing = await conn.fetchrow(
            "SELECT * FROM accounts WHERE id = $1 AND user_id = $2",
            account_id, user_id
        )
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not found or does not belong to you."
            )
        if existing["status"] == "closed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Account is already closed."
            )
        if existing["balance"] > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot close account with balance {existing['balance']}. Withdraw first."
            )
        row = await conn.fetchrow(
            "UPDATE accounts SET status = 'closed', updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *",
            account_id, user_id
        )
        return dict(row)
