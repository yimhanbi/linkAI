import os
import pymongo
from pymongo import UpdateOne
from bson import ObjectId
from dotenv import load_dotenv
from tqdm import tqdm
from elasticsearch import Elasticsearch
from elasticsearch.helpers import bulk 

# 1. 환경 설정 및 DB 연결
def get_db(db_name=None, use_cloud=False):
    # .env 파일 로드 시도 (경로를 더 명확하게 지정)
    # 1. 루트 .env 파일 로드
    root_env_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
    if os.path.exists(root_env_path):
        load_dotenv(dotenv_path=root_env_path)
    
    # 2. backend/.env 파일 로드 (우선순위 높음)
    backend_env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    if os.path.exists(backend_env_path):
        load_dotenv(dotenv_path=backend_env_path, override=True)  # override=True로 backend/.env 우선 적용
    
    # 3. 현재 디렉토리에서도 시도
    load_dotenv(override=True)
    
    # 클라우드 MongoDB 사용 옵션
    if use_cloud:
        mongo_uri = "mongodb+srv://hanbi1_db_user:moaai1234@cluster0.aw3hxbh.mongodb.net/"
        print("☁️ 클라우드 MongoDB 사용")
    else:
        mongo_uri = os.getenv("MONGO_URI") or "mongodb://localhost:27017"
    
    if not db_name:
        db_name = os.getenv("DB_NAME") or "moaai_db"  # 🚀 DB_NAME이 None이면 'moaai_db'를 기본값으로 사용
    
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

        # G. 대리인 정보 (agentInfo) 처리
        agent_root = raw.get('agentInfoArray')
        agent_info = []
        if isinstance(agent_root, dict):
            agent_data = agent_root.get('agentInfo')
            if agent_data:
                # 리스트화 후, None이나 빈 객체({})가 아닌 것만 필터링
                raw_list = [agent_data] if isinstance(agent_data, dict) else (agent_data if isinstance(agent_data, list) else [])
                agent_info = [item for item in raw_list if item and isinstance(item, dict)]
        
        # H. 패밀리 정보 (familyInfo) 처리
        family_root = raw.get('familyInfoArray')
        family_info = []
        if isinstance(family_root, dict):
            family_data = family_root.get('familyInfo')
            if family_data:
                # [null] 형태나 무의미한 값을 방지하기 위해 dict 형태인 것만 유지
                raw_list = [family_data] if isinstance(family_data, dict) else (family_data if isinstance(family_data, list) else [])
                family_info = [item for item in raw_list if item and isinstance(item, dict)]

        # I. 글로벌 패밀리 정보 (docdbFamily) 처리
        docdb_root = raw.get('docdbFamilyInfoArray')
        global_family_info = []
        if isinstance(docdb_root, dict):
            docdb_data = docdb_root.get('familyItem')
            if docdb_data:
                raw_list = [docdb_data] if isinstance(docdb_data, dict) else (docdb_data if isinstance(docdb_data, list) else [])
                global_family_info = [item for item in raw_list if item and isinstance(item, dict)]

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
            "rawRef": raw.get('_id') if raw.get('_id') and isinstance(raw.get('_id'), ObjectId) else (ObjectId(raw.get('_id')) if raw.get('_id') and isinstance(raw.get('_id'), str) and len(raw.get('_id')) == 24 else None),
            "familyInfo": family_info,
            "docdbFamily": global_family_info,
            "agentInfo": agent_info
        }
    except Exception as e:
        print(f"Error processing {raw.get('applicationNumber')}: {e}")
        return None

