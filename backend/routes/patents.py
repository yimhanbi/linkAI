from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from elasticsearch import AsyncElasticsearch
import os
import re

router = APIRouter(tags=["특허 API"])

def _parse_and_or_query(field: str, query_str: str):
    """
    AND/OR 연산자를 포함한 쿼리 문자열을 Elasticsearch 쿼리로 변환
    """
    if not query_str or not query_str.strip():
        return None
    
    # OR 연산자가 있는 경우
    if ' OR ' in query_str.upper() or ' or ' in query_str:
        # 대소문자 구분 없이 OR로 분리
        terms = re.split(r'\s+OR\s+', query_str, flags=re.IGNORECASE)
        terms = [t.strip() for t in terms if t.strip()]
        if len(terms) > 1:
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
            return {
                "bool": {
                    "must": [
                        {"match": {field: term}} for term in terms
                    ]
                }
            }
    
    # 연산자가 없는 경우 기본 match 쿼리
    return {"match": {field: query_str}}

# Elasticsearch 클라이언트 설정
elasticsearch_url = os.getenv("ELASTICSEARCH_URL", "http://127.0.0.1:9200")
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
    try:
        skip = (page - 1) * limit
        must_queries = []

        # 기술 키워드 검색 (발명의 명칭, AND/OR 연산자 지원)
        if tech_q:
            if ' OR ' in tech_q.upper() or ' or ' in tech_q:
                # OR 연산자 처리
                terms = re.split(r'\s+OR\s+', tech_q, flags=re.IGNORECASE)
                terms = [t.strip() for t in terms if t.strip()]
                if len(terms) > 1:
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
                must_queries.append(desc_query)

        # 청구범위 키워드 검색
        if claim_q:
            claim_query = _parse_and_or_query("claims", claim_q)
            if claim_query:
                must_queries.append(claim_query)

        # 발명자 검색 (AND/OR 연산자 지원)
        if inventor:
            inventor_query = _parse_and_or_query("inventors.name", inventor)
            if inventor_query:
                must_queries.append(inventor_query)
        
        # 책임연구자 검색 (AND/OR 연산자 지원)
        if manager:
            manager_query = _parse_and_or_query("inventors.name", manager)
            if manager_query:
                must_queries.append(manager_query)
        
        # 출원인 검색 (AND/OR 연산자 지원)
        if applicant:
            applicant_query = _parse_and_or_query("applicant.name", applicant)
            if applicant_query:
                must_queries.append(applicant_query)
        
        # 출원번호 검색
        if app_num:
            must_queries.append({"match": {"applicationNumber": app_num}})
        
        # 등록번호 검색
        if reg_num:
            must_queries.append({"match": {"registrationNumber": reg_num}})

        # 법적 상태 필터링
        if status and len(status) > 0:
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
                "applicant.name": {"number_of_fragments": 0}
            }
            # 하이라이팅 쿼리는 검색 쿼리와 동일하게 설정
            highlight_query = search_query

        # Elasticsearch 실행
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

        hits = response['hits']['hits']
        patents = []
        for hit in hits:
            patent = hit['_source'].copy()
            # 하이라이팅 정보 추가
            if 'highlight' in hit:
                patent['_highlight'] = hit['highlight']
            patents.append(patent)
        
        total = response['hits']['total']['value']

        return {
            "total": total,
            "page": page,
            "limit": limit,
            "data": patents,
            "engine": "elasticsearch"
        }

    except Exception as e:
        print(f"❌ 검색 에러 발생: {e}")
        # 에러 발생 시 500 에러 반환
        raise HTTPException(status_code=500, detail=str(e))

# 서버 종료 시 연결 닫기
@router.on_event("shutdown")
async def shutdown_event():
    await es.close()