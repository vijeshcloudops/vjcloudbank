# app/routes/account_routes.py
# Production version using asyncpg

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from app.middleware.auth import get_current_user
from app.schemas.account_schema import CreateAccountRequest
from app.controllers import account_controller

router = APIRouter(prefix="/api/accounts", tags=["Accounts"])


@router.get("/health")
async def health_check():
    from app.config.database import get_db
    pool = get_db()
    try:
        async with pool.acquire() as conn:
            await conn.execute("SELECT 1")
        return {"success": True, "service": "account-service", "status": "healthy"}
    except Exception:
        return JSONResponse(
            status_code=503,
            content={"success": False, "service": "account-service", "status": "unhealthy"}
        )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_account(
    request: CreateAccountRequest,
    current_user: dict = Depends(get_current_user)
):
    account = await account_controller.create_account(
        user_id=current_user["userId"],
        request=request
    )
    return {
        "success": True,
        "message": "Account created successfully.",
        "data": account
    }


@router.get("")
async def list_my_accounts(
    current_user: dict = Depends(get_current_user)
):
    accounts = await account_controller.get_all_accounts(
        user_id=current_user["userId"]
    )
    return {
        "success": True,
        "count": len(accounts),
        "data": accounts
    }


@router.get("/{account_id}")
async def get_account(
    account_id: str,
    current_user: dict = Depends(get_current_user)
):
    account = await account_controller.get_account_by_id(
        account_id=account_id,
        user_id=current_user["userId"]
    )
    return {"success": True, "data": account}


@router.get("/{account_id}/balance")
async def get_balance(
    account_id: str,
    current_user: dict = Depends(get_current_user)
):
    balance = await account_controller.get_balance(
        account_id=account_id,
        user_id=current_user["userId"]
    )
    return {"success": True, "data": balance}


@router.patch("/{account_id}/close")
async def close_account(
    account_id: str,
    current_user: dict = Depends(get_current_user)
):
    account = await account_controller.close_account(
        account_id=account_id,
        user_id=current_user["userId"]
    )
    return {
        "success": True,
        "message": "Account closed successfully.",
        "data": account
    }
