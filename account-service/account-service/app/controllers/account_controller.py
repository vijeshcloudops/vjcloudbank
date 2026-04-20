# app/controllers/account_controller.py
# Sync version using psycopg2 (Windows compatible)

import random
import string
from decimal import Decimal
from fastapi import HTTPException, status
from app.config.database import get_db
from psycopg2.extras import RealDictCursor


def generate_account_number() -> str:
    return ''.join(random.choices(string.digits, k=10))


def create_account(user_id: str, request) -> dict:
    conn = get_db()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    for _ in range(5):
        account_number = generate_account_number()
        cursor.execute(
            "SELECT 1 FROM accounts WHERE account_number = %s",
            (account_number,)
        )
        if not cursor.fetchone():
            break

    initial_balance = request.initial_deposit or Decimal("0.00")

    cursor.execute("""
        INSERT INTO accounts
            (user_id, account_number, account_type, balance, currency, description)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING *
    """, (
        user_id,
        account_number,
        request.account_type,
        initial_balance,
        request.currency.upper(),
        request.description
    ))

    row = dict(cursor.fetchone())
    cursor.close()
    return row


def get_account_by_id(account_id: str, user_id: str) -> dict:
    conn = get_db()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute(
        "SELECT * FROM accounts WHERE id = %s AND user_id = %s",
        (account_id, user_id)
    )
    row = cursor.fetchone()
    cursor.close()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found or does not belong to you."
        )
    return dict(row)


def get_balance(account_id: str, user_id: str) -> dict:
    conn = get_db()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute(
        """SELECT id, account_number, balance, currency, status
           FROM accounts WHERE id = %s AND user_id = %s""",
        (account_id, user_id)
    )
    row = cursor.fetchone()
    cursor.close()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found or does not belong to you."
        )
    return dict(row)


def get_all_accounts(user_id: str) -> list:
    conn = get_db()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute(
        "SELECT * FROM accounts WHERE user_id = %s ORDER BY created_at DESC",
        (user_id,)
    )
    rows = [dict(r) for r in cursor.fetchall()]
    cursor.close()
    return rows


def close_account(account_id: str, user_id: str) -> dict:
    conn = get_db()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    cursor.execute(
        "SELECT * FROM accounts WHERE id = %s AND user_id = %s",
        (account_id, user_id)
    )
    existing = cursor.fetchone()

    if not existing:
        cursor.close()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found or does not belong to you."
        )

    if existing["status"] == "closed":
        cursor.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is already closed."
        )

    if existing["balance"] > 0:
        cursor.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot close account with balance {existing['balance']}. Withdraw first."
        )

    cursor.execute(
        "UPDATE accounts SET status = 'closed', updated_at = NOW() WHERE id = %s AND user_id = %s RETURNING *",
        (account_id, user_id)
    )
    row = dict(cursor.fetchone())
    cursor.close()
    return row
