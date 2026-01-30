# Imports
import json
import re
import os
import asyncio
import time
from typing import List,Dict,Tuple,Optional
from contextlib import asynccontextmanager # 시작과 종료 시점에 특정 작업을 실행하기 위한 도구

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel # 데이터 검증 및 데이터 변환 
from openai import AsyncOpenAI
from qdrant_client import AsyncQdrantClient


#--------------------------------------
# 환경 변수 설정 
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "patents")
JSON_PATH = os.getenv("JSON_PATH")

# 디버그 성능 로그 on/off (환경변수로 제어)
DEBUG_PERF = os.getenv("DEBUG_PERF", "false").lower() == "true"

def perf_log(msg: str):
    """DEBUG_PERF=true일 때만 출력하는 헬퍼 함수"""
    if DEBUG_PERF:
        print(msg)



#--------------------------------------
# 전역 변수 (시작시 초기화)
client_openai: Optional[AsyncOpenAI] = None
client_qdrant : Optional[AsyncQdrantClient] = None

#타입 힌트 
patents: List[Dict] = []
patent_index: Dict[str, Dict] = {}
patent_text_index: Dict[str, str] = {}
patent_flattened: List[Dict] = []




#--------------------------------------
#유틸리티 함수
def normalize_application_number(app_no):
    if not app_no:
        return None
    return re.sub(r"[^0-9]", "", app_no)


def find_key_recursive(obj, target_key):
    results = []
    
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k == target_key:
                results.append(v)
            # ✅ 키 매칭 여부와 관계없이 값도 재귀 검색
            results.extend(find_key_recursive(v, target_key))
                
    elif isinstance(obj, list):
        for item in obj:
            results.extend(find_key_recursive(item, target_key))
            
    return results

def extract_applicant_names(patent):
    nums = find_key_recursive(patent,"applicationNumber")
    return nums[0] if nums else None


def build_patent_context_ko(patent:dict) -> str:
    def first(v):
        return v[0] if isinstance (v,list) and v else v
    
    app_no = first(find_key_recursive(patent,"applicationNumber"))
    title = first(find_key_recursive(patent,"inventionTitle"))
    abstract = first(find_key_recursive(patent,"astrtCont"))
    
    #청구항 전체
    claims = find_key_recursive(patent,"claim")
    claims_text  ='\n\n'.join(
        [f"청구항 {i+1}\n{c}" for i, c in enumerate(claims)]
    )if claims else None
    
    
    #발명자 / 출원인
    inventors = find_key_recursive(patent, "name")
    inventors_text = ", ".join(dict.fromkeys(inventors)) if inventors else None

    applicants = find_key_recursive(patent, "engName")
    if not applicants:
        applicants = find_key_recursive(patent, "name")
    applicants_text = ", ".join(dict.fromkeys(applicants)) if applicants else None

    sections = []

    if app_no:
        sections.append(f"[출원번호]\n{app_no}")

    if title:
        sections.append(f"[발명의 명칭]\n{title}")

    if abstract:
        sections.append(f"[요약]\n{abstract}")

    if claims_text:
        sections.append(f"[청구항]\n{claims_text}")

    if inventors_text:
        sections.append(f"[발명자]\n{inventors_text}")

    if applicants_text:
        sections.append(f"[출원인]\n{applicants_text}")

    return "\n\n".join(sections)


def extract_application_number(patent):
    """특허 데이터에서 출원번호(applicationnumber)를 추출합니다."""
    nums =find_key_recursive(patent, "applicationNumber")
    return nums[0] if nums else None


#--------------------------------------
#LLM 관련 함수들 

