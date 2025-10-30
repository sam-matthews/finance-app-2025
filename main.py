from fastapi import FastAPI, Request, Depends
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware import Middleware
import time
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base, SessionLocal
from models import User, Expense, ExpenseType, Account
from auth import (
    get_db, hash_password, verify_password, create_access_token,
    get_current_user, create_reset_token, verify_reset_token
)
from pydantic import BaseModel
import datetime

# Create the database tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Add cache control middleware
@app.middleware("http")
async def add_cache_control_header(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/static"):
        # Prevent caching of static files
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# --- Pydantic Models ---
from pydantic import BaseModel, EmailStr, validator

from typing import Optional

class RegisterModel(BaseModel):
    email: str
    password: str

    @validator('email')
    def validate_email(cls, v):
        if not v or '@' not in v:
            raise ValueError('Invalid email format')
        return v.lower()

    @validator('password')
    def validate_password(cls, v):
        if not v:
            raise ValueError('Password cannot be empty')
        if len(v.encode('utf-8')) > 72:
            raise ValueError('Password is too long. Maximum length is 72 bytes.')
        return v

class PasswordResetRequestModel(BaseModel):
    email: str

class PasswordResetModel(BaseModel):
    token: str
    new_password: str

    @validator('new_password')
    def validate_password(cls, v):
        if not v:
            raise ValueError('Password cannot be empty')
        if len(v.encode('utf-8')) > 72:
            raise ValueError('Password is too long. Maximum length is 72 bytes.')
        return v
        return v

class LoginModel(BaseModel):
    email: str
    password: str

class ExpenseIn(BaseModel):
    date: datetime.date
    description: str | None = None
    category: str | None = None
    amount: float
    type_id: int
    account_id: int

# --- Routes ---
@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    # Add timestamp for cache busting
    return templates.TemplateResponse(
        "index.html", 
        {"request": request, "timestamp": int(time.time())}
    )

# --- API Routes ---

@app.post("/api/request-reset")
async def request_reset_password(data: PasswordResetRequestModel, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        # Return 200 even if user doesn't exist to prevent email enumeration
        return {"message": "User not found"}
    
    # Create reset token
    reset_token = create_reset_token(user.id)
    
    # In a real application, you would send this token via email
    # For this demo, we'll return it directly (NOT recommended for production)
    return {
        "token": reset_token,
        "message": "Reset token generated. In a production environment, this would be emailed to you."
    }

@app.post("/api/reset-password")
async def reset_password(data: PasswordResetModel, db: Session = Depends(get_db)):
    try:
        user_id = verify_reset_token(data.token)
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update password
        user.password = hash_password(data.new_password)
        db.commit()
        
        return {"message": "Password successfully reset"}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=400, detail="Password reset failed")

from fastapi import HTTPException

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError

@app.exception_handler(ValidationError)
async def validation_exception_handler(request: Request, exc: ValidationError):
    return JSONResponse(
        status_code=422,
        content={"ok": False, "error": str(exc.errors()[0]['msg'])}
    )

@app.post("/api/register")
async def register(user: RegisterModel, db: Session = Depends(get_db)):
    try:
        # Check if user exists
        if db.query(User).filter(User.email == user.email).first():
            return {"ok": False, "error": "Email already registered"}
            
        # Try to hash password and catch validation errors
        try:
            hashed_password = hash_password(user.password)
        except ValueError as e:
            print(f"Password hashing error: {str(e)}")
            return {"ok": False, "error": str(e)}
            
        # Create new user with proper field names matching the model
        db_user = User(
            email=user.email,
            hashed_password=hashed_password  # This matches the column name in models.py
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)  # Refresh to ensure we have the ID
        
        # Generate token and return
        token = create_access_token(db_user.id)
        return {"ok": True, "token": token}
    except Exception as e:
        db.rollback()
        return {"ok": False, "error": f"Registration failed: {str(e)}"}

@app.post("/api/login")
def login(data: LoginModel, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        return {"ok": False, "error": "Invalid credentials"}
    token = create_access_token(user.id)
    return {"ok": True, "token": token}

@app.get("/api/expense-types")
def get_expense_types(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    types = db.query(ExpenseType).all()
    return {"ok": True, "types": [{"id": t.id, "name": t.name, "description": t.description} for t in types]}

@app.get("/api/accounts")
def get_accounts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    accounts = db.query(Account).all()
    return {"ok": True, "accounts": [{"id": a.id, "name": a.name, "description": a.description} for a in accounts]}

@app.post("/api/expenses")
def add_expense(exp: ExpenseIn, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Verify that type_id and account_id exist
    expense_type = db.query(ExpenseType).filter(ExpenseType.id == exp.type_id).first()
    if not expense_type:
        return {"ok": False, "error": "Invalid expense type"}
    
    account = db.query(Account).filter(Account.id == exp.account_id).first()
    if not account:
        return {"ok": False, "error": "Invalid account"}

    e = Expense(
        user_id=current_user.id,
        date=exp.date,
        description=exp.description or "",
        category=exp.category or "",
        amount=exp.amount,
        type_id=exp.type_id,
        account_id=exp.account_id
    )
    db.add(e)
    db.commit()
    db.refresh(e)
    return {"ok": True, "id": e.id}

@app.get("/api/report")
def weekly_report(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = datetime.date.today()
    last_saturday = today - datetime.timedelta(days=(today.weekday() + 2) % 7)
    previous_saturday = last_saturday - datetime.timedelta(days=7)

    rows = db.query(Expense.category, func.sum(Expense.amount)).filter(
        Expense.user_id == current_user.id,
        Expense.date >= previous_saturday,
        Expense.date < last_saturday
    ).group_by(Expense.category).all()

    data = [{"category": cat or "(none)", "total": tot} for cat, tot in rows]
    return {"from": str(previous_saturday), "to": str(last_saturday), "data": data}

# Conveniece: import function properly.
from sqlalchemy import func
