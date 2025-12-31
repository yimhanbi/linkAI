from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware # 1. 미들웨어 추가
from fastapi.staticfiles import StaticFiles
import os 
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

# 3. 정적 파일(PDF) 경로 설정 추가
PDF_DIR = "/Users/imhanbi/dev/linkai/backend/storage/pdfs"

# 폴더가 존재하는지 확인 (디버깅용)
if not os.path.exists(PDF_DIR):
    print(f"⚠️ 경고: PDF 폴더를 찾을 수 없습니다: {PDF_DIR}")

app.mount("/static/pdfs", StaticFiles(directory=PDF_DIR), name="static_pdfs")

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