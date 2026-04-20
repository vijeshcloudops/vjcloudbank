# app/routes/account_routes.py
# Sync version - no async/await needed with psycopg2

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from app.middleware.auth import get_current_user
from app.schemas.account_schema import CreateAccountRequest
from app.controllers import account_controller

router = APIRouter(prefix="/api/accounts", tags=["Accounts"])


@router.get("/health")
def health_check():
    from app.config.database import get_db
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.close()
        return {"success": True, "service": "account-service", "status": "healthy"}
    except Exception:
        return JSONResponse(
            status_code=503,
            content={"success": False, "service": "account-service", "status": "unhealthy"}
        )


@router.post("", status_code=status.HTTP_201_CREATED)
def create_account(
    request: CreateAccountRequest,
    current_user: dict = Depends(get_current_user)
):
    account = account_controller.create_account(
        user_id=current_user["userId"],
        request=request
    )
    return {
        "success": True,
        "message": "Account created successfully.",
        "data": account
    }


@router.get("")
def list_my_accounts(
    current_user: dict = Depends(get_current_user)
):
    accounts = account_controller.get_all_accounts(
        user_id=current_user["userId"]
    )
    return {
        "success": True,
        "count": len(accounts),
        "data": accounts
    }


@router.get("/{account_id}")
def get_account(
    account_id: str,
    current_user: dict = Depends(get_current_user)
):
    account = account_controller.get_account_by_id(
        account_id=account_id,
        user_id=current_user["userId"]
    )
    return {"success": True, "data": account}


@router.get("/{account_id}/balance")
def get_balance(
    account_id: str,
    current_user: dict = Depends(get_current_user)
):
    balance = account_controller.get_balance(
        account_id=account_id,
        user_id=current_user["userId"]
    )
    return {"success": True, "data": balance}


@router.patch("/{account_id}/close")
def close_account(
    account_id: str,
    current_user: dict = Depends(get_current_user)
):
    account = account_controller.close_account(
        account_id=account_id,
        user_id=current_user["userId"]
    )
    return {
        "success": True,
        "message": "Account closed successfully.",
        "data": account
    }
