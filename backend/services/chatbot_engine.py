from typing import Dict, List, Optional
from datetime import datetime, timedelta
import time
import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from backend.services import search_service


class ChatbotEngine:
    """특허 검색 챗봇 엔진 - 세션 관리만"""
    
    def __init__(self):
        # initialize_data()  # search_service의 함수 호출
        
        # MongoDB 설정
        self.mongo_uri = os.getenv("MONGO_URI")
        self.db_name = os.getenv("DB_NAME")
        self.chat_history_ttl_days = int(os.getenv("CHAT_HISTORY_TTL_DAYS", "30"))
        
        # MongoDB 클라이언트
        self.client = AsyncIOMotorClient(self.mongo_uri)
        self.db = self.client[self.db_name]
        
        # 로거
        self.logger = logging.getLogger(__name__)
        
        # 인덱스 생성 플래그
        self._indexes_ensured = False
    
    async def _ensure_indexes_once(self):
        """인덱스를 한 번만 생성"""
        if not self._indexes_ensured:
            await self._ensure_chat_history_indexes()
            self._indexes_ensured = True
    
    async def answer(self, query: str, session_id: Optional[str] = None) -> dict:
        """답변 생성 및 MongoDB에 저장"""
        await self._ensure_indexes_once()
        
        import uuid
        
        # 세션 ID 생성
        if not session_id:
            session_id = str(uuid.uuid4())
            
        # RAG 답변 생성
        answer = await search_service.hybrid_rag_answer(query, top_k=10)
        
        # MongoDB에 저장
        await self.save_message(session_id, query, answer)
        
        return {
            "answer": answer,
            "session_id": session_id
        }
    
    async def save_message(self, session_id: str, user_query: str, ai_answer: str) -> None:
        """메시지를 MongoDB에 저장"""
        collection = self.db["chat_history"]
        now_dt: datetime = datetime.utcnow()
        title: str = (user_query[:25] + "...") if len(user_query) > 25 else user_query
        
        await collection.update_one(
            {"session_id": session_id},
            {
                "$setOnInsert": {
                    "session_id": session_id,
                    "created_at": now_dt,
                    "title": title,
                },
                "$push": {
                    "messages": {
                        "$each": [
                            {"role": "user", "content": user_query, "timestamp": time.time()},
                            {"role": "assistant", "content": ai_answer, "timestamp": time.time()},
                        ]
                    }
                },
                "$set": {
                    "updated_at": now_dt,
                    # TTL 마지막 활동 후 N일 후 만료
                    "expires_at": now_dt + timedelta(days=self.chat_history_ttl_days),
                },
            },
            upsert=True,
        )

    async def get_all_session(self, limit: int = 100) -> list:
        """모든 세션 목록(MongoDB)"""
        collection = self.db["chat_history"]
        cursor = (
            collection.find({}, {"_id": 0, "session_id": 1, "title": 1, "updated_at": 1})
            .sort("updated_at", -1)
            .limit(limit)
        )
        sessions = await cursor.to_list(length=limit)
        
        # updated_at을 timestamp로 변환
        for session in sessions:
            if "updated_at" in session and isinstance(session["updated_at"], datetime):
                session["updated_at"] = int(session["updated_at"].timestamp() * 1000)
                
        return sessions

    async def get_chat_history(self, session_id: str) -> list:
        """특정 세션의 대화 내역(MongoDB)"""
        collection = self.db["chat_history"]
        doc = await collection.find_one(
            {"session_id": session_id},
            {"_id": 0, "messages": 1}
        )
        
        messages = doc.get("messages") if doc else None
        return messages if isinstance(messages, list) else []

    async def delete_session(self, session_id: str) -> bool:
        """세션 삭제"""
        collection = self.db["chat_history"]
        result = await collection.delete_one({"session_id": session_id})
        return bool(getattr(result, "deleted_count", 0))

    async def _ensure_chat_history_indexes(self) -> None:
        """
        MongoDB 인덱스 생성:
        - session_id: 빠른 조회
        - expires_at: TTL 자동 삭제
        """
        try:
            collection = self.db["chat_history"]
            
            # session_id 인덱스
            await collection.create_index(
                [("session_id", 1)],
                name="chat_history_session_id_idx",
            )
            
            # TTL 인덱스: expires_at이 지나면 자동 삭제
            await collection.create_index(
                [("expires_at", 1)],
                expireAfterSeconds=0,
                name="chat_history_expires_at_ttl",
            )
            
            self.logger.info("✅ MongoDB indexes created successfully")
        except Exception as e:
            self.logger.debug("chatbot_engine_chat_history_index_create_failed err=%r", e)
            
        
    # async def answer_stream(self, query: str, session_id: Optional[str] = None):
    #     """실시간 답변 생성(Streaming) 및 완료 후 MongoDB 저장"""
    #     await self._ensure_indexes_once()
    #     import uuid

    #     # 1. 세션 ID 설정
    #     if not session_id:
    #         session_id = str(uuid.uuid4())

    #     # 2. 스트리밍 답변 생성
    #     # 주의: search_service.py에 hybrid_rag_answer_stream 함수를 만들어야 합니다.
    #     full_answer = ""
        
    #     # 여기서 hybrid_rag_answer_stream은 AsyncOpenAI의 stream=True 결과를 yield하는 제너레이터입니다.
    #     from .search_service import hybrid_rag_answer_stream 
        
    #     async for chunk in hybrid_rag_answer_stream(query):
    #         full_answer += chunk
    #         yield chunk  # 프론트엔드로 한 글자씩 전달

    #     # 3. 답변이 모두 완료된 후 MongoDB에 한 번에 저장
    #     await self.save_message(session_id, query, full_answer)