async def extract_weighted_keywords_llm(query: str):
    start = time.time()
    resp = await client_openai.chat.completions.create(
        model="gpt-5",
        messages=[
            {
                "role": "user",
                "content": f"""
다음 문장에서 특허 검색에 **직접 사용되는 검색 조건 키워드만** 추출하세요.

규칙:
- 특허 DB에서 검색 필드(ex 출원인/발명자/기술명 등)로 바로 사용할 수 있는 단어만 포함
- 질문에 나열된 모든 인물과 기술 키워드를 하나도 빠뜨리지 말고 각각 독립적인 행으로 추출할 것.    
- '책임연구자' , '교수', '박사' 등 인물을 수식하는 역할어나 질문 결과를 설명하기 위한 단어(ex 개수, 이름, 무엇, 몇 개 등)는 절대 포함하지 말 것
- 출원인·발명자 이름·출원번호가 존재할 경우 최우선
- 질문에 오타, 띄어쓰기 오류, 한영변환 오류 등으로 추정되는 것이 있다면 정제하여 답하세요.
- 문장에 실제 등장한 단어나 숫자만 사용
- 조사/어미 제거
- 가중치는 0~1 (0.1 단위)
- 형식: 단어:가중치
- 줄바꿈으로 구분
- 설명 없이 출력

문장:
{query}
"""
            }
        ],
    )
    
    raw = resp.choices[0].message.content.strip()
    
    perf_log("\n🧠 [RAW LLM OUTPUT]")
    perf_log(raw)
    
    weighted_keywords = []
    
  
    for line in raw.splitlines():
        line = line.strip()
        if not line or ":" not in line:
            continue
        
       
        k, w = line.split(":", 1)
        
        try:
            weight = float(w.strip())
            weighted_keywords.append((k.strip(), weight))
        except ValueError:
            continue  
    
    perf_log(f"⏱️ [LLM 키워드 추출] {time.time() - start:.2f}초")
    return weighted_keywords

#--------------------------------------
#검색 관련 함수들

async def get_query_embedding(text: str):
    emb = await client_openai.embeddings.create(
        model="text-embedding-3-large",
        input = text
    )
    return emb.data[0].embedding

async def qdrant_search_app_numbers(query:str,limit: int):
    start = time.time()
    
    emb_start = time.time()
    vector = await get_query_embedding(query)
    perf_log(f"⏱️ [임베딩 생성] {time.time() - emb_start:.2f}초")
    
    search_start = time.time()
    results = await client_qdrant.query_points(
        collection_name=COLLECTION_NAME,
        query=vector,
        limit=limit,
        with_payload=True
    )
    perf_log(f"⏱️ [Qdrant 쿼리] {time.time() - search_start:.2f}초")
    
    apps=[]
    for r in results.points:
        raw = r.payload.get("applicationNumber")
        app_no = normalize_application_number(raw)
        if app_no:
            apps.append(app_no)
    
    perf_log(f"⏱️ [Qdrant 전체] {time.time() - start:.2f}초 → {len(apps)}개")
    return apps


