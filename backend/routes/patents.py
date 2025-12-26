from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from elasticsearch import AsyncElasticsearch
import os

router = APIRouter(prefix="/api/patents", tags=["특허 API"])

# Elasticsearch 클라이언트 설정
es = AsyncElasticsearch(
    "http://127.0.0.1:9200",
    verify_certs=False,
    ssl_show_warn=False,
    request_timeout=30
    )

@router.get("/")
async def get_patents(
    tech_q: Optional[str] = Query(None, description="기술 키워드"),
    prod_q: Optional[str] = Query(None, description="제품 키워드"),
    inventor: Optional[str] = Query(None, description="책임연구자"),
    applicant: Optional[str] = Query(None, description="연구자 소속(출원인)"),
    app_num: Optional[str] = Query(None, description="출원번호"),
    page: int = 1, 
    limit: int = 10
):
    try:
        skip = (page - 1) * limit
        must_queries = []

        # 기술 키워드 검색
        if tech_q:
            must_queries.append({
                "multi_match": {
                    "query": tech_q,
                    "fields": ["title.ko^2", "abstract"],
                    "fuzziness": "AUTO"
                }
            })

        # 제품 키워드 검색
        if prod_q:
            must_queries.append({
                "multi_match": {
                    "query": prod_q,
                    "fields": ["title.ko", "abstract"]
                }
            })

        # 발명자, 출원인, 출원번호 검색
        if inventor:
            must_queries.append({"match": {"inventors.name": inventor}})
        if applicant:
            must_queries.append({"match": {"applicant.name": applicant}})
        if app_num:
            must_queries.append({"match": {"applicationNumber": app_num}})

        # 쿼리 조합
        if must_queries:
            search_query = {"bool": {"must":must_queries}}

        else:
            search_query = {"match_all": {}}

        # Elasticsearch 실행
        response = await es.search(
            index="patents",
            query=search_query,
            from_=skip,
            size=limit,
            sort=[{"_score": "desc"}]
        )

        hits = response['hits']['hits']
        patents = [hit['_source'] for hit in hits]
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