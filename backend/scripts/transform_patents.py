import os
import pymongo
from pymongo import UpdateOne
from dotenv import load_dotenv
from tqdm import tqdm
from elasticsearch import Elasticsearch
from elasticsearch.helpers import bulk 

# 1. 환경 설정 및 DB 연결
def get_db(db_name=None):
    # .env 파일 로드 시도 (경로를 더 명확하게 지정)
    env_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
    load_dotenv(dotenv_path=env_path)
    # 추가로 현재 디렉토리에서도 시도
    load_dotenv()
    
    mongo_uri = os.getenv("MONGO_URI") or "mongodb://localhost:27017"
    if not db_name:
        db_name = os.getenv("DB_NAME") or "linkai"  # 🚀 DB_NAME이 None이면 'linkai'를 기본값으로 사용
    
    print(f"📡 MongoDB 연결 시도: {mongo_uri} / DB: {db_name}")
    
    try:
        client = pymongo.MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        # 연결 테스트
        client.admin.command('ping')
        print("✅ MongoDB 연결 성공!")
        return client, client[db_name]
    except pymongo.errors.ServerSelectionTimeoutError:
        print("❌ MongoDB 연결 실패!")
        print(f"   MongoDB 서버가 실행 중인지 확인해주세요: {mongo_uri}")
        print("   MongoDB 시작 방법:")
        print("   - macOS: brew services start mongodb-community")
        print("   - 또는: mongod --dbpath /path/to/data")
        raise
    except Exception as e:
        print(f"❌ MongoDB 연결 오류: {e}")
        raise

def get_es_client():
    """Elasticsearch 클라이언트 초기화"""
    es = Elasticsearch(
        "http://127.0.0.1:9200",
        verify_certs=False,
        request_timeout=30
    )
    # 연결 테스트
    if es.ping():
        print("✅ Elasticsearch 연결 성공!")
        return es
    else:
        print("⚠️  Elasticsearch 연결 실패 (서버 응답 없음)")
        return None

def transform_raw_to_service(raw):
    try:
        app_num = raw.get('applicationNumber')
        if not app_num: return None

        # [필드 매핑 핵심 로직]
        
        # A. 기본 정보 뭉치 (biblioSummaryInfo)
        biblio = raw.get('biblioSummaryInfoArray', {}).get('biblioSummaryInfo', {})
        if isinstance(biblio, list): biblio = biblio[0] if biblio else {}

        # B. 제목: inventionTitle 사용 (null 방지)
        title_ko = (biblio.get('inventionTitle') or "제목 없음").strip()
        title_en = biblio.get('inventionTitleEng')

        # C. 요약: abstractInfo -> astrtCont 만 사용 (주소 등 불필요 정보 제거)
        abs_info = raw.get('abstractInfoArray', {}).get('abstractInfo', {})
        if isinstance(abs_info, list): abs_info = abs_info[0] if abs_info else {}
        clean_abstract = abs_info.get('astrtCont', "요약 정보 없음")

        # D. 청구항: claimInfoArray 활용 (대표/전체 분리)
        claim_info_list = raw.get('claimInfoArray', {}).get('claimInfo', [])
        if isinstance(claim_info_list, dict): claim_info_list = [claim_info_list]
        
        all_claims = [c.get('claim', '').strip() for c in claim_info_list if c.get('claim')]
        rep_claim = all_claims[0] if all_claims else "내용 없음"

        # E. 출원인: applicantInfo -> name 만 사용 (주소 제외)
        app_info = raw.get('applicantInfoArray', {}).get('applicantInfo', {})
        if isinstance(app_info, list): app_info = app_info[0] if app_info else {}
        app_name = app_info.get('name', "Unknown").strip()

        # F. 분류 코드 (IPC/CPC)
        ipc_info = raw.get('ipcInfoArray', {}).get('ipcInfo', [])
        if isinstance(ipc_info, dict): ipc_info = [ipc_info]
        ipc_codes = [i.get('ipcNumber', '').strip() for i in ipc_info if i.get('ipcNumber')]
        
        cpc_info = raw.get('cpcInfoArray', {}).get('cpcInfo', [])
        if isinstance(cpc_info, dict): cpc_info = [cpc_info]
        cpc_codes = [i.get('CooperativepatentclassificationNumber', '').strip() for i in cpc_info if i.get('CooperativepatentclassificationNumber')]

        return {
            "applicationNumber": str(app_num),
            "applicationDate": biblio.get('applicationDate'),
            "status": biblio.get('registerStatus') or "공개",
            "title": {"ko": title_ko, "en": title_en},
            "applicant": {"name": app_name, "country": None},
            "abstract": clean_abstract,
            "representativeClaim": rep_claim,
            "claims": all_claims,
            "ipcCodes": ipc_codes,
            "cpcCodes": cpc_codes,
            "openNumber": biblio.get('openNumber'),
            "rawRef": raw.get('_id')
        }
    except Exception as e:
        print(f"Error processing {raw.get('applicationNumber')}: {e}")
        return None

