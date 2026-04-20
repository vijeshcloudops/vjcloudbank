# app/middleware/auth.py
#
# This is the Python version of the JWT middleware we built in Node.js.
# In FastAPI, middleware is called a "Dependency" — you inject it into
# route functions using the Depends() system.
#
# How FastAPI Depends() works:
#   @router.get("/accounts")
#   async def list_accounts(current_user = Depends(get_current_user)):
#       # current_user is now available — guaranteed to be authenticated
#
# If the token is missing or invalid, FastAPI automatically returns 401
# before your route function ever runs. Clean and elegant.

import os
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from dotenv import load_dotenv

load_dotenv()

# HTTPBearer tells FastAPI to look for "Authorization: Bearer <token>"
# auto_error=False means we handle the error ourselves (better messages)
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> dict:
    """
    FastAPI dependency that:
    1. Extracts the Bearer token from the Authorization header
    2. Verifies the JWT signature using our shared secret
    3. Returns the decoded user payload (userId, email, role)
    4. Raises HTTP 401 if anything is wrong

    Usage in a route:
        async def my_route(user = Depends(get_current_user)):
            print(user["userId"])  # guaranteed to exist
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    try:
        # Decode and verify the token
        # jose.jwt.decode() checks:
        #   - Signature is valid (made with our secret)
        #   - Token has not expired
        #   - Algorithm matches (HS256)
        payload = jwt.decode(
            token,
            os.getenv("JWT_SECRET"),
            algorithms=["HS256"]
        )
        return payload

    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
