from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware # 1. 미들웨어 추가
from backend.database import db_manager
from backend.routes import patents

app = FastAPI(title="LinkAI 서비스 API")

# 2. CORS 설정 추가 (라우터 연결보다 반드시 위에 위치!)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # 모든 도메인 허용 (테스트용)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    db_manager.connect()

@app.on_event("shutdown")
async def shutdown():
    db_manager.close()

# 라우터 연결
app.include_router(patents.router)

@app.get("/")
async def index():
    return {"status": "online", "message": "LinkAI API Server"}