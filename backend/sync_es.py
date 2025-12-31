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

def get_db():
    """MongoDB 연결"""
    mongo_uri = os.getenv("MONGO_URI") or "mongodb://localhost:27017"
    db_name = os.getenv("DB_NAME") or "linkai"
    
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

def sync_data():
    """MongoDB patents 컬렉션의 모든 데이터를 Elasticsearch로 동기화"""
    db = get_db()
    es = get_es_client()
    
    if not es:
        print("⚠️  Elasticsearch 연결 실패로 동기화를 중단합니다.")
        return
    
    try:
        service_col = db["patents"]
        total_count = service_col.count_documents({})
        
        print(f"🚀 데이터 동기화 시작... (총 {total_count}건)")
        
        es_actions = []
        success_count = 0
        
        # MongoDB에서 데이터 읽기 및 Elasticsearch bulk 준비
        for patent in tqdm(service_col.find({}), total=total_count, desc="동기화 중"):
            # _id 필드 처리
            p_id = str(patent.pop("_id", patent.get("applicationNumber", "")))
            
            # rawRef를 문자열로 변환
            if "rawRef" in patent:
                patent["rawRef"] = str(patent["rawRef"])
            
            # Elasticsearch bulk action 준비
            es_actions.append({
                "_index": "patents",
                "_id": p_id,
                "_source": patent
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
    sync_data()