async def simple_match_search_app_numbers(query: str, limit: int):
    """
    ✔ LLM이 준 가중치로 키워드 우선순위를 결정
    ✔ 문서 점수는 각 키워드 등장 횟수를 벡터로 만들어 사전식(lexicographic) 비교로 정렬
    """
    start = time.time()
    perf_log(f"\n{'='*60}")
    perf_log(f"🔎 [SIMPLE MATCH SEARCH START]")
    perf_log(f"   Query: '{query}'")
    perf_log(f"   Limit: {limit}")
    perf_log(f"{'='*60}")
    
    weighted_keywords = await extract_weighted_keywords_llm(query)
    perf_log(f"\n🔎 [LLM WEIGHTED KEYWORDS] → {weighted_keywords}")
    
    if not weighted_keywords:
        print("❌ No weighted keywords extracted!")
        return []
    
    # ✅ 1. 가중치 내림차순 정렬 (중요 키워드 우선)
    weighted_keywords = sorted(weighted_keywords, key=lambda x: x[1], reverse=True)
    perf_log(f"🔎 [SORTED KEYWORDS] → {weighted_keywords}")
    
    perf_log(f"\n🔍 [DATA CHECK]")
    perf_log(f"   patent_flattened length: {len(patent_flattened)}")
    perf_log(f"   patent_flattened type: {type(patent_flattened)}")
    
    if not patent_flattened:
        print("❌ ERROR: patent_flattened is empty!")
        return []
    
    # 🔍 첫 번째 문서 샘플 확인 (디버그용 - 주석 처리)
    # print(f"\n📄 [FIRST PATENT SAMPLE]")
    # first_patent = patent_flattened[0]
    # print(f"   app_no: {first_patent['app_no']}")
    # print(f"   text length: {len(first_patent['text'])}")
    # print(f"   text preview (first 300 chars):\n{first_patent['text'][:300]}")
    
    # 🔍 키워드가 첫 번째 문서에 있는지 확인 (디버그용 - 주석 처리)
    # print(f"\n🔍 [KEYWORD CHECK IN FIRST PATENT]")
    # for keyword, weight in weighted_keywords:
    #     count = first_patent['text'].count(keyword)
    #     print(f"   '{keyword}': {count} occurrences")
    #     if count > 0:
    #         idx = first_patent['text'].find(keyword)
    #         context = first_patent['text'][max(0, idx-50):idx+len(keyword)+50]
    #         print(f"      Context: ...{context}...")
    
    scored = []
    
    # print(f"\n🔍 [SCANNING ALL PATENTS]")
    # print(f"   Total patents to scan: {len(patent_flattened)}")
    
    matched_patents = 0
    
    for i, p in enumerate(patent_flattened):
        text = p["text"]
        
        # ✅ 2. 키워드별 등장 횟수 벡터
        count_vector = tuple(text.count(k) for k, _ in weighted_keywords)
        
        # 🔍 처음 5개 특허는 상세 로그 (디버그용 - 주석 처리)
        # if i < 5:
        #     print(f"\n   [Patent {i}] app_no: {p['app_no']}")
        #     print(f"      count_vector: {count_vector}")
        #     print(f"      text length: {len(text)}")
        #     for j, (keyword, _) in enumerate(weighted_keywords):
        #         print(f"      '{keyword}': {count_vector[j]} times")
        
        # 전부 0이면 제외
        if all(c == 0 for c in count_vector):
            # if i < 5:
            #     print(f"      ❌ SKIPPED (all zeros)")
            continue
        
        matched_patents += 1
        # if i < 5:
        #     print(f"      ✅ MATCHED!")
        
        scored.append((count_vector, p["app_no"]))
    
    # print(f"\n✅ [SCAN COMPLETE]")
    # print(f"   Total patents scanned: {len(patent_flattened)}")
    # print(f"   Matched patents: {matched_patents}")
    # print(f"   Match rate: {matched_patents/len(patent_flattened)*100:.2f}%")
    
    if matched_patents == 0:
        # print("\n❌ [ERROR] No patents matched any keyword!")
        # print("   Possible reasons:")
        # print("   1. Keywords don't exist in patent texts")
        # print("   2. Encoding mismatch (UTF-8 issue)")
        # print("   3. Text normalization issue")
        return []
    
    # ✅ 3. 사전식 비교 (중요 키워드부터)
    scored.sort(key=lambda x: x[0], reverse=True)
    
    # 🔍 디버그 출력 (주석 처리)
    # print(f"\n🔎 [COUNT VECTOR TOP {min(5, len(scored))}]")
    # for vec, app in scored[:5]:
    #     print(f"  vector={vec}, app_no={app}")
    
    result = [app_no for _, app_no in scored[:limit]]
    
    perf_log(f"\n🎯 [FINAL RESULT]")
    perf_log(f"   Returning {len(result)} patents (limit={limit})")
    perf_log(f"   Sample app_nos: {result[:3]}")
    perf_log(f"⏱️ [Simple Match 전체] {time.time() - start:.2f}초")
    perf_log(f"{'='*60}\n")
    
    return result

    
