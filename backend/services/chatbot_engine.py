import os
import re
import asyncio
import logging
import time
import uuid
import json
from datetime import datetime, timedelta
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

        ttl_days_raw: str = (os.getenv("CHAT_HISTORY_TTL_DAYS") or "").strip()
        ttl_days: int = 30
        if ttl_days_raw.isdigit():
            ttl_days = int(ttl_days_raw)
        if ttl_days < 1:
            ttl_days = 30
        self.chat_history_ttl_days: int = ttl_days
        
       
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


    # ===========================================================
    # 1. 초기화 및 유틸리티 
    # ===========================================================
    async def initialize(self):
        # Ensure indexes exist even if we skip patent initialization.
        await self._ensure_chat_history_indexes()

        # 이미 초기화된 경우 바로 리턴
        if self.is_initialized and len(self.patent_index) > 0:
            self.logger.debug("chatbot_engine_initialize_skip: already initialized")
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
            # 초기화 실패 시 is_initialized는 그대로 False 유지
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
                model=self.chat_model, 
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
                    "- 설명 없이 출력\n"
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
            return weighted_keywords
        except Exception as e:
            self.logger.exception("keyword_extract_error request_id=%s err=%r", request_id, e)
            return []

    def qdrant_search_app_number(self, query: str, limit: int):
        request_id: str = uuid.uuid4().hex[:10]
        start_time_s: float = time.perf_counter()
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
        return app_numbers

    async def simple_match_search_app_number(
        self,
        weighted_keywords: list[tuple[str, float]],
        limit: int,
        request_id: str | None = None,
    ) -> list[str]:
        """
        1. MongoDB $text로 limit*2 개수만큼 후보를 가져온 뒤
        2. LLM 추출 키워드 + 가중치 기반으로 재스코어링
        3. 최종적으로 limit*(2/3) 만큼의 출원번호를 반환
           (후보 수가 그보다 적으면 있는 것만 반환)
        """
        if not weighted_keywords or limit <= 0:
            return []

        # 1) 검색어 문자열 생성
        search_terms = " ".join([k for k, _ in weighted_keywords if k])
        if not search_terms:
            return []

        collection = self.db[self.mongo_collection_name]

        # 2) Mongo에서 limit의 2배만큼 후보 가져오기 (textScore 순)
        mongo_limit = limit * 2
        mongo_find_start: float = time.perf_counter()
        cursor = collection.find(
            {"$text": {"$search": search_terms}},
            {
                "score": {"$meta": "textScore"},
                "applicationNumber": 1,
            },
        ).sort([("score", {"$meta": "textScore"})]).limit(mongo_limit)

        results = await cursor.to_list(length=mongo_limit)
        mongo_find_ms: float = (time.perf_counter() - mongo_find_start) * 1000.0
        self._log_match_detail(
            "[MATCH_DETAIL] ID=%s step=mongo_text_search elapsed_ms=%.1f candidates=%d search_terms=%r",
            request_id or "-",
            mongo_find_ms,
            len(results) if isinstance(results, list) else 0,
            search_terms,
        )
        if not results:
            return []

        # applicationNumber 정규화 + 중복 제거
        candidates: list[str] = []
        seen = set()
        for r in results:
            raw_app = r.get("applicationNumber")
            app_no = self.normalize_application_number(raw_app)
            if app_no and app_no not in seen:
                seen.add(app_no)
                candidates.append(app_no)

        if not candidates:
            return []

        # 3) patent_flattened에서 app_no -> text 매핑
        text_map_start: float = time.perf_counter()
        text_map = {p["app_no"]: p["text"] for p in self.patent_flattened}
        text_map_ms: float = (time.perf_counter() - text_map_start) * 1000.0
        self._log_match_detail(
            "[MATCH_DETAIL] ID=%s step=prepare_text_map elapsed_ms=%.1f size=%d",
            request_id or "-",
            text_map_ms,
            len(text_map),
        )

        # 4) 키워드 가중치 기반 스코어 계산
        rescore_start: float = time.perf_counter()
        scored: list[tuple[float, str]] = []
        for app_no in candidates:
            text = text_map.get(app_no)
            if not text:
                continue

            score = 0.0
            for keyword, weight in weighted_keywords:
                if not keyword:
                    continue
                count = text.count(keyword)
                if count > 0:
                    score += count * weight

            scored.append((score, app_no))

        rescore_ms: float = (time.perf_counter() - rescore_start) * 1000.0
        self._log_match_detail(
            "[MATCH_DETAIL] ID=%s step=keyword_rescore elapsed_ms=%.1f docs=%d keywords=%d",
            request_id or "-",
            rescore_ms,
            len(candidates),
            len(weighted_keywords),
        )

        # 키워드 기반 스코어를 전혀 못 만든 경우 → Mongo 순서대로 사용
        max_mongo = int(limit * (2 / 3)) or 1  # 최소 1개는 가져오도록
        if not scored:
            return candidates[:max_mongo] if len(candidates) > max_mongo else candidates

        # 5) 점수 내림차순 정렬 후 limit*2/3 만큼만 사용
        scored.sort(key=lambda x: x[0], reverse=True)
        top_scored = scored[:max_mongo] if len(scored) > max_mongo else scored
        top_app_numbers = [app_no for _, app_no in top_scored]
        return top_app_numbers



    # ===========================================================
    # 4. 하이브리드 리트리버 및 답변
    # ===========================================================
    async def hybrid_retrieve(self, query: str, target_k: int):
        request_id: str = uuid.uuid4().hex[:10]
        start_time = time.perf_counter()

        # -----------------------------------------------------------
        # 1. 키워드 추출 (LLM)
        # -----------------------------------------------------------
        match_start = time.perf_counter()
        keyword_timeout_s_raw: str = (os.getenv("OPENAI_KEYWORD_TIMEOUT_SECONDS") or "").strip()
        keyword_timeout_s: float = 15.0
        try:
            if keyword_timeout_s_raw:
                keyword_timeout_s = float(keyword_timeout_s_raw)
        except Exception:
            keyword_timeout_s = 15.0
        if keyword_timeout_s <= 0:
            keyword_timeout_s = 15.0
        kw_llm_start: float = time.perf_counter()
        try:
            weighted_keywords = await asyncio.wait_for(
                asyncio.to_thread(self.extract_weighted_keywords_llm, query),
                timeout=keyword_timeout_s,
            )
        except asyncio.TimeoutError:
            self.logger.warning(
                "[HYBRID] keyword_extract_timeout ID=%s timeout_s=%.1f",
                request_id,
                keyword_timeout_s,
            )
            weighted_keywords = []
        kw_llm_ms: float = (time.perf_counter() - kw_llm_start) * 1000.0
        self._log_match_detail(
            "[MATCH_DETAIL] ID=%s step=keyword_llm elapsed_ms=%.1f keywords=%d",
            request_id,
            kw_llm_ms,
            len(weighted_keywords),
        )

        # 1단계: Mongo 기반 MATCH (limit*2 후보 → 키워드 재랭킹 → limit*2/3 사용)
        if weighted_keywords:
            try:
                mongo_apps = await self.simple_match_search_app_number(
                    weighted_keywords,
                    target_k,
                    request_id=request_id,
                )
            except Exception as e:
                self.logger.exception(
                    f"[HYBRID] Mongo match search failed ID={request_id} err={e!r}"
                )
                mongo_apps = []
        else:
            mongo_apps = []

        match_elapsed = (time.perf_counter() - match_start) * 1000.0

        # -----------------------------------------------------------
        # 2. Qdrant에서 남은 개수 채우기
        # -----------------------------------------------------------
        qdrant_start = time.perf_counter()

        remaining = max(0, target_k - len(mongo_apps))
        qdrant_apps: list[str] = []

        if remaining > 0:
            try:
                # 중복 제거를 위해 넉넉히 가져온 뒤 필터링
                qdrant_timeout_s_raw: str = (os.getenv("QDRANT_TIMEOUT_SECONDS") or "").strip()
                qdrant_timeout_s: float = 10.0
                try:
                    if qdrant_timeout_s_raw:
                        qdrant_timeout_s = float(qdrant_timeout_s_raw)
                except Exception:
                    qdrant_timeout_s = 10.0
                if qdrant_timeout_s <= 0:
                    qdrant_timeout_s = 10.0
                qdrant_raw = await asyncio.wait_for(
                    asyncio.to_thread(
                        self.qdrant_search_app_number,
                        query,
                        target_k * 3,  # limit
                    ),
                    timeout=qdrant_timeout_s,
                )

                used = set(mongo_apps)
                for app_no in qdrant_raw:
                    app_no = self.normalize_application_number(app_no)
                    if not app_no:
                        continue
                    if app_no in used:
                        # 3번 요구사항: Mongo 결과와 겹치는 특허는 제외
                        continue
                    used.add(app_no)
                    qdrant_apps.append(app_no)
                    if len(qdrant_apps) >= remaining:
                        break

            except Exception as e:
                self.logger.exception(
                    f"[HYBRID] Qdrant search failed ID={request_id} err={e!r}"
                )
                qdrant_apps = []
            except asyncio.TimeoutError:
                self.logger.warning(
                    "[HYBRID] qdrant_search_timeout ID=%s timeout_s=%.1f",
                    request_id,
                    qdrant_timeout_s,
                )
                qdrant_apps = []

        qdrant_elapsed = (time.perf_counter() - qdrant_start) * 1000.0

        # -----------------------------------------------------------
        # 3. 최종 app_no 리스트 구성 (중복 없이 최대 target_k개)
        # -----------------------------------------------------------
        merge_start = time.perf_counter()

        final_app_nos: list[str] = []
        used_final = set()

        # 먼저 Mongo 결과 (검색 품질 우선)
        for app_no in mongo_apps:
            if app_no and app_no in self.patent_index and app_no not in used_final:
                used_final.add(app_no)
                final_app_nos.append(app_no)
                if len(final_app_nos) >= target_k:
                    break

        # 남은 개수는 Qdrant에서 채우기
        if len(final_app_nos) < target_k:
            for app_no in qdrant_apps:
                if app_no and app_no in self.patent_index and app_no not in used_final:
                    used_final.add(app_no)
                    final_app_nos.append(app_no)
                    if len(final_app_nos) >= target_k:
                        break

        # -----------------------------------------------------------
        # 4. app_no 기반으로 context 문서 구성 (Mongo에서 재구성)
        #    docs: (source, app_no, text)
        # -----------------------------------------------------------
        docs = []
        for app_no in final_app_nos:
            try:
                patent = self.patent_index.get(app_no)
                if not patent:
                    continue
                txt = self.build_patent_context_ko(patent)
                source = "MATCH" if app_no in mongo_apps else "QDRANT"
                docs.append((source, app_no, txt))
            except Exception as e:
                self.logger.exception(
                    f"[HYBRID] Build context failed for app_no={app_no} err={e!r}"
                )

        merge_elapsed = (time.perf_counter() - merge_start) * 1000.0
        total_ms = (time.perf_counter() - start_time) * 1000.0

        self.logger.info(
            f"[RETRIEVAL_DETAIL] ID:{request_id} | "
            f"Match:{match_elapsed:.1f}ms | "
            f"Qdrant:{qdrant_elapsed:.1f}ms | "
            f"Merge:{merge_elapsed:.1f}ms | "
            f"Total:{total_ms:.1f}ms | "
            f"Mongo_docs={len(mongo_apps)} Qdrant_docs={len(qdrant_apps)} Final={len(docs)}"
        )

        return docs, {
            "match_ms": match_elapsed,
            "qdrant_ms": qdrant_elapsed,
            "merge_ms": merge_elapsed,
        }



    async def answer(self, query: str, session_id: str | None = None, top_k: int = 50) -> dict:
        request_id: str = uuid.uuid4().hex[:10]
        full_start: float = time.perf_counter()
        current_session_id: str = session_id or uuid.uuid4().hex[:12]
        init_start: float = time.perf_counter()
        await self.initialize()
        init_elapsed: float = (time.perf_counter() - init_start) * 1000.0
        retrieve_start: float = time.perf_counter()
        docs_data, retrieve_details = await self.hybrid_retrieve(query, top_k)
        retrieve_elapsed: float = (time.perf_counter() - retrieve_start) * 1000.0
        if not docs_data:
            answer_text: str = "정보를 찾을 수 없습니다."
            await self.save_message(current_session_id, query, answer_text)
            return {"answer": answer_text, "session_id": current_session_id}
        try:
            context_start: float = time.perf_counter()
            context: str = "\n".join(
                [f"[DOC {i+1} | {app_no}]\n{txt}" for i, (_src, app_no, txt) in enumerate(docs_data)]
            )
            max_context_chars: int = int(os.getenv("OPENAI_MAX_CONTEXT_CHARS") or 400000)
            if len(context) > max_context_chars:
                context = context[:max_context_chars] + "\n\n[TRUNCATED]"
            context_elapsed: float = (time.perf_counter() - context_start) * 1000.0
            llm_start: float = time.perf_counter()
            llm_timeout_s_raw: str = (os.getenv("OPENAI_CHAT_TIMEOUT_SECONDS") or "").strip()
            # Default increased to allow long generations without trimming context.
            llm_timeout_s: float = 240.0
            try:
                if llm_timeout_s_raw:
                    llm_timeout_s = float(llm_timeout_s_raw)
            except Exception:
                llm_timeout_s = 240.0
            if llm_timeout_s <= 0:
                llm_timeout_s = 240.0
            self.logger.info(
                "openai_chat_start ID=%s session_id=%s timeout_s=%.1f model=%s",
                request_id,
                current_session_id,
                llm_timeout_s,
                self.chat_model,
            )
            resp = await asyncio.wait_for(
                asyncio.to_thread(
                    self.client_openai.chat.completions.create,
                    model=self.chat_model,
                    messages=[{"role": "user", "content": self.build_prompt(query, context)}],
                ),
                timeout=llm_timeout_s,
            )
            answer_text: str = (resp.choices[0].message.content or "").strip()
            llm_elapsed: float = (time.perf_counter() - llm_start) * 1000.0
            self.logger.info(
                "openai_chat_done ID=%s session_id=%s elapsed_ms=%.1f",
                request_id,
                current_session_id,
                llm_elapsed,
            )
            await self.save_message(current_session_id, query, answer_text)
            total_elapsed_ms: float = (time.perf_counter() - full_start) * 1000.0
            perf_report: str = (
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
            return {"answer": answer_text, "session_id": current_session_id}
        except asyncio.TimeoutError:
            llm_timeout_s_raw2: str = (os.getenv("OPENAI_CHAT_TIMEOUT_SECONDS") or "").strip()
            llm_timeout_s2: float = 240.0
            try:
                if llm_timeout_s_raw2:
                    llm_timeout_s2 = float(llm_timeout_s_raw2)
            except Exception:
                llm_timeout_s2 = 240.0
            if llm_timeout_s2 <= 0:
                llm_timeout_s2 = 240.0
            self.logger.warning(
                "openai_chat_timeout ID=%s session_id=%s timeout_s=%.1f",
                request_id,
                current_session_id,
                llm_timeout_s2,
            )
            answer_text: str = f"답변 생성 에러: OpenAI timeout after {llm_timeout_s2:.0f}s"
            await self.save_message(current_session_id, query, answer_text)
            return {"answer": answer_text, "session_id": current_session_id}
        except Exception as e:
            self.logger.exception(f"answer_error ID={request_id} err={e!r}")
            answer_text: str = f"답변 생성 에러: {e}"
            await self.save_message(current_session_id, query, answer_text)
            return {"answer": answer_text, "session_id": current_session_id}

    async def save_message(self, session_id: str, user_query: str, ai_answer: str) -> None:
        collection = self.db["chat_history"]
        now_dt: datetime = datetime.utcnow()
        title: str = (user_query[:25] + "...") if len(user_query) > 25 else user_query
        await collection.update_one(
            {"session_id": session_id},
            {
    
                "$setOnInsert": {
                    "session_id": session_id,
                    "created_at": now_dt,
                    "messages": [
                        {"role": "user", "content": user_query, "timestamp": time.time()},
                        {"role": "assistant", "content": ai_answer, "timestamp": time.time()},
                    ],
                },
                "$set": {
                    "updated_at": now_dt,
                    "title": title,
                    # Refresh TTL based on latest activity (expire N days after last use)
                    "expires_at": now_dt + timedelta(days=self.chat_history_ttl_days),
                },
            },
            upsert=True,
        )

    async def get_all_session(self, limit: int = 100) -> list[dict]:
        collection = self.db["chat_history"]
        cursor = (
            collection.find({}, {"_id": 0, "session_id": 1, "title": 1, "updated_at": 1})
            .sort("updated_at", -1)
            .limit(limit)
        )
        return await cursor.to_list(length=limit)

    async def get_chat_history(self, session_id: str) -> list[dict]:
        collection = self.db["chat_history"]
        doc = await collection.find_one({"session_id": session_id}, {"_id": 0, "messages": 1})
        messages = doc.get("messages") if doc else None
        return messages if isinstance(messages, list) else []

    async def delete_session(self, session_id: str) -> bool:
        collection = self.db["chat_history"]
        result = await collection.delete_one({"session_id": session_id})
        return bool(getattr(result, "deleted_count", 0))

    async def _ensure_chat_history_indexes(self) -> None:
        """
        Best-effort index creation for chat_history.
        - Unique-ish lookup by session_id
        - TTL cleanup by expires_at (Date) so old sessions auto-delete
        """
        try:
            collection = self.db["chat_history"]
            await collection.create_index(
                [("session_id", 1)],
                name="chat_history_session_id_idx",
            )
            # TTL index: when expires_at < now, document is eligible for deletion.
            await collection.create_index(
                [("expires_at", 1)],
                expireAfterSeconds=0,
                name="chat_history_expires_at_ttl",
            )
        except Exception as e:
            self.logger.debug("chatbot_engine_chat_history_index_create_failed err=%r", e)

    def build_prompt(self, query: str, context: str) -> str:
        return f"""당신은 한양대학교 ERICA 산학협력단이 보유한 특허 데이터베이스(KIPRIS Detail.json)를 잘 이해하고 사용하는 전문 특허 분석가입니다.
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
