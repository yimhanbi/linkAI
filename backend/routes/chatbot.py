from functools import lru_cache
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from backend.services.chatbot_engine import ChatbotEngine


router = APIRouter()

@lru_cache(maxsize=1)
def get_chatbot_engine() -> ChatbotEngine:
    return ChatbotEngine()

class ChatRequest(BaseModel):
    query: str 

@router.post("/ask")
async def ask_chatbot(request: ChatRequest, engine: ChatbotEngine = Depends(get_chatbot_engine)):
    try:
        #엔진을 통해 답변 생성
        answer = await engine.answer(request.query)
        return {"answer": answer}
    except Exception as e:
        print(f"챗봇 에러: {e}")
        raise HTTPException(status_code=500, detail=str(e))