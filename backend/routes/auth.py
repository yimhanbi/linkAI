from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta 
from backend.core.security import get_password_hash, verify_password, create_access_token 
from backend.database import db_manager

router = APIRouter()

# --- 데이터 모델 ---
class UserSignup(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "user"

class UserLogin(BaseModel):
    email: EmailStr
    password: str 

# --- 1. 회원가입 API ---
@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserSignup):
    users_col = db_manager.db["users"]

    # 중복 체크
    existing_user = await users_col.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="이미 등록된 이메일입니다.")
    
    # 새 유저 저장
    new_user = {
        "email": user_data.email,
        "password": get_password_hash(user_data.password),
        "name": user_data.name,
        "role": user_data.role,
        "status": "active",
        "metadata": {
            "createdAt": datetime.utcnow(), 
            "loginCount": 0
        }
    }
    
    result = await users_col.insert_one(new_user)
    return {"message": "회원가입이 완료되었습니다.", "id": str(result.inserted_id)}

# --- 2. 로그인 API  ---
@router.post("/login")
async def login(user_data: UserLogin):
    users_col = db_manager.db["users"]

    # 유저 확인
    user = await users_col.find_one({"email": user_data.email})
    if not user:
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 잘못되었습니다.")

    # 비밀번호 검증 (오타 수정: verify_password)
    if not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 잘못되었습니다.")

    # 토큰 생성 (오타 수정: access_token, user["email"])
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "role": user.get("role", "user"),
        "name": user.get("name","사용자"),
        "message": "로그인 성공!"
    }