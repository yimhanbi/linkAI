from fastapi import FastAPI
from backend.database import db_manager
from backend.routes import patents

app = FastAPI(title="LinkAI 서비스 API")

@app.on_event("startup")
async def startup():
    db_manager.connect()


@app.on_event("shutdown")
async def shutdown():
    db_manager.close()


#라우터 연결
app.include_router(patents.router)


@app.get("/")
async def index():
    return {"status": "online", "message": "LinkAI API Server"}