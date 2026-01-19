import os
import re
import asyncio
from dotenv import load_dotenv
from openai import OpenAI
from qdrant_client import QdrantClient
from motor.motor_asyncio import AsyncIOMotorClient

class ChatbotEngine:
    def __init__(self):
        load_dotenv()
        self.openai_key = os.getenv("OPENAI_API_KEY")
        self.qdrant_url = os.getenv("QDRANT_URL")
        self.qdrant_api_key = os.getenv("QDRANT_API_KEY")
        self.mongo_uri = os.getenv("MONGODB_URI") or os.getenv("MONGO_URI")
        
        # 컬렉션 설정
        self.db_name = "moaai_db"
        self.mongo_collection_name = "patents"
        self.qdrant_collection_name = "patent"
        if not self.mongo_uri:
            raise ValueError("Missing MongoDB connection string. Set MONGODB_URI (or MONGO_URI).")

        self.client_openai = OpenAI(api_key=self.openai_key)
        self.client_qdrant = QdrantClient(url=self.qdrant_url, api_key=self.qdrant_api_key)
        
        self.mongo_client = AsyncIOMotorClient(self.mongo_uri)
        self.db = self.mongo_client[self.db_name]
        
        self.patent_flattened = []
        self.is_initialized = False

    async def initialize(self):
        """MongoDB 데이터를 메모리에 로드하여 하이브리드 검색 준비"""
        if self.is_initialized: return
        try:
            collection = self.db[self.mongo_collection_name] 
            cursor = collection.find({})
            all_patents = await cursor.to_list(length=None)
            
            self.patent_flattened = []
            for p in all_patents:
                app_no = p.get("applicationNumber") or p.get("app_no")
                if app_no:
                    self.patent_flattened.append({
                        "app_no": self.normalize_application_number(str(app_no)),
                        "text": self.build_patent_context_ko(p)
                    })
            self.is_initialized = True
            print(f"✅ 초기화 완료: {len(self.patent_flattened)}개의 특허 로드됨")
        except Exception as e:
            print(f"❌ 초기화 에러: {e}")

    def normalize_application_number(self, app_no):
        return re.sub(r"[^0-9]", "", str(app_no)) if app_no else None

    async def get_patent_by_app_no(self, app_no: str):
        return await self.db[self.mongo_collection_name].find_one({
            "$or": [
                {"applicationNumber": {"$regex": app_no}},
                {"app_no": {"$regex": app_no}}
            ]
        })

    def build_patent_context_ko(self, patent: dict) -> str:
        title_obj = patent.get("title", {})
        title = title_obj.get("ko") or title_obj.get("en") or patent.get("title") or "제목 없음"
        inventors = ", ".join([inv.get("name", str(inv)) for inv in patent.get("inventors", [])])
        applicant = patent.get("applicant", {}).get("name", "미상") if isinstance(patent.get("applicant"), dict) else str(patent.get("applicant"))
        abstract = patent.get("abstract") or "요약 정보 없음"
        app_no = patent.get("applicationNumber") or patent.get("app_no") or "번호 없음"
        return f"[출원번호] {app_no}\n[명칭] {title}\n[출원인] {applicant}\n[발명자] {inventors}\n[요약] {abstract}"

    def extract_weighted_keywords_llm(self, query: str):
        """[규칙 반영] 검색용 핵심 키워드 추출"""
        resp = self.client_openai.chat.completions.create(
            model="gpt-5", 
            messages=[
                {
                    "role": "user",
                    "content": f"""
다음 문장에서 특허 검색에 **직접 사용될 핵심 키워드**와 그 중요도(가중치)를 추출하세요.

[규칙]
- 특허 DB에서 검색 필드(ex 출원인/발명자/기술명 등)로 바로 사용할 수 있는 단어만 포함
- 질문 결과를 설명하기 위한 단어(ex 개수, 이름, 무엇, 몇 개 등)는 절대 포함하지 말 것
- 출원인·발명자 이름이 존재할 경우 최우선 가중치 부여
- 문장에 실제 등장한 단어만 사용하고 조사/어미 제거
- 가중치는 0~1 (0.1 단위)
- 형식: 단어:가중치 (설명 없이 줄바꿈으로만 구분)

문장: {query}
"""
                }
            ],
        )
        raw = resp.choices[0].message.content.strip()
        print(f"\n🧠 [키워드 추출 결과]\n{raw}")
        weighted_keywords = []
        for line in raw.splitlines():
            if ":" in line:
                try:
                    k, w = line.split(":", 1)
                    weighted_keywords.append((k.strip(), float(w.strip())))
                except: continue
        return weighted_keywords

    def build_prompt(self, query: str, context: str) -> str:
        """[RULES 반영] 최종 답변 생성을 위한 프롬프트"""
        return f"""
당신은 한양대학교 ERICA 산학협력단이 보유한 특허 데이터베이스를 잘 이해하고 사용하는 전문 특허 분석가입니다.

RULES:
- CONTEXT만을 근거로 하고, 외부 지식이나 새로운 사실은 절대 추가하지 말 것.
- CONTEXT를 직접 읽는 것처럼 말하지 말고, 전문가 관점에서 자연스럽게 설명하세요.
- 주어진 PATENT의 내용을 기반으로 정확한 정보만을 제공하세요.
- 주어진 PATENT에 정확한 정보가 없다면 알 수 없다고 답하세요.
- 질문의 의도를 파악하여 조건에 맞는 내용만 명료하게 답하세요.

[CONTEXT]
{context}

[QUESTION]
{query}

[ANSWER]
"""

    async def hybrid_retrieve(self, query: str, target_k: int):
        # 1. 벡터 검색 (Qdrant)
        emb = self.client_openai.embeddings.create(model="text-embedding-3-large", input=query)
        vector = emb.data[0].embedding
        qdrant_apps = []
        try:
            results = self.client_qdrant.query_points(
                collection_name=self.qdrant_collection_name,
                query=vector,
                limit=target_k,
                with_payload=True
            )
            for r in results.points:
                raw_no = r.payload.get("applicationNumber") or r.payload.get("app_no")
                qdrant_apps.append(self.normalize_application_number(str(raw_no)))
        except Exception as e:
            print(f"⚠️ Qdrant 에러: {e}")

        # 2. 키워드 검색 (Lexicographical)
        weighted_keywords = sorted(self.extract_weighted_keywords_llm(query), key=lambda x: x[1], reverse=True)
        keyword_scored = []
        for p in self.patent_flattened:
            count_vector = tuple(p["text"].count(k) for k, _ in weighted_keywords)
            if any(c > 0 for c in count_vector):
                keyword_scored.append((count_vector, p["app_no"]))
        
        keyword_scored.sort(key=lambda x: x[0], reverse=True)
        keyword_apps = [app_no for _, app_no in keyword_scored[:target_k]]

        # 3. 결과 통합
        combined_apps = []
        seen = set()
        for app in (qdrant_apps + keyword_apps):
            if app and app not in seen:
                combined_apps.append(app)
                seen.add(app)

        # 4. 상세 데이터 로드
        docs = []
        for app_no in combined_apps[:target_k]:
            data = await self.get_patent_by_app_no(app_no)
            if data: docs.append(self.build_patent_context_ko(data))
        return docs

    async def answer(self, query: str, top_k: int = 10):
        await self.initialize()
        docs = await self.hybrid_retrieve(query, top_k)
        if not docs: return "검색된 특허 정보가 없습니다."
        
        prompt = self.build_prompt(query, "\n\n---\n\n".join(docs))
        resp = self.client_openai.chat.completions.create(
            model="gpt-5", # 요청하신 대로 GPT-5 적용
            messages=[
                {"role": "system", "content": "당신은 유능한 특허 분석가입니다."},
                {"role": "user", "content": prompt}
            ]
        )
        return resp.choices[0].message.content.strip()

if __name__ == "__main__":
    async def main():
        engine = ChatbotEngine()
        ans = await engine.answer("남태규가 발명한 특허들에 대해 설명해줘")
        print(f"\n▶ ANSWER:\n{ans}")
    asyncio.run(main())