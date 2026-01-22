import os
import re
import asyncio
import logging
import time
import uuid
import json
from urllib.parse import urlsplit, urlunsplit
from dotenv import load_dotenv
from openai import OpenAI
from qdrant_client import QdrantClient
from motor.motor_asyncio import AsyncIOMotorClient

class ChatbotEngine:
    def __init__(self):
        backend_dir: str = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        root_dir: str = os.path.abspath(os.path.join(backend_dir, ".."))
        root_env_path: str = os.path.join(root_dir, ".env")
        backend_env_path: str = os.path.join(backend_dir, ".env")
        load_dotenv(dotenv_path=root_env_path)
        load_dotenv(dotenv_path=backend_env_path, override=True)
        load_dotenv(override=True)
        self.openai_key = os.getenv("OPENAI_API_KEY")
        self.qdrant_url = os.getenv("QDRANT_URL")
        self.qdrant_api_key = os.getenv("QDRANT_API_KEY")
        self.mongo_uri = os.getenv("MONGODB_URI") or os.getenv("MONGO_URI")
        self.chat_model = os.getenv("OPENAI_CHAT_MODEL") or "gpt-5"
        
        self.db_name = os.getenv("DB_NAME") or "moaai_db"
        self.mongo_collection_name = os.getenv("PATENTS_COLLECTION_NAME") or "patents"
        self.qdrant_collection_name = "patent"
        
       
        self.client_openai = OpenAI(api_key=self.openai_key)
        self.client_qdrant = QdrantClient(url=self.qdrant_url, api_key=self.qdrant_api_key)
        self.mongo_client = AsyncIOMotorClient(self.mongo_uri)
        self.db = self.mongo_client[self.db_name]
        
        self.patent_flattened = []
        self.patent_index = {}
        self.is_initialized = False
        self.logger = logging.getLogger(__name__)
        self.logger.info(
            "chatbot_engine_config db_name=%s collection=%s mongo_uri=%s qdrant_collection=%s",
            self.db_name,
            self.mongo_collection_name,
            self._mask_mongo_uri(self.mongo_uri),
            self.qdrant_collection_name,
        )

    def _mask_mongo_uri(self, mongo_uri: str | None) -> str:
        if not mongo_uri:
            return "<EMPTY>"
        try:
            parts = urlsplit(mongo_uri)
            if not parts.netloc:
                return "<INVALID_URI>"
            if "@" not in parts.netloc:
                return urlunsplit((parts.scheme, parts.netloc, parts.path, parts.query, parts.fragment))
            _, host_part = parts.netloc.rsplit("@", 1)
            masked_netloc = f"***@{host_part}"
            return urlunsplit((parts.scheme, masked_netloc, parts.path, parts.query, parts.fragment))
        except Exception:
            return "<UNPARSEABLE_URI>"

    def _truncate_text(self, text: str, max_chars: int) -> str:
        if max_chars <= 0:
            return ""
        if len(text) <= max_chars:
            return text
        return text[:max_chars] + "...[TRUNCATED]"

    def _safe_json_dumps(self, data: object, max_chars: int) -> str:
        try:
            raw: str = json.dumps(data, ensure_ascii=False, default=str)
            return self._truncate_text(raw, max_chars)
        except Exception as e:
            return f"<JSON_DUMP_FAILED err={e!r}>"

    # ===========================================================
    # 1. 초기화 및 유틸리티 
    # ===========================================================
    async def initialize(self):
        if self.is_initialized and len(self.patent_index) > 0:
            return

        start_time_s: float = time.perf_counter()
        try:
            collection = self.db[self.mongo_collection_name]

            # Ensure MongoDB text index exists (best-effort).
            try:
                await collection.create_index(
                    [("title", "text"), ("abstract", "text"), ("claims.text", "text")],
                    name="patent_text_search_index",
                )
            except Exception as e:
                self.logger.debug("chatbot_engine_create_text_index_failed err=%r", e)

            estimated_count: int = await collection.estimated_document_count()
            self.logger.info(
                "chatbot_engine_mongo_target db_name=%s collection=%s estimated_docs=%d",
                self.db_name,
                self.mongo_collection_name,
                estimated_count,
            )
            if estimated_count == 0:
                self.logger.warning(
                    "chatbot_engine_no_patents_loaded db_name=%s collection=%s (check MONGO_URI/MONGODB_URI and DB_NAME)",
                    self.db_name,
                    self.mongo_collection_name,
                )

            try:
                collection_names: list[str] = await self.db.list_collection_names()
                self.logger.debug(
                    "chatbot_engine_mongo_collections db_name=%s collections=%r",
                    self.db_name,
                    collection_names,
                )
            except Exception as e:
                self.logger.debug("chatbot_engine_mongo_list_collections_failed err=%r", e)

            cursor = collection.find({})
            all_patents = await cursor.to_list(length=None)

            self.patent_flattened = []
            self.patent_index = {}

            for p in all_patents:
                raw_no = p.get("applicationNumber") or p.get("app_no")
                # Colab의 find_key_recursive 결과가 리스트일 수 있으므로 처리
                if not raw_no:
                    nums = self.find_key_recursive(p, "applicationNumber")
                    raw_no = nums[0] if nums else None

                app_no = self.normalize_application_number(raw_no)

                if app_no:
                    self.patent_index[app_no] = p
                    context_text = self.build_patent_context_ko(p)
                    self.patent_flattened.append({"app_no": app_no, "text": context_text})

            self.is_initialized = True
            elapsed_ms: float = (time.perf_counter() - start_time_s) * 1000.0
            self.logger.info(
                "chatbot_engine_initialized patents=%d elapsed_ms=%.1f",
                len(self.patent_flattened),
                elapsed_ms,
            )
        except Exception as e:
            self.logger.exception("chatbot_engine_initialize_error err=%r", e)
            return

    def normalize_application_number(self, app_no):
        return re.sub(r"[^0-9]", "", str(app_no)) if app_no else None

    def find_key_recursive(self, data, target_key):
        results = []
        if isinstance(data, dict):
            for k, v in data.items():
                if k == target_key: results.append(v)
                else: results.extend(self.find_key_recursive(v, target_key))
        elif isinstance(data, list):
            for item in data:
                results.extend(self.find_key_recursive(item, target_key))
        return results

    # ===========================================================
    # 2. 데이터 빌더 (Context 구성)
    # ===========================================================
    def extract_inventor_names(self, patent: dict) -> list[str]:
        inventors_value: object = patent.get("inventors")
        if isinstance(inventors_value, list):
            names: list[str] = []
            for inventor_item in inventors_value:
                if isinstance(inventor_item, dict):
                    name_value: object = inventor_item.get("name") or inventor_item.get("engName")
                    if name_value:
                        names.append(str(name_value))
                elif inventor_item:
                    names.append(str(inventor_item))
            return list(dict.fromkeys(names))
        inventor_names_fallback: list[object] = self.find_key_recursive(patent, "name")
        return list(dict.fromkeys([str(v) for v in inventor_names_fallback if v]))

    def extract_applicant_names(self, patent: dict) -> list[str]:
        applicant_value: object = patent.get("applicant")
        if isinstance(applicant_value, dict):
            name_value: object = applicant_value.get("name") or applicant_value.get("engName")
            return [str(name_value)] if name_value else []
        if isinstance(applicant_value, list):
            names: list[str] = []
            for item in applicant_value:
                if isinstance(item, dict):
                    name_value: object = item.get("name") or item.get("engName")
                    if name_value:
                        names.append(str(name_value))
                elif item:
                    names.append(str(item))
            return list(dict.fromkeys(names))
        applicants_fallback: list[object] = self.find_key_recursive(patent, "applicant")
        return list(dict.fromkeys([str(v) for v in applicants_fallback if v]))

    def extract_title_text(self, patent: dict) -> str:
        title_value: object = patent.get("title")
        if isinstance(title_value, dict):
            ko_value: object = title_value.get("ko")
            en_value: object = title_value.get("en")
            if ko_value:
                return str(ko_value)
            if en_value:
                return str(en_value)
        if isinstance(title_value, str) and title_value.strip():
            return title_value
        title_fallback: object = (self.find_key_recursive(patent, "inventionTitle") or self.find_key_recursive(patent, "title"))
        if isinstance(title_fallback, list) and len(title_fallback) > 0:
            return str(title_fallback[0])
        return "제목 없음"

    def find_patents_by_inventor_name(self, inventor_name: str) -> list[dict]:
        normalized_name: str = inventor_name.strip()
        if not normalized_name:
            return []
        results: list[dict] = []
        for app_no, patent in self.patent_index.items():
            inventor_names: list[str] = self.extract_inventor_names(patent)
            if any(normalized_name in name for name in inventor_names):
                title: str = self.extract_title_text(patent)
                results.append({"applicationNumber": app_no, "title": title})
        results.sort(key=lambda x: x.get("applicationNumber") or "")
        return results

    def build_patent_context_ko(self, patent: dict) -> str:
        def first(value: object) -> object:
            return value[0] if isinstance(value, list) and len(value) > 0 else value
        def pick_localized_text(value: object, default_value: str) -> str:
            if value is None:
                return default_value
            if isinstance(value, dict):
                ko: object = value.get("ko")
                en: object = value.get("en")
                if ko:
                    return str(ko)
                if en:
                    return str(en)
                for v in value.values():
                    if v:
                        return str(v)
                return default_value
            return str(value)
        def extract_names_from_person(person: object) -> list[str]:
            if person is None:
                return []
            if isinstance(person, dict):
                name_value: object = person.get("name") or person.get("engName")
                return [str(name_value)] if name_value else []
            if isinstance(person, list):
                names: list[str] = []
                for item in person:
                    names.extend(extract_names_from_person(item))
                return names
            return [str(person)]
        application_number_raw: object = first(self.find_key_recursive(patent, "applicationNumber"))
        application_number: str = self.normalize_application_number(application_number_raw) or "번호 없음"
        title_raw: object = first(self.find_key_recursive(patent, "title"))
        if not title_raw:
            title_raw = first(self.find_key_recursive(patent, "inventionTitle"))
        title: str = pick_localized_text(title_raw, "제목 없음")
        abstract_raw: object = first(self.find_key_recursive(patent, "abstract"))
        if not abstract_raw:
            abstract_raw = first(self.find_key_recursive(patent, "astrtCont"))
        abstract: str = pick_localized_text(abstract_raw, "")
        claims_candidates: list[object] = self.find_key_recursive(patent, "claims")
        if not claims_candidates:
            claims_candidates = self.find_key_recursive(patent, "claim")
        claims_payload: object = first(claims_candidates)
        claims_items: list[object] = []
        if isinstance(claims_payload, list):
            claims_items = claims_payload
        elif claims_payload:
            claims_items = [claims_payload]
        claims_lines: list[str] = []
        for i, claim_item in enumerate(claims_items):
            claim_text: str = ""
            if isinstance(claim_item, dict):
                claim_text = str(claim_item.get("text") or claim_item.get("claim") or claim_item)
            else:
                claim_text = str(claim_item)
            claims_lines.append(f"청구항 {i+1}: {claim_text}")
        claims_text: str = "\n".join(claims_lines) if len(claims_lines) > 0 else "청구항 정보 없음"
        inventors_value: object = first(self.find_key_recursive(patent, "inventors"))
        inventor_names: list[str] = extract_names_from_person(inventors_value)
        inventors_text: str = ", ".join(dict.fromkeys(inventor_names)) if len(inventor_names) > 0 else "미상"
        applicant_value: object = first(self.find_key_recursive(patent, "applicant"))
        applicant_names: list[str] = extract_names_from_person(applicant_value)
        applicants_text: str = ", ".join(dict.fromkeys(applicant_names)) if len(applicant_names) > 0 else "미상"
        sections: list[str] = []
        sections.append(f"### [출원번호: {application_number}] ###")
        sections.append(f"1. 발명의 명칭: {title}")
        sections.append(f"2. 인물 정보: [출원인] {applicants_text} / [발명자] {inventors_text}")
        if abstract:
            sections.append(f"3. 요약: {abstract}")
        sections.append(f"4. 청구항 범위:\n{claims_text}")
        sections.append("---")
        return "\n".join(sections)
           
           
        
 
    # ===========================================================
    # 3. 검색 엔진 (LLM 키워드 + 벡터 + 매칭)
    # ===========================================================
    def extract_weighted_keywords_llm(self, query: str):
        request_id: str = uuid.uuid4().hex[:10]
        start_time_s: float = time.perf_counter()
        try:
            self.logger.debug("keyword_extract_start request_id=%s query=%r", request_id, query)
            resp = self.client_openai.chat.completions.create(
                model="gpt-5", 
                messages=[{
                    "role": "user",
                    "content": f"다음 문장에서 특허 검색용 키워드만 '단어:가중치' 형식으로 추출하세요.\n"
                    "규칙:\n"
                    "- 특허 DB에서 검색 필드(ex 출원인/발명자/기술명 등)로 바로 사용할 수 있는 단어만 포함 \n"
                    "- 질문 결과를 설명하기 위한 단어(ex 개수, 이름, 무엇, 몇 개 등)는 절대 포함하지 말 것\n"
                    "- 출원인·발명자 이름이 존재할 경우 최우선\n"
                    "- 문장에 실제 등장한 단어만 사용\n"
                    "- 조사/어미 제거\n"
                    "- 가중치는 0~1 (0.1 단위)\n"
                    "- 형식: 단어:가중치\n" 
                    "- 줄바꿈으로 구분\n"
                    "- 설명 없이 출력"
                  f"문장: {query}"
                }]
            )
            raw = resp.choices[0].message.content.strip()
            weighted_keywords = []
            for line in raw.splitlines():
                if ":" in line:
                    parts = line.split(":")
                    if len(parts) == 2:
                        weighted_keywords.append((parts[0].strip(), float(parts[1].strip())))
            elapsed_ms: float = (time.perf_counter() - start_time_s) * 1000.0
            raw_preview: str = (raw[:500] + "...") if len(raw) > 500 else raw
            # self.logger.debug(
            #     "keyword_extract_done request_id=%s keywords=%r raw_preview=%r elapsed_ms=%.1f",
            #     request_id,
            #     weighted_keywords,
            #     raw_preview,
            #     elapsed_ms,
            # )
            return weighted_keywords
        except Exception as e:
            self.logger.exception("keyword_extract_error request_id=%s err=%r", request_id, e)
            return []

    def qdrant_search_app_number(self, query: str, limit: int):
        request_id: str = uuid.uuid4().hex[:10]
        start_time_s: float = time.perf_counter()
        # self.logger.debug("qdrant_search_start request_id=%s limit=%d query=%r", request_id, limit, query)
        emb = self.client_openai.embeddings.create(model="text-embedding-3-large", input=query)
        vector = emb.data[0].embedding
        results = self.client_qdrant.query_points(
            collection_name=self.qdrant_collection_name,
            query=vector,
            limit=limit,
            with_payload=True
        )
        app_numbers = [self.normalize_application_number(r.payload.get("applicationNumber")) for r in results.points]
        elapsed_ms: float = (time.perf_counter() - start_time_s) * 1000.0
        # self.logger.debug("qdrant_search_done request_id=%s results=%r elapsed_ms=%.1f", request_id, app_numbers, elapsed_ms)
        return app_numbers

    async def simple_match_search_app_number(self, query: str, limit: int):
        request_id: str = uuid.uuid4().hex[:10]
        start_time_s: float = time.perf_counter()
        
        #키워드 추출 
        weighted_keywords = self.extract_weighted_keywords_llm(query)
        if not weighted_keywords: return []
        
        #검색 키워드를 공백으로 연결 
        search_terms = " ".join([k for k, _ in weighted_keywords])
        
        #MongoDB $text 검색 실행
        collection = self.db[self.mongo_collection_name]
        cursor = collection.find(
            {"$text": {"$search": search_terms}},
            {"score": {"$meta": "textScore"}, "applicationNumber":1}
        ).sort([("score", {"$meta": "textScore"})]).limit(limit)
        
        
        results = await cursor.to_list(length=limit)
        
        # 결과 정리 및 정규화
        app_numbers = [
            self.normalize_application_number(r.get("applicationNumber"))
            for r in results
            if r.get("applicationNumber")
        ]
        
        elapsed_ms: float = (time.perf_counter() - start_time_s) * 1000.0
        self.logger.info(f"🚀 [KEYWORD_MATCH_OPTIMIZED] ID:{request_id} | Time:{elapsed_ms:.1f}ms")
        
        
        # weighted_keywords = sorted(
        #     weighted_keywords,
        #     key=lambda x: x[1],
        #     reverse=True
        # )

        # scored = []
        # for p in self.patent_flattened:
        #     text = p["text"]
            
        #     count_vector = tuple(text.count(k) for k, _ in weighted_keywords)
            
            
        #     if any(c > 0 for c in count_vector):
        #         scored.append((count_vector, p["app_no"]))

        # scored.sort(key=lambda x: x[0], reverse=True)
        
        
        # app_numbers = [app_no for _, app_no in scored[:limit]]
        # elapsed_ms: float = (time.perf_counter() - start_time_s) * 1000.0
        return app_numbers

    # ===========================================================
    # 4. 하이브리드 리트리버 및 답변
    # ===========================================================
    async def hybrid_retrieve(self, query: str, target_k: int):
        request_id: str = uuid.uuid4().hex[:10]
        start_time = time.perf_counter()
        # self.logger.info("hybrid_retrieve_start request_id=%s target_k=%d", request_id, target_k)
        
        #키워드 매칭 검색 (LLM 키워드 추출 시간 포함)
        match_start = time.perf_counter()
        
        #재사용하기 위해 키워드를 따로 추출하거나 simple_match 내부에서 가져온다.
        weighted_keywords = self.extract_weighted_keywords_llm(query)
        s_apps = await self.simple_match_search_app_number(query,target_k)
        match_elapsed = (time.perf_counter()- match_start)*1000.0
        
        #2.Qdrant 벡터 검색
        qdrant_start = time.perf_counter()
        q_apps = self.qdrant_search_app_number(query, target_k)
        qdrant_elapsed = (time.perf_counter()- qdrant_start) * 1000.0
        # self.logger.debug("hybrid_candidates request_id=%s match=%r qdrant=%r", request_id, s_apps, q_apps)
        
        
        
        #3.데이터 병합 및 문서 빌드 
        merge_start = time.perf_counter()
        used = set()
        docs = []
        for i in range(target_k):
            # MATCH 우선 순위로 교차 결합
            for source, app_list in [("MATCH", s_apps), ("QDRANT", q_apps)]:
                if i < len(app_list):
                    app = app_list[i]
                    if app not in used and app in self.patent_index:
                        used.add(app)
                        docs.append((source, app, self.build_patent_context_ko(self.patent_index[app])))
                if len(docs) >= target_k:
                    break
            if len(docs) >= target_k:
                break
            
        #Reranking: 모델이 가장 중요한 정보를 먼저 읽도록 재정렬
        search_terms = [k for k, _ in weighted_keywords]
        docs.sort(key=lambda x: sum(x[2].count(term) for term in search_terms), reverse = True)
                     
        merge_elapsed = (time.perf_counter() - merge_start) * 1000.0
        total_retrieval_ms = (time.perf_counter() - start_time) * 1000.0
        
        self.logger.info(
            f"[RETRIEVAL_DETAIL] ID:{request_id} | Match:{match_elapsed:.1f}ms | "
            f"Qdrant:{qdrant_elapsed:.1f}ms | Merge:{merge_elapsed:.1f}ms | Total:{total_retrieval_ms:.1f}ms"
        )
        return docs, {
            "match_ms": match_elapsed,
            "qdrant_ms": qdrant_elapsed,
            "merge_ms": merge_elapsed
        }

    async def answer(self, query: str, top_k: int = 50, session_id: str | None = None):
        request_id = uuid.uuid4().hex[:10]
        full_start = time.perf_counter()
        current_session_id: str = session_id or request_id
        
        # 1. DB 로드
        init_start = time.perf_counter()
        await self.initialize()
        init_elapsed = (time.perf_counter() - init_start) * 1000.0
        
        # 2. Hybrid Retrieval
        retrieve_start = time.perf_counter()
        docs_data, retrieve_details = await self.hybrid_retrieve(query, top_k)
        retrieve_elapsed = (time.perf_counter() - retrieve_start) * 1000.0
        
        if not docs_data:
            return "정보를 찾을 수 없습니다."

        try:
            # 3. Context Formatting
            context_start = time.perf_counter()
            context = "\n".join([f"[DOC {i+1} | {app_no} | {src}]\n{txt}" for i, (src, app_no, txt) in enumerate(docs_data)])
            
            max_context_chars = int(os.getenv("OPENAI_MAX_CONTEXT_CHARS") or 400000)
            if len(context) > max_context_chars:
                context = context[:max_context_chars] + "\n\n[TRUNCATED]"
            
            context_elapsed = (time.perf_counter() - context_start) * 1000.0

            # 4. LLM Generation
            llm_start = time.perf_counter()
            resp = self.client_openai.chat.completions.create(
                model=self.chat_model,
                messages=[{"role": "user", "content": self.build_prompt(query, context)}],
            )
            answer_text = resp.choices[0].message.content.strip()
            llm_elapsed = (time.perf_counter() - llm_start) * 1000.0
            
            #DB에 대화 기록 저장 (session_id는 함수 인자로 넘어온 것 사용)
            await self.save_message(current_session_id, query, answer_text)
            
            # 5. Perf Report
            total_elapsed_ms = (time.perf_counter() - full_start) * 1000.0
            
            perf_report = (
                f"\n{'='*65}\n"
                f" [PERF_REPORT] ID: {request_id} | docs: {len(docs_data)}\n"
                f"{'-'*65}\n"
                f"1. Initialize DB     : {init_elapsed:>10.1f} ms\n"
                f"2. Hybrid Retrieval  : {retrieve_elapsed:>10.1f} ms\n"
                f"   └─ Keyword Match  : {retrieve_details['match_ms']:>10.1f} ms\n"
                f"   └─ Qdrant Search  : {retrieve_details['qdrant_ms']:>10.1f} ms\n"
                f"   └─ Merge & Context: {retrieve_details['merge_ms']:>10.1f} ms\n"
                f"3. Build Final Prompt: {context_elapsed:>10.1f} ms\n"
                f"4. LLM Generation    : {llm_elapsed:>10.1f} ms\n"
                f"{'-'*65}\n"
                f" TOTAL ELAPSED     : {total_elapsed_ms:>10.1f} ms ({total_elapsed_ms/1000:.2f}s)\n"
                f"{'='*65}"
            )
            
            self.logger.info(perf_report)
            print(perf_report)
            
            return {
                "answer": answer_text,
                "session_id": current_session_id,
            }

        except Exception as e:
            self.logger.exception(f"answer_error ID={request_id} err={e!r}")
            return {
                "answer": f"답변 생성 에러: {e}",
                "session_id": current_session_id,
            }

    def build_prompt(self, query: str, context: str) -> str:
        return f"""당신은 한양대학교 ERICA 산학협력단의 전문 특허 분석가입니다. 주어진 50개의 특허 문서(DOC 1 ~ DOC 50)를 바탕으로 질문에 답하세요. 
RULES:
- 반드시 제공된 [CONTEXT] 내의 정보만을 사용하세요.
- 답변 시 근거가 되는 문서 번호를 언급하세요 (예: [DOC 5]에 따르면...).
- 50개의 문서를 종합적으로 분석하여 누락되는 특허가 없도록 하세요.
- 만약 질문에 해당하는 특허가 여러 개라면 목록 형태로 정리해 주세요.
- 정보가 없다면 "제공된 데이터 내에서는 관련 내용을 찾을 수 없습니다"라고 답하세요.

[CONTEXT]
{context}

[QUESTION]
{query}

[ANSWER]
"""

    # ===========================================================
    # 5. 대화 기록 관리 (History)
    # ===========================================================

    async def save_message(self, session_id: str, user_query: str, ai_answer: str) -> None:
        """채팅 메시지를 MongoDB의 chat_history 컬렉션에 저장함."""
        collection = self.db["chat_history"]
        now: float = time.time()
        await collection.update_one(
            {"session_id": session_id},
            {
                "$push": {
                    "messages": {
                        "$each": [
                            {"role": "user", "content": user_query, "timestamp": now},
                            {"role": "assistant", "content": ai_answer, "timestamp": now},
                        ]
                    }
                },
                "$set": {"updated_at": now},
                "$setOnInsert": {"title": (user_query[:25] + "...") if len(user_query) > 25 else user_query},
            },
            upsert=True,
        )

    async def get_all_session(self, limit: int = 50) -> list[dict]:
        """사이드바 목록용: 모든 채팅 세션 리스트를 가져옴."""
        collection = self.db["chat_history"]
        cursor = collection.find({}, {"session_id": 1, "title": 1, "updated_at": 1}).sort("updated_at", -1).limit(limit)
        return await cursor.to_list(length=limit)

    async def get_chat_history(self, session_id: str) -> list[dict]:
        """특정 세션 클릭 시: 과거 대화 내역 전체를 반환함"""
        collection = self.db["chat_history"]
        doc = await collection.find_one({"session_id": session_id}, {"messages": 1})
        messages = doc.get("messages") if doc else None
        return messages if isinstance(messages, list) else []