if __name__ == "__main__":
    import sys
    
    # 명령줄 인자로 클라우드 사용 여부 확인
    use_cloud = "--cloud" in sys.argv or "-c" in sys.argv
    
    try:
        client, db = get_db(use_cloud=use_cloud)
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
    print(f"   발견된 데이터베이스: {len(db_list)}개")
    print(f"   전체 목록: {db_list}")
    
    user_dbs = [d for d in db_list if d not in ['admin', 'config', 'local']]
    if not user_dbs:
        print("   ⚠️ 사용 가능한 데이터베이스가 없습니다!")
        print("   MongoDB에 데이터가 있는지 확인해주세요.")
        print("\n💡 참고: 데이터가 클라우드 MongoDB(Atlas)에 있다면,")
        print("   backend/.env 파일의 MONGO_URI를 클라우드 주소로 변경하거나,")
        print("   클라우드에서 원본 데이터를 로컬로 가져와야 합니다.")
    
    for db_name in db_list:
        if db_name not in ['admin', 'config', 'local']:  # 시스템 DB 제외
            try:
                temp_db = client[db_name]
                collections = temp_db.list_collection_names()
                total_docs = sum(temp_db[col].count_documents({}) for col in collections)
                print(f"   - {db_name}: {len(collections)}개 컬렉션, 총 {total_docs}건")
                # 각 컬렉션 상세 정보 출력
                for col_name in collections:
                    try:
                        col_count = temp_db[col_name].count_documents({})
                        if col_count > 0:
                            sample = temp_db[col_name].find_one()
                            has_biblio = 'biblioSummaryInfoArray' in sample if sample else False
                            has_app_num = 'applicationNumber' in sample if sample else False
                            print(f"     └─ {col_name}: {col_count}건 (biblioSummaryInfoArray: {has_biblio}, applicationNumber: {has_app_num})")
                        else:
                            print(f"     └─ {col_name}: 0건 (비어있음)")
                    except Exception as e:
                        print(f"     └─ {col_name}: 확인 중 오류 - {e}")
            except Exception as e:
                print(f"   ⚠️ {db_name} 확인 중 오류: {e}")
    
    # 원본 데이터 찾기: 모든 데이터베이스에서 biblioSummaryInfoArray 필드가 있는 컬렉션 찾기
    raw_db_name = None
    raw_collection_name = None
    
    print("\n🔍 원본 데이터 검색 중...")
    for db_name in db_list:
        if db_name in ['admin', 'config', 'local']:
            continue
        temp_db = client[db_name]
        collections = temp_db.list_collection_names()
        
        for col_name in collections:
            try:
                # 샘플 데이터 확인 (여러 개 확인)
                samples = list(temp_db[col_name].find().limit(5))
                for sample in samples:
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
            except Exception as e:
                print(f"   ⚠️ {db_name}.{col_name} 확인 중 오류: {e}")
                continue
        
        if raw_db_name:
            break
    
    # 원본 데이터가 없을 경우, moaai_db의 다른 컬렉션 확인
    if not raw_db_name:
        print("\n⚠️ biblioSummaryInfoArray 필드가 있는 원본 데이터를 찾을 수 없습니다.")
        print("   moaai_db 데이터베이스의 다른 컬렉션을 확인합니다...")
        
        try:
            moaai_db = client.get_database("moaai_db")
            moaai_collections = moaai_db.list_collection_names()
            print(f"   moaai_db 컬렉션 목록: {moaai_collections}")
            
            for col_name in moaai_collections:
                if col_name == "patents":  # 이미 변환된 데이터는 건너뛰기
                    continue
                try:
                    col_count = moaai_db[col_name].count_documents({})
                    if col_count > 0:
                        sample = moaai_db[col_name].find_one()
                        if sample:
                            print(f"   - {col_name}: {col_count}건")
                            # biblioSummaryInfoArray가 없어도 다른 원본 필드가 있는지 확인
                            sample_keys = list(sample.keys())[:10]  # 처음 10개 키만 표시
                            print(f"     샘플 필드: {sample_keys}")
                            if any(key in sample for key in ['abstractInfoArray', 'claimInfoArray', 'applicantInfoArray']):
                                print(f"     ⚠️ 일부 원본 필드는 있지만 biblioSummaryInfoArray가 없습니다.")
                except Exception as e:
                    print(f"   ⚠️ {col_name} 확인 중 오류: {e}")
        except Exception as e:
            print(f"   ⚠️ moaai_db 확인 중 오류: {e}")
    
    if not raw_db_name:
        print("\n❌ 원본 데이터를 찾을 수 없습니다!")
        print("\n📝 원본 데이터를 MongoDB에 먼저 로드해야 합니다.")
        print("   원본 데이터는 다음 형식이어야 합니다:")
        print("   - biblioSummaryInfoArray 필드 포함")
        print("   - abstractInfoArray 필드 포함")
        print("   - claimInfoArray 필드 포함")
        print("\n   가능한 원본 데이터 위치:")
        print("   - moaai_db 데이터베이스의 다른 컬렉션")
        print("   - 다른 데이터베이스의 컬렉션")
        print("\n   데이터 로드 방법:")
        print("   1. JSON 파일이 있다면: mongoimport --db <db_name> --collection <collection_name> --file <file.json>")
        print("   2. 또는 Python 스크립트로 데이터를 MongoDB에 저장")
        exit(1)

    # 원본 데이터베이스와 컬렉션 설정
    raw_db = client[raw_db_name]
    raw_col = raw_db[raw_collection_name]
    service_col = db["patents"]  # 변환된 데이터는 moaai_db DB의 patents 컬렉션에 저장
    
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