async def hybrid_retrieve(query:str, target_k: int):
    start = time.time()
    
    #병렬 실행 
    parallel_start = time.time()
    search_apps,qdrant_apps = await asyncio.gather(
        simple_match_search_app_numbers(query, target_k),
        qdrant_search_app_numbers(query, target_k * 2)
    )
    
    perf_log(f"⏱️ [병렬 검색] {time.time() - parallel_start:.2f}초")
    
    s_set = set(search_apps)
    q_set = set(qdrant_apps)
    
    # #1) search는 최대 target_k
    # search_apps = simple_match_search_app_numbers(query, target_k)
    # s_set = set(search_apps)
    
    # #2) qdrant는 항상 target_k*2 개 가져와서 search 부족분을 확실히 보완
    # qdrant_apps = qdrant_search_app_numbers(query, target_k * 2)
    # q_set = set(qdrant_apps)
    
    perf_log(
        f"\n🔍 [INITIAL RETRIEVAL] → "
        f"search={len(search_apps)}, "
        f"qdrant={len(qdrant_apps)}"
    )
    
    
    used = set()
    docs = []
    
    
    #3) search 우선 추가
    for app in search_apps:
        if app not in used and app in patent_index:
            used.add(app)
            docs.append(("MATCH", app, patent_text_index[app]))
            
            
    #4) qdrant로 부족분 채우기
    for app in qdrant_apps:
        if len (docs) >= target_k * 2:
            break
        if app not in used and app in patent_index:
            used.add(app)
            docs.append(("QDRANT",app,patent_text_index[app]))
            
    
    # ---------- 로그 계산 (여기가 핵심!) ----------
    final_apps = {app for _, app, _ in docs}   # == len(final_apps) == top_k*2

    overlap = len(final_apps & s_set & q_set)
    search_only = len((final_apps & s_set) - q_set)
    qdrant_only = len((final_apps & q_set) - s_set)

    total_docs = len(final_apps)   # 반드시 top_k*2

    perf_log(
        f"\n📊 SOURCE STATS → "
        f"overlap={overlap}, "
        f"search_only={search_only}, "
        f"qdrant_only={qdrant_only}, "
        f"total_docs={total_docs}"
    )
    perf_log(f"⏱️ [Hybrid Retrieve 전체] {time.time() - start:.2f}초")
    # ---------------------------------------------

    return docs

def build_prompt(question, context):
    return f"""
당신은 한양대학교 ERICA 산학협력단이 보유한 특허 데이터베이스(KIPRIS Detail.json)를 잘 이해하고 사용하는 전문 특허 분석가입니다.

RULES:
- CONTEXT만을 근거로 하고, 외부 지식이나 새로운 사실은 절대 추가하지 말 것.
- CONTEXT를 직접 읽는 것처럼 말하지 말고, 전문가 관점에서 자연스럽게 설명하세요.
- 주어진 PATENT의 내용을 기반으로 정확한 정보만을 제공하세요.
- 주어진 PATENT에 정확한 정보가 없다면 알 수 없다고 답하세요.
- 질문의 의도를 파악하여 조건에 맞는 내용만 명료하게 답하세요.
- 질문에 오타, 띄어쓰기 오류, 한영변환 오류 등으로 추정되는 것이 있다면 정제하여 답하세요.

[CONTEXT]
{context}

[QUESTION]
{question}

[ANSWER]
"""    
            
    
async def hybrid_rag_answer(query:str, top_k: int):
    overall_start = time.time()
    perf_log(f"\n{'#'*70}")
    perf_log(f"🤖 [RAG 답변 생성 시작] Query: '{query[:50]}...'")
    perf_log(f"{'#'*70}")
    
    # 1. 문서 검색
    retrieve_start = time.time()
    docs = await hybrid_retrieve(query,top_k)
    retrieve_elapsed = time.time() - retrieve_start
    
    if not docs:
        return "정보가 부족합니다."
    
    perf_log(f"⏱️ [1단계: 문서 검색] {retrieve_elapsed:.2f}초 → {len(docs)}개 문서")
    
    # 2. 컨텍스트 생성
    context_start = time.time()
    context = ""
    for i, (source, app_no, text) in enumerate(docs):
        context += f"""
\n===========================================================================
📄 PATENT {i+1}
APPLICATION_NUMBER: {app_no}
=============================================================================\n
{text}
"""
    context_elapsed = time.time() - context_start
    perf_log(f"⏱️ [2단계: 컨텍스트 생성] {context_elapsed:.2f}초 → {len(context):,}자")

    prompt = build_prompt(query, context)

    # 3. LLM 답변 생성
    llm_start = time.time()
    resp = await client_openai.chat.completions.create(
        model="gpt-5",
        messages=[{"role": "user", "content": prompt}],
        #temperature=0.2
    )
    llm_elapsed = time.time() - llm_start
    
    answer = resp.choices[0].message.content.strip()
    overall_elapsed = time.time() - overall_start
    
    # 최종 요약
    perf_log(f"⏱️ [3단계: LLM 답변 생성] {llm_elapsed:.2f}초 → {len(answer)}자")
    perf_log(f"\n{'='*70}")
    perf_log(f"✅ [전체 완료] {overall_elapsed:.2f}초")
    perf_log(f"   1. 문서 검색:      {retrieve_elapsed:6.2f}초 ({retrieve_elapsed/overall_elapsed*100:5.1f}%)")
    perf_log(f"   2. 컨텍스트 생성:  {context_elapsed:6.2f}초 ({context_elapsed/overall_elapsed*100:5.1f}%)")
    perf_log(f"   3. LLM 답변:       {llm_elapsed:6.2f}초 ({llm_elapsed/overall_elapsed*100:5.1f}%)")
    perf_log(f"{'='*70}\n")

    return answer

