from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from elasticsearch import AsyncElasticsearch
import os
import re
import logging
import time
import uuid
from urllib.parse import urlsplit

router = APIRouter(tags=["특허 API"])
logger = logging.getLogger(__name__)

def _is_running_in_docker() -> bool:
    if os.path.exists("/.dockerenv"):
        return True
    env_raw: str = (os.getenv("RUNNING_IN_DOCKER") or "").strip().lower()
    return env_raw in ["1", "true", "yes", "y", "on"]

def _resolve_local_elasticsearch_url(raw_url: str | None) -> str:
    default_url: str = "http://127.0.0.1:9200"
    if not raw_url:
        return default_url
    normalized_url: str = raw_url.strip()
    if not normalized_url:
        return default_url
    if "://" not in normalized_url:
        normalized_url = "http://" + normalized_url
    try:
        host: str = urlsplit(normalized_url).hostname or ""
        if host == "elasticsearch" and not _is_running_in_docker():
            return default_url
        return normalized_url
    except Exception:
        return default_url

def _parse_and_or_query(field: str, query_str: str):
    """
    AND/OR 연산자를 포함한 쿼리 문자열을 Elasticsearch 쿼리로 변환
    """
    if not query_str or not query_str.strip():
        return None
    original_query: str = query_str
    logger.debug("parse_query field=%s query=%r", field, original_query)
    
    # OR 연산자가 있는 경우
    if ' OR ' in query_str.upper() or ' or ' in query_str:
        # 대소문자 구분 없이 OR로 분리
        terms = re.split(r'\s+OR\s+', query_str, flags=re.IGNORECASE)
        terms = [t.strip() for t in terms if t.strip()]
        if len(terms) > 1:
            logger.debug("parse_query_or field=%s terms=%r", field, terms)
            return {
                "bool": {
                    "should": [
                        {"match": {field: term}} for term in terms
                    ],
                    "minimum_should_match": 1
                }
            }
    
    # AND 연산자가 있는 경우
    if ' AND ' in query_str.upper() or ' and ' in query_str:
        terms = re.split(r'\s+AND\s+', query_str, flags=re.IGNORECASE)
        terms = [t.strip() for t in terms if t.strip()]
        if len(terms) > 1:
            logger.debug("parse_query_and field=%s terms=%r", field, terms)
            return {
                "bool": {
                    "must": [
                        {"match": {field: term}} for term in terms
                    ]
                }
            }
    
    # 연산자가 없는 경우 기본 match 쿼리
    logger.debug("parse_query_single field=%s term=%r", field, original_query.strip())
    return {"match": {field: query_str}}

# Elasticsearch 클라이언트 설정
elasticsearch_url = _resolve_local_elasticsearch_url(os.getenv("ELASTICSEARCH_URL"))
es = AsyncElasticsearch(
    elasticsearch_url,
    verify_certs=False,
    ssl_show_warn=False,
    request_timeout=30
    )

