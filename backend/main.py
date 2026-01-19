from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware # 1. 미들웨어 추가
from fastapi.staticfiles import StaticFiles
import os 
from pathlib import Path
from backend.database import db_manager
from backend.routes import patents, auth, chatbot 

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
backend_dir: Path = Path(__file__).resolve().parent
default_pdf_dir: str = str(backend_dir / "storage" / "pdfs")
PDF_DIR: str = os.getenv("PDF_DIR", default_pdf_dir)

# 폴더가 없으면 생성 (Docker/배포 환경에서 PDF를 별도로 마운트하는 경우가 많음)
try:
    os.makedirs(PDF_DIR, exist_ok=True)
except Exception as e:
    print(f"⚠️ PDF 폴더 생성 실패: {PDF_DIR} ({e})")

if os.path.isdir(PDF_DIR):
    app.mount("/static/pdfs", StaticFiles(directory=PDF_DIR), name="static_pdfs")
else:
    print(f"⚠️ 경고: PDF 폴더를 찾을 수 없습니다: {PDF_DIR}")

@app.on_event("startup")
async def startup():
    db_manager.connect()
    # 챗봇 엔진 초기화는 지연 로드 (네트워크 문제 시 서버 시작 방지)
    # 첫 요청 시 자동으로 초기화됨
    print("모든 서비스가 준비되었습니다.")

@app.on_event("shutdown")
async def shutdown():
    db_manager.close()

# 라우터 연결
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(patents.router, prefix="/api/patents", tags=["Patents"])


#챗봇 추가 
app.include_router(chatbot.router, prefix="/api/chatbot", tags=["Chatbot"])

@app.get("/")
async def index():
    return {"status": "online", "message": "LinkAI API Server"}