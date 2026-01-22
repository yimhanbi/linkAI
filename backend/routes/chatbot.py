from functools import lru_cache
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from backend.services.chatbot_engine import ChatbotEngine


router = APIRouter()

@lru_cache(maxsize=1)
def get_chatbot_engine() -> ChatbotEngine:
    return ChatbotEngine()


# --- 모델 정의 ---
class ChatRequest(BaseModel):
    query: str 
    session_id: Optional[str] = None
    
# --- API 엔드포인트---

@router.post("/ask")
async def ask_chatbot(request: ChatRequest, engine: ChatbotEngine = Depends(get_chatbot_engine)):
    try:
        #엔진을 통해 답변 생성
        result = await engine.answer(request.query, session_id=request.session_id)
        return result if isinstance(result, dict) else {"answer": result, "session_id": request.session_id}
    except Exception as e:
        print(f"챗봇 에러: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Frontend compatibility (chatService.ts uses /answer)
@router.post("/answer")
async def answer_chatbot(request: ChatRequest, engine: ChatbotEngine = Depends(get_chatbot_engine)):
    return await ask_chatbot(request, engine)
    

# 2. 모든 세션 목록 가져오기
@router.get("/sessions")
async def get_sessions(engine: ChatbotEngine = Depends(get_chatbot_engine)):
    try:
        sessions = await engine.get_all_session()
        return sessions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"세션 목록 로드 실패: {e}")
    
    
# 3. 특정 세션의 대화 내역 가져오기 (사이드바 클릭 시)
@router.get("/sessions/{session_id}")
async def get_session_history(session_id: str, engine: ChatbotEngine = Depends(get_chatbot_engine)):
    try:
        # ChatbotEngine에 구현된 get_chat_history 호출
        history = await engine.get_chat_history(session_id)
        if not history:
            raise HTTPException(status_code=404, detail="대화 내역을 찾을 수 없습니다.")
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"내역 로드 실패: {e}")