if __name__ == "__main__":
    try:
        client, db = get_db()
    except Exception as e:
        print("\n❌ MongoDB 연결에 실패했습니다.")
        print("   MongoDB 서버가 실행 중인지 확인해주세요.")
        print("   시작 방법:")
        print("   - macOS: brew services start mongodb-community")
        print("   - 또는: mongod --dbpath /path/to/data")
        exit(1)
    
    # 모든 데이터베이스 확인
    print("\n📋 MongoDB의 모든 데이터베이스:")
    db_list = client.list_database_names()
    for db_name in db_list:
        if db_name not in ['admin', 'config', 'local']:  # 시스템 DB 제외
            temp_db = client[db_name]
            collections = temp_db.list_collection_names()
            total_docs = sum(temp_db[col].count_documents({}) for col in collections)
            print(f"   - {db_name}: {len(collections)}개 컬렉션, 총 {total_docs}건")
    
    # 원본 데이터 찾기: 모든 데이터베이스에서 biblioSummaryInfoArray 필드가 있는 컬렉션 찾기
    raw_db_name = None
    raw_collection_name = None
    
    for db_name in db_list:
        if db_name in ['admin', 'config', 'local']:
            continue
        temp_db = client[db_name]
        collections = temp_db.list_collection_names()
        
        for col_name in collections:
            sample = temp_db[col_name].find_one()
            if sample and 'biblioSummaryInfoArray' in sample:
                raw_db_name = db_name
                raw_collection_name = col_name
                print(f"\n✅ 원본 데이터 발견!")
                print(f"   데이터베이스: {db_name}")
                print(f"   컬렉션: {col_name}")
                print(f"   문서 수: {temp_db[col_name].count_documents({})}건")
                break
        
        if raw_db_name:
            break
    
    if not raw_db_name:
        print("\n❌ 원본 데이터를 찾을 수 없습니다!")
        print("\n📝 원본 데이터를 MongoDB에 먼저 로드해야 합니다.")
        print("   원본 데이터는 다음 형식이어야 합니다:")
        print("   - biblioSummaryInfoArray 필드 포함")
        print("   - abstractInfoArray 필드 포함")
        print("   - claimInfoArray 필드 포함")
        print("\n   데이터 로드 방법:")
        print("   1. JSON 파일이 있다면: mongoimport --db <db_name> --collection <collection_name> --file <file.json>")
        print("   2. 또는 Python 스크립트로 데이터를 MongoDB에 저장")
        exit(1)
    
    # 원본 데이터베이스와 컬렉션 설정
    raw_db = client[raw_db_name]
    raw_col = raw_db[raw_collection_name]
    service_col = db["patents"]  # 변환된 데이터는 linkai DB의 patents 컬렉션에 저장
    
    # Elasticsearch 클라이언트 초기화
    es = get_es_client()
    es_enabled = es is not None

    docs = list(raw_col.find())
    print(f"🚀 [필드 정정] 데이터 이관 시작 ({len(docs)}건)...")
    if es_enabled:
        print("📡 Elasticsearch 동기화 활성화됨")
    
    ops = []
    es_actions = []  # Elasticsearch bulk actions
    es_count = 0
    
    for raw in tqdm(docs, desc="변환 및 저장 중"):
        data = transform_raw_to_service(raw)
        if data:
            # MongoDB 저장 준비
            ops.append(UpdateOne({"applicationNumber": data["applicationNumber"]}, {"$set": data}, upsert=True))
            
            # Elasticsearch 인덱싱 준비
            if es_enabled:
                # _id를 applicationNumber로 사용 (또는 MongoDB _id 사용 가능)
                doc_id = str(data.get("rawRef") or data["applicationNumber"])
                # rawRef를 문자열로 변환
                es_doc = data.copy()
                if "rawRef" in es_doc:
                    es_doc["rawRef"] = str(es_doc["rawRef"])
                
                es_actions.append({
                    "_index": "patents",
                    "_id": doc_id,
                    "_source": es_doc
                })
            
            # MongoDB bulk write (500개마다)
            if len(ops) >= 500:
                service_col.bulk_write(ops)
                ops = []
            
            # Elasticsearch bulk index (500개마다)
            if es_enabled and len(es_actions) >= 500:
                success, failed = bulk(es, es_actions, raise_on_error=False)
                es_count += success
                if failed:
                    print(f"⚠️  Elasticsearch 인덱싱 실패: {len(failed)}건")
                es_actions = []
    
    # 남은 데이터 처리
    if ops:
        service_col.bulk_write(ops)
    
    if es_enabled:
        if es_actions:
            success, failed = bulk(es, es_actions, raise_on_error=False)
            es_count += success
            if failed:
                print(f"⚠️  Elasticsearch 인덱싱 실패: {len(failed)}건")
        
        # 인덱스 새로고침 (검색 가능하도록)
        es.indices.refresh(index="patents")
        print(f"✅ Elasticsearch 동기화 완료: {es_count}건 인덱싱됨")
    
    print("\n✅ MongoDB 이관 완료! 이제 모달에서 요약과 청구항이 완벽히 분리되어 보입니다.")
    if es_enabled:
        print("✅ Elasticsearch 동기화 완료! UI에서 바로 검색 가능합니다.")