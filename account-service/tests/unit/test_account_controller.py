# tests/unit/test_account_controller.py
#
# Unit tests for account-service controller functions.
# We mock the asyncpg pool so tests never hit a real database and run
# deterministically. pytest-asyncio handles the async test functions.
#
# Coverage output configured in pyproject.toml / pytest.ini:
#   - coverage.xml   (Cobertura format — consumed by SonarQube)
#   - htmlcov/       (browsable HTML report)

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from decimal import Decimal
from uuid import uuid4
from fastapi import HTTPException

from app.controllers import account_controller
from app.schemas.account_schema import CreateAccountRequest


# ── Reusable helpers ─────────────────────────────────────────────

def make_pool_mock(fetchrow_returns=None, fetchval_returns=None, fetch_returns=None):
    """
    Build a mock asyncpg pool that yields a mock connection when
    'async with pool.acquire()' is called.
    """
    conn = MagicMock()
    conn.fetchrow = AsyncMock(return_value=fetchrow_returns)
    conn.fetchval = AsyncMock(return_value=fetchval_returns)
    conn.fetch = AsyncMock(return_value=fetch_returns or [])
    conn.execute = AsyncMock(return_value="OK")

    # async context manager: pool.acquire() returns conn
    acquire_ctx = MagicMock()
    acquire_ctx.__aenter__ = AsyncMock(return_value=conn)
    acquire_ctx.__aexit__ = AsyncMock(return_value=False)

    pool = MagicMock()
    pool.acquire = MagicMock(return_value=acquire_ctx)
    return pool, conn


# ═══════════════════════════════════════════════════════════════
# CREATE ACCOUNT
# ═══════════════════════════════════════════════════════════════
class TestCreateAccount:

    @pytest.mark.asyncio
    async def test_creates_account_successfully(self):
        # No existing account with generated number, INSERT returns new row
        expected_row = {
            "id": str(uuid4()),
            "user_id": "user-123",
            "account_number": "1234567890",
            "account_type": "savings",
            "balance": Decimal("5000.00"),
            "currency": "INR",
            "status": "active",
            "description": "Test account",
        }
        pool, conn = make_pool_mock(
            fetchval_returns=None,       # existing check returns None
            fetchrow_returns=expected_row,
        )

        with patch("app.controllers.account_controller.get_db", return_value=pool):
            req = CreateAccountRequest(
                account_type="savings",
                currency="INR",
                description="Test account",
                initial_deposit=Decimal("5000.00"),
            )
            result = await account_controller.create_account(
                user_id="user-123",
                request=req,
            )

        assert result["user_id"] == "user-123"
        assert result["currency"] == "INR"
        assert conn.fetchrow.call_count == 1

    @pytest.mark.asyncio
    async def test_uses_zero_balance_when_no_deposit(self):
        expected_row = {
            "id": str(uuid4()),
            "user_id": "user-123",
            "balance": Decimal("0.00"),
            "account_number": "9999999999",
            "account_type": "savings",
            "currency": "INR",
            "status": "active",
            "description": None,
        }
        pool, conn = make_pool_mock(
            fetchval_returns=None,
            fetchrow_returns=expected_row,
        )

        with patch("app.controllers.account_controller.get_db", return_value=pool):
            req = CreateAccountRequest(
                account_type="savings",
                currency="INR",
                # no initial_deposit -> defaults to Decimal("0.00")
            )
            result = await account_controller.create_account(
                user_id="user-123",
                request=req,
            )

        assert result["balance"] == Decimal("0.00")


