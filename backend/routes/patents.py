from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from backend.database import db_manager

router = APIRouter(prefix="/api/patents", tags=["특허 API"])

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
    # 1. 필터 리스트 생성 (각 조건이 있을 때만 리스트에 추가)
    filters = []
    
    # 기술 키워드 (제목 또는 요약)
    if tech_q:
        filters.append({"$or": [
            {"title.ko": {"$regex": tech_q, "$options": "i"}},
            {"abstract": {"$regex": tech_q, "$options": "i"}}
        ]})
        
    # 제품 키워드 (제목 또는 요약)
    if prod_q:
        filters.append({"$or": [
            {"title.ko": {"$regex": prod_q, "$options": "i"}},
            {"abstract": {"$regex": prod_q, "$options": "i"}}
        ]})

    # 책임연구자 (발명자 리스트 안의 name 필드 검색)
    if inventor:
        filters.append({"inventors.name": {"$regex": inventor, "$options": "i"}})
        
    # 연구자 소속 (출원인 이름 검색)
    if applicant:
        filters.append({"applicant.name": {"$regex": applicant, "$options": "i"}})
        
    # 출원번호
    if app_num:
        filters.append({"applicationNumber": {"$regex": app_num}})

    # 2. 최종 쿼리 조립 ($and를 사용하여 모든 조건 만족시키기)
    query = {"$and": filters} if filters else {}

    # 3. DB 조회 및 데이터 정제
    try:
        skip = (page - 1) * limit
        
        # MongoDB에서 데이터 가져오기 (_id는 제외)
        cursor = db_manager.db.patents.find(query, {"_id": 0}).skip(skip).limit(limit)
        patents = await cursor.to_list(length=limit)
        
        # JSON 변환 에러 방지: rawRef(ObjectId)를 문자열로 변환
        for patent in patents:
            if "rawRef" in patent and patent["rawRef"]:
                patent["rawRef"] = str(patent["rawRef"])
        
        # 전체 데이터 개수 카운트
        total = await db_manager.db.patents.count_documents(query)
        
        return {
            "total": total, 
            "page": page, 
            "limit": limit, 
            "data": patents
        }
    except Exception as e:
        # 서버 콘솔에 에러 출력
        print(f"❌ API 실행 에러: {e}")
        raise HTTPException(status_code=500, detail="서버 내부 데이터 처리 오류가 발생했습니다.")