"""
Clerk JWT authentication middleware for FastAPI
"""
import os
import httpx
from fastapi import HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import logging

logger = logging.getLogger(__name__)

security = HTTPBearer()

# Clerk configuration
CLERK_PUBLISHABLE_KEY = os.getenv("CLERK_PUBLISHABLE_KEY", "")
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY", "")

if not CLERK_SECRET_KEY:
    logger.warning("CLERK_SECRET_KEY not set. Authentication will fail.")


async def verify_clerk_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Verify Clerk JWT token and return user information.
    
    Args:
        credentials: HTTP Bearer token credentials
        
    Returns:
        dict: User information including user_id, email, etc.
        
    Raises:
        HTTPException: If token is invalid or missing
    """
    token = credentials.credentials
    
    if not token:
        raise HTTPException(
            status_code=401,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        # Verify token with Clerk API
        # Clerk uses RS256, so we need to verify the JWT signature
        # For now, we'll use Clerk's verify endpoint
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.clerk.com/v1/tokens/verify",
                headers={
                    "Authorization": f"Bearer {CLERK_SECRET_KEY}",
                    "Content-Type": "application/json",
                },
                json={"token": token},
                timeout=5.0,
            )
            
            if response.status_code != 200:
                # Alternative: Use Clerk's backend API to verify
                # Get user from token
                user_response = await client.get(
                    "https://api.clerk.com/v1/users/me",
                    headers={
                        "Authorization": f"Bearer {token}",
                    },
                    timeout=5.0,
                )
                
                if user_response.status_code != 200:
                    raise HTTPException(
                        status_code=401,
                        detail="Invalid or expired token",
                    )
                
                user_data = user_response.json()
                return {
                    "sub": user_data.get("id"),
                    "email": user_data.get("email_addresses", [{}])[0].get("email_address"),
                    "name": user_data.get("first_name", "") + " " + user_data.get("last_name", ""),
                    "picture": user_data.get("image_url"),
                }
            
            # Token verification successful
            token_data = response.json()
            return {
                "sub": token_data.get("sub"),
                "email": token_data.get("email"),
                "name": token_data.get("name"),
                "picture": token_data.get("picture"),
            }
            
    except httpx.TimeoutException:
        logger.error("Timeout verifying Clerk token")
        raise HTTPException(
            status_code=503,
            detail="Authentication service unavailable",
        )
    except Exception as e:
        logger.error(f"Error verifying Clerk token: {str(e)}")
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token",
        )


def get_current_user_id(user: dict = Depends(verify_clerk_token)) -> str:
    """
    Extract user ID from verified token.
    
    Args:
        user: User information from verify_clerk_token
        
    Returns:
        str: User ID
    """
    return user.get("sub")


# Optional dependency for routes that don't require auth
async def get_optional_user(
    request: Request,
) -> Optional[dict]:
    """
    Optionally get user if token is present.
    Useful for routes that work with or without authentication.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    
    token = auth_header.split(" ")[1]
    try:
        async with httpx.AsyncClient() as client:
            user_response = await client.get(
                "https://api.clerk.com/v1/users/me",
                headers={
                    "Authorization": f"Bearer {token}",
                },
                timeout=5.0,
            )
            
            if user_response.status_code == 200:
                user_data = user_response.json()
                return {
                    "sub": user_data.get("id"),
                    "email": user_data.get("email_addresses", [{}])[0].get("email_address"),
                    "name": user_data.get("first_name", "") + " " + user_data.get("last_name", ""),
                    "picture": user_data.get("image_url"),
                }
    except Exception:
        pass
    
    return None