# ═══════════════════════════════════════════════════════════════
# GET ACCOUNT BY ID
# ═══════════════════════════════════════════════════════════════
class TestGetAccountById:

    @pytest.mark.asyncio
    async def test_returns_account_when_found(self):
        account = {
            "id": "acc-123",
            "user_id": "user-123",
            "balance": Decimal("1000.00"),
            "currency": "INR",
        }
        pool, _ = make_pool_mock(fetchrow_returns=account)

        with patch("app.controllers.account_controller.get_db", return_value=pool):
            result = await account_controller.get_account_by_id(
                account_id="acc-123",
                user_id="user-123",
            )

        assert result["id"] == "acc-123"
        assert result["user_id"] == "user-123"

    @pytest.mark.asyncio
    async def test_raises_404_when_account_not_found(self):
        pool, _ = make_pool_mock(fetchrow_returns=None)

        with patch("app.controllers.account_controller.get_db", return_value=pool):
            with pytest.raises(HTTPException) as exc:
                await account_controller.get_account_by_id(
                    account_id="does-not-exist",
                    user_id="user-123",
                )

        assert exc.value.status_code == 404
        assert "not found" in exc.value.detail.lower()

    @pytest.mark.asyncio
    async def test_raises_404_when_account_belongs_to_other_user(self):
        # If query returns None because user_id filter didn't match, same 404
        pool, _ = make_pool_mock(fetchrow_returns=None)

        with patch("app.controllers.account_controller.get_db", return_value=pool):
            with pytest.raises(HTTPException) as exc:
                await account_controller.get_account_by_id(
                    account_id="someone-elses-account",
                    user_id="attacker",
                )

        assert exc.value.status_code == 404


# ═══════════════════════════════════════════════════════════════
# GET BALANCE
# ═══════════════════════════════════════════════════════════════
class TestGetBalance:

    @pytest.mark.asyncio
    async def test_returns_balance_when_found(self):
        balance_row = {
            "id": "acc-123",
            "account_number": "1234567890",
            "balance": Decimal("2500.50"),
            "currency": "INR",
            "status": "active",
        }
        pool, _ = make_pool_mock(fetchrow_returns=balance_row)

        with patch("app.controllers.account_controller.get_db", return_value=pool):
            result = await account_controller.get_balance(
                account_id="acc-123",
                user_id="user-123",
            )

        assert result["balance"] == Decimal("2500.50")
        assert result["status"] == "active"

    @pytest.mark.asyncio
    async def test_raises_404_when_balance_not_found(self):
        pool, _ = make_pool_mock(fetchrow_returns=None)

        with patch("app.controllers.account_controller.get_db", return_value=pool):
            with pytest.raises(HTTPException) as exc:
                await account_controller.get_balance(
                    account_id="missing",
                    user_id="user-123",
                )

        assert exc.value.status_code == 404


# ═══════════════════════════════════════════════════════════════
# LIST ACCOUNTS
# ═══════════════════════════════════════════════════════════════
class TestGetAllAccounts:

    @pytest.mark.asyncio
    async def test_returns_list_of_user_accounts(self):
        accounts = [
            {"id": "acc-1", "user_id": "user-123", "balance": Decimal("100.00")},
            {"id": "acc-2", "user_id": "user-123", "balance": Decimal("500.00")},
        ]
        pool, _ = make_pool_mock(fetch_returns=accounts)

        with patch("app.controllers.account_controller.get_db", return_value=pool):
            result = await account_controller.get_all_accounts(user_id="user-123")

        assert len(result) == 2
        assert all(a["user_id"] == "user-123" for a in result)

    @pytest.mark.asyncio
    async def test_returns_empty_list_when_no_accounts(self):
        pool, _ = make_pool_mock(fetch_returns=[])

        with patch("app.controllers.account_controller.get_db", return_value=pool):
            result = await account_controller.get_all_accounts(user_id="user-new")

        assert result == []


# ═══════════════════════════════════════════════════════════════
# ACCOUNT NUMBER GENERATOR
# ═══════════════════════════════════════════════════════════════
class TestGenerateAccountNumber:

    def test_produces_10_digit_string(self):
        for _ in range(10):
            number = account_controller.generate_account_number()
            assert len(number) == 10
            assert number.isdigit()

    def test_generates_different_numbers(self):
        # Given the random pool, extremely unlikely to be identical
        n1 = account_controller.generate_account_number()
        n2 = account_controller.generate_account_number()
        assert n1 != n2
