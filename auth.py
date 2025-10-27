import os
from datetime import datetime, timedelta
from typing import Optional
from jose import jwt

from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import SessionLocal
from models import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET = os.getenv("JWT_SECRET", "your_jwt_secret_key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
RESET_TOKEN_EXPIRE_MINUTES = 30  # Reset tokens expire in 30 minutes

security = HTTPBearer()

def create_reset_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
    to_encode = {
        "sub": str(user_id),
        "exp": expire.timestamp(),
        "type": "reset"
    }
    return jwt.encode(to_encode, SECRET, algorithm=ALGORITHM)

def verify_reset_token(token: str) -> int:
    try:
        payload = jwt.decode(token, SECRET, algorithms=[ALGORITHM])
        if payload.get("type") != "reset":
            raise ValueError("Not a reset token")
        user_id = int(payload.get("sub"))
        return user_id
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def hash_password(password: str) -> str:
    # Add input validation before hashing
    if not password or len(password) < 1:
        raise ValueError("Password cannot be empty")
    if len(password.encode('utf-8')) > 72:
        raise ValueError("Password cannot be longer than 72 bytes")
    
    # Hash the password
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Truncate to bcrypt's 72-byte limit before verifying, matching hash_password
    plain_password = plain_password.encode('utf-8')[:72].decode('utf-8')
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {
        "sub": str(user_id),
        "exp": expire.timestamp()
    }
    encoded_jwt = jwt.encode(to_encode, SECRET, algorithm=ALGORITHM)
    return encoded_jwt
    encoded_jwt = jwt.encode(to_encode, SECRET, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
                     
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        if sub is None:
            raise ValueError("token missing subject")
        user_id = int(sub)
    except Exception as e:
        # Log for developer visibility and return generic auth error
        print(f"Token validation error: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid Authentication Token")

    # Lookup users by id (models.User has 'id' and 'email', not 'username')
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )
    return user