@router.get("/")
async def get_patents(
    tech_q: Optional[str] = Query(None, description="기술 키워드"),
    prod_q: Optional[str] = Query(None, description="제품 키워드"),
    desc_q: Optional[str] = Query(None, description="명세서 키워드"),
    claim_q: Optional[str] = Query(None, description="청구범위 키워드"),
    inventor: Optional[str] = Query(None, description="발명자"),
    manager: Optional[str] = Query(None, description="책임연구자"),
    applicant: Optional[str] = Query(None, description="연구자 소속(출원인)"),
    app_num: Optional[str] = Query(None, description="출원번호"),
    reg_num: Optional[str] = Query(None, description="등록번호"),
    status: Optional[List[str]] = Query(None, description="법적 상태 (다중 선택 가능)"),
    page: int = 1, 
    limit: int = 10
):
    request_id: str = uuid.uuid4().hex[:10]
    start_time_s: float = time.perf_counter()
    try:
        skip = (page - 1) * limit
        must_queries = []
        logger.info(
            "patents_search_start request_id=%s page=%d limit=%d skip=%d",
            request_id,
            page,
            limit,
            skip,
        )
        logger.debug(
            "patents_search_params request_id=%s tech_q=%r prod_q=%r desc_q=%r claim_q=%r inventor=%r manager=%r applicant=%r app_num=%r reg_num=%r status=%r",
            request_id,
            tech_q,
            prod_q,
            desc_q,
            claim_q,
            inventor,
            manager,
            applicant,
            app_num,
            reg_num,
            status,
        )

        # 기술 키워드 검색 (발명의 명칭, AND/OR 연산자 지원)
        if tech_q:
            if ' OR ' in tech_q.upper() or ' or ' in tech_q:
                # OR 연산자 처리
                terms = re.split(r'\s+OR\s+', tech_q, flags=re.IGNORECASE)
                terms = [t.strip() for t in terms if t.strip()]
                if len(terms) > 1:
                    logger.debug("tech_q_or request_id=%s terms=%r", request_id, terms)
                    must_queries.append({
                        "bool": {
                            "should": [
                                {
                                    "multi_match": {
                                        "query": term,
                                        "fields": ["title.ko^2", "abstract"],
                                        "fuzziness": "AUTO"
                                    }
                                } for term in terms
                            ],
                            "minimum_should_match": 1
                        }
                    })
                else:
                    must_queries.append({
                        "multi_match": {
                            "query": tech_q,
                            "fields": ["title.ko^2", "abstract"],
                            "fuzziness": "AUTO"
                        }
                    })
            elif ' AND ' in tech_q.upper() or ' and ' in tech_q:
                # AND 연산자 처리
                terms = re.split(r'\s+AND\s+', tech_q, flags=re.IGNORECASE)
                terms = [t.strip() for t in terms if t.strip()]
                if len(terms) > 1:
                    logger.debug("tech_q_and request_id=%s terms=%r", request_id, terms)
                    must_queries.append({
                        "bool": {
                            "must": [
                                {
                                    "multi_match": {
                                        "query": term,
                                        "fields": ["title.ko^2", "abstract"],
                                        "fuzziness": "AUTO"
                                    }
                                } for term in terms
                            ]
                        }
                    })
                else:
                    must_queries.append({
                        "multi_match": {
                            "query": tech_q,
                            "fields": ["title.ko^2", "abstract"],
                            "fuzziness": "AUTO"
                        }
                    })
            else:
                # 연산자 없음
                logger.debug("tech_q_single request_id=%s query=%r", request_id, tech_q)
                must_queries.append({
                    "multi_match": {
                        "query": tech_q,
                        "fields": ["title.ko^2", "abstract"],
                        "fuzziness": "AUTO"
                    }
                })

        # 제품 키워드 검색
        if prod_q:
            if ' OR ' in prod_q.upper() or ' or ' in prod_q:
                terms = re.split(r'\s+OR\s+', prod_q, flags=re.IGNORECASE)
                terms = [t.strip() for t in terms if t.strip()]
                if len(terms) > 1:
                    logger.debug("prod_q_or request_id=%s terms=%r", request_id, terms)
                    must_queries.append({
                        "bool": {
                            "should": [
                                {
                                    "multi_match": {
                                        "query": term,
                                        "fields": ["title.ko", "abstract"]
                                    }
                                } for term in terms
                            ],
                            "minimum_should_match": 1
                        }
                    })
                else:
                    must_queries.append({
                        "multi_match": {
                            "query": prod_q,
                            "fields": ["title.ko", "abstract"]
                        }
                    })
            elif ' AND ' in prod_q.upper() or ' and ' in prod_q:
                terms = re.split(r'\s+AND\s+', prod_q, flags=re.IGNORECASE)
                terms = [t.strip() for t in terms if t.strip()]
                if len(terms) > 1:
                    logger.debug("prod_q_and request_id=%s terms=%r", request_id, terms)
                    must_queries.append({
                        "bool": {
                            "must": [
                                {
                                    "multi_match": {
                                        "query": term,
                                        "fields": ["title.ko", "abstract"]
                                    }
                                } for term in terms
                            ]
                        }
                    })
                else:
                    must_queries.append({
                        "multi_match": {
                            "query": prod_q,
                            "fields": ["title.ko", "abstract"]
                        }
                    })
            else:
                logger.debug("prod_q_single request_id=%s query=%r", request_id, prod_q)
                must_queries.append({
                    "multi_match": {
                        "query": prod_q,
                        "fields": ["title.ko", "abstract"]
                    }
                })

        # 명세서 키워드 검색
        if desc_q:
            desc_query = _parse_and_or_query("abstract", desc_q)
            if desc_query:
                logger.debug("desc_q_parsed request_id=%s query=%s", request_id, desc_query)
                must_queries.append(desc_query)

        # 청구범위 키워드 검색
        if claim_q:
            claim_query = _parse_and_or_query("claims", claim_q)
            if claim_query:
                logger.debug("claim_q_parsed request_id=%s query=%s", request_id, claim_query)
                must_queries.append(claim_query)

        # 발명자 검색 (AND/OR 연산자 지원)
        if inventor:
            inventor_query = _parse_and_or_query("inventors.name", inventor)
            if inventor_query:
                logger.debug("inventor_parsed request_id=%s query=%s", request_id, inventor_query)
                must_queries.append(inventor_query)
        
        # 책임연구자 검색 (responsibleInventor 필드 사용 - inventors[0].name)
        if manager:
            manager_query = _parse_and_or_query("responsibleInventor", manager)
            if manager_query:
                logger.debug("manager_parsed request_id=%s query=%s", request_id, manager_query)
                must_queries.append(manager_query)
        
        # 출원인 검색 (AND/OR 연산자 지원)
        if applicant:
            applicant_query = _parse_and_or_query("applicant.name", applicant)
            if applicant_query:
                logger.debug("applicant_parsed request_id=%s query=%s", request_id, applicant_query)
                must_queries.append(applicant_query)
        
        # 출원번호 검색
        if app_num:
            logger.debug("app_num_match request_id=%s app_num=%r", request_id, app_num)
            must_queries.append({"match": {"applicationNumber": app_num}})
        
        # 등록번호 검색
        if reg_num:
            logger.debug("reg_num_match request_id=%s reg_num=%r", request_id, reg_num)
            must_queries.append({"match": {"registrationNumber": reg_num}})

        # 법적 상태 필터링
        if status and len(status) > 0:
            logger.debug("status_terms request_id=%s status=%r", request_id, status)
            must_queries.append({
                "terms": {
                    "status": status
                }
            })

        # 쿼리 조합
        if must_queries:
            search_query = {"bool": {"must": must_queries}}
        else:
            search_query = {"match_all": {}}
        logger.debug("es_query request_id=%s query=%s", request_id, search_query)

        # 하이라이팅할 필드 목록 생성
        highlight_fields = {}
        highlight_query = None
        
        # 검색 키워드가 있는 경우에만 하이라이팅 활성화
        if tech_q or prod_q or desc_q or claim_q or inventor or manager or applicant:
            highlight_fields = {
                "title.ko": {"number_of_fragments": 0},  # 전체 텍스트 하이라이팅
                "title.en": {"number_of_fragments": 0},
                "abstract": {"number_of_fragments": 0},
                "claims": {"number_of_fragments": 0},
                "inventors.name": {"number_of_fragments": 0},
                "responsibleInventor": {"number_of_fragments": 0},  # 책임연구자
                "applicant.name": {"number_of_fragments": 0}
            }
            # 하이라이팅 쿼리는 검색 쿼리와 동일하게 설정
            highlight_query = search_query

        # Elasticsearch 실행
        es_start_time_s: float = time.perf_counter()
        response = await es.search(
            index="patents",
            query=search_query,
            from_=skip,
            size=limit,
            sort=[{"_score": "desc"}],
            highlight={
                "fields": highlight_fields,
                "pre_tags": ["<mark>"],
                "post_tags": ["</mark>"],
                "require_field_match": False  # 모든 필드에서 하이라이팅
            } if highlight_fields else None
        )
        es_elapsed_ms: float = (time.perf_counter() - es_start_time_s) * 1000.0

        hits = response['hits']['hits']
        logger.debug("es_result request_id=%s hits=%d elapsed_ms=%.1f", request_id, len(hits), es_elapsed_ms)
        patents = []
        for hit in hits:
            patent = hit['_source'].copy()
            # 하이라이팅 정보 추가
            if 'highlight' in hit:
                patent['_highlight'] = hit['highlight']
            patents.append(patent)
        
        total = response['hits']['total']['value']
        total_elapsed_ms: float = (time.perf_counter() - start_time_s) * 1000.0
        logger.info(
            "patents_search_done request_id=%s total=%d returned=%d elapsed_ms=%.1f",
            request_id,
            total,
            len(patents),
            total_elapsed_ms,
        )

        return {
            "total": total,
            "page": page,
            "limit": limit,
            "data": patents,
            "engine": "elasticsearch"
        }

    except Exception as e:
        logger.exception("patents_search_error request_id=%s err=%r", request_id, e)
        # 에러 발생 시 500 에러 반환
        raise HTTPException(status_code=500, detail=str(e))

# 서버 종료 시 연결 닫기
@router.on_event("shutdown")
async def shutdown_event():
    await es.close()