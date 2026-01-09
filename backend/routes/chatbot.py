from fastapi import APIRouter
from pydantic import BaseModel


router = APIRouter()


#요청 데이터 형식 정의
class ChatRequest(BaseModel):
    message: str

@router.post("/chat")
async def chat_endpoint(request: ChatRequest):

    return {
        "message": "AI 서비스 준비중입니다.",
        "echo": request.message,
    }