#--------------------------------------
#데이터 초기화 함수

async def initialize_data():
    global client_openai, client_qdrant, patents, patent_index, patent_text_index, patent_flattened
    
    print("▶ Initializing clients...")
    client_openai = AsyncOpenAI(api_key=OPENAI_API_KEY) 
    client_qdrant = AsyncQdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
    print("▶ Qdrant Connected")

    print("▶ Loading patent data...")
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        patents = json.load(f)
    print(f"▶ 특허 데이터 로드 완료: {len(patents)}개")
    
    # 🔍 첫 번째 특허 구조 확인 
    # if patents:
    #     perf_log("\n🔍 [FIRST PATENT STRUCTURE]")
    #     first_patent = patents[0]
    #     perf_log(f"   Type: {type(first_patent)}")
    #     perf_log(f"   Keys: {list(first_patent.keys()) if isinstance(first_patent, dict) else 'Not a dict'}")
    #     perf_log(f"   JSON preview: {json.dumps(first_patent, ensure_ascii=False, indent=2)[:500]}...")

    print("\n▶ Building indexes...")
    for p in patents:
        raw = extract_application_number(p)
        app_no = normalize_application_number(raw)
        if app_no:
            patent_index[app_no] = p

    print(f"▶ applicationNumber index 생성 완료: {len(patent_index)}개")

    # 🔍 첫 3개 특허에서 상세 디버깅 (주석 처리)
    # for i, patent in enumerate(patents[:3]):
    #     app_no = normalize_application_number(extract_application_number(patent))
    #     if not app_no:
    #         continue
    #     
    #     perf_log(f"\n🔍 [PATENT {i+1}] app_no: {app_no}")
    #     
    #     # 각 필드가 찾아지는지 확인
    #     title = find_key_recursive(patent, "inventionTitle")
    #     abstract = find_key_recursive(patent, "astrtCont")
    #     claims = find_key_recursive(patent, "claim")
    #     inventors = find_key_recursive(patent, "name")
    #     
    #     perf_log(f"   inventionTitle found: {len(title)} items → {title[:1] if title else 'NONE'}")
    #     perf_log(f"   astrtCont found: {len(abstract)} items → {abstract[:1] if abstract else 'NONE'}")
    #     perf_log(f"   claim found: {len(claims)} items")
    #     perf_log(f"   name found: {len(inventors)} items → {inventors[:3] if inventors else 'NONE'}")
    #     
    #     cleaned_text = build_patent_context_ko(patent)
    #     perf_log(f"   Final text length: {len(cleaned_text)}")
    #     perf_log(f"   Text preview: {cleaned_text[:200]}...")
    #     
    #     patent_text_index[app_no] = cleaned_text
    #     patent_flattened.append({"app_no": app_no, "text": cleaned_text})

    # 모든 특허 처리
    for patent in patents:
        app_no = normalize_application_number(extract_application_number(patent))
        if not app_no:
            continue
        cleaned_text = build_patent_context_ko(patent)
        patent_text_index[app_no] = cleaned_text
        patent_flattened.append({"app_no": app_no, "text": cleaned_text})

    print(f"\n▶ patent_flattened size: {len(patent_flattened)}")
    
    # ✅ 평균 텍스트 길이 확인
    if patent_flattened:
        avg_length = sum(len(p["text"]) for p in patent_flattened) / len(patent_flattened)
        min_length = min(len(p["text"]) for p in patent_flattened)
        max_length = max(len(p["text"]) for p in patent_flattened)
        print(f"▶ Text length stats: avg={avg_length:.0f}, min={min_length}, max={max_length}")
    
    print("✅ Initialization complete!")
    
    
    
