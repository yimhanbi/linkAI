"""
MongoDB patents 컬렉션의 데이터를 Elasticsearch로 동기화하는 스크립트

사용 시나리오:
- 이미 변환된 데이터를 Elasticsearch에 다시 동기화할 때
- Elasticsearch 인덱스를 재구성할 때
- 수동 동기화가 필요할 때

참고: transform_patents.py 실행 시 자동으로 동기화되므로,
      대부분의 경우 별도 실행이 필요 없습니다.
"""
import os
import pymongo
from elasticsearch import Elasticsearch
from elasticsearch.helpers import bulk
from dotenv import load_dotenv
from tqdm import tqdm

load_dotenv()

def get_db(use_cloud=False):
    """MongoDB 연결"""
    if use_cloud:
        mongo_uri = "mongodb+srv://hanbi1_db_user:moaai1234@cluster0.aw3hxbh.mongodb.net/"
        print("☁️ 클라우드 MongoDB 사용")
    else:
        mongo_uri = os.getenv("MONGO_URI") or "mongodb://localhost:27017"
    
    db_name = os.getenv("DB_NAME") or "moaai_db"
    
    print(f"📡 MongoDB 연결: {mongo_uri} / DB: {db_name}")
    client = pymongo.MongoClient(mongo_uri)
    return client[db_name]

def get_es_client():
    """Elasticsearch 클라이언트 초기화"""
    es = Elasticsearch(
        "http://127.0.0.1:9200",
        verify_certs=False,
        request_timeout=30
    )
    if es.ping():
        print("✅ Elasticsearch 연결 성공!")
        return es
    else:
        print("❌ Elasticsearch 연결 실패 (서버 응답 없음)")
        return None

def sync_data(use_cloud=False, clear_index=False):
    """MongoDB patents 컬렉션의 모든 데이터를 Elasticsearch로 동기화"""
    db = get_db(use_cloud=use_cloud)
    es = get_es_client()
    
    if not es:
        print("⚠️  Elasticsearch 연결 실패로 동기화를 중단합니다.")
        return
    
    try:
        # 인덱스 삭제 옵션 (중복 데이터 제거)
        if clear_index:
            if es.indices.exists(index="patents"):
                es.indices.delete(index="patents")
                print("🗑️  기존 Elasticsearch 인덱스 삭제 완료")
            # 인덱스 재생성 (자동으로 생성됨)
        
        service_col = db["patents"]
        total_count = service_col.count_documents({})
        
        print(f"🚀 데이터 동기화 시작... (총 {total_count}건)")
        
        es_actions = []
        success_count = 0
        
        # MongoDB에서 데이터 읽기 및 Elasticsearch bulk 준비
        for patent in tqdm(service_col.find({}), total=total_count, desc="동기화 중"):
            # _id 필드 처리 - applicationNumber를 _id로 사용 (transform_patents.py와 동일하게)
            p_id = patent.get("applicationNumber", "")
            if not p_id:
                # applicationNumber가 없으면 MongoDB _id 사용
                p_id = str(patent.get("_id", ""))
            
            # _id 필드를 제거 (Elasticsearch _id와 충돌 방지)
            patent_copy = patent.copy()
            if "_id" in patent_copy:
                del patent_copy["_id"]
            
            # rawRef를 문자열로 변환
            if "rawRef" in patent_copy:
                patent_copy["rawRef"] = str(patent_copy["rawRef"])
            
            # 책임연구자 필드 추가 (inventors[0].name)
            inventors = patent_copy.get("inventors", [])
            if inventors and len(inventors) > 0:
                first_inventor = inventors[0]
                if isinstance(first_inventor, dict):
                    patent_copy["responsibleInventor"] = first_inventor.get("name", "")
                elif isinstance(first_inventor, str):
                    patent_copy["responsibleInventor"] = first_inventor
                else:
                    patent_copy["responsibleInventor"] = ""
            else:
                patent_copy["responsibleInventor"] = ""
            
            # Elasticsearch bulk action 준비
            es_actions.append({
                "_index": "patents",
                "_id": str(p_id),
                "_source": patent_copy
            })
            
            # 500개마다 bulk 실행
            if len(es_actions) >= 500:
                success, failed = bulk(es, es_actions, raise_on_error=False)
                success_count += success
                if failed:
                    print(f"⚠️  인덱싱 실패: {len(failed)}건")
                es_actions = []
        
        # 남은 데이터 처리
        if es_actions:
            success, failed = bulk(es, es_actions, raise_on_error=False)
            success_count += success
            if failed:
                print(f"⚠️  인덱싱 실패: {len(failed)}건")
        
        # 인덱스 새로고침
        es.indices.refresh(index="patents")
        print(f"🎉 동기화 완료! 총 {success_count}개의 데이터가 인덱싱되었습니다.")
        
    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")
        import traceback
        traceback.print_exc()
    
    finally:
        if es:
            es.close()
        print("🔌 연결 종료")

if __name__ == "__main__":
    import sys
    
    # 명령줄 인자로 클라우드 사용 여부 확인
    use_cloud = "--cloud" in sys.argv or "-c" in sys.argv
    clear_index = "--clear" in sys.argv or "--reset" in sys.argv
    
    if clear_index:
        print("⚠️  기존 Elasticsearch 인덱스를 삭제하고 재생성합니다...")
    
    sync_data(use_cloud=use_cloud, clear_index=clear_index)