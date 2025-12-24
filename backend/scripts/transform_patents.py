import os
import pymongo
from dotenv import load_dotenv
from pprint import pprint
from tqdm import tqdm 

# 1. 환경 변수 로드
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(dotenv_path=env_path)

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME")

def get_db():
    client = pymongo.MongoClient(MONGO_URI)
    return client[DB_NAME]

def transform_raw_to_service(raw):
    """원본 데이터를 서비스용 스키마(Validator 준수)로 변환"""
    try:
        # [공통] 필수 식별자 추출
        app_num = raw.get('applicationNumber')
        if not app_num:
            return None

        file_detail = raw.get('fileDetail', {})

        # 1. IPC 코드 처리 (원칙: 원본 문자열 배열 그대로 저장)
        ipc_codes = []
        ipc_wrapper = raw.get('ipcInfoArray', {})
        if ipc_wrapper:
            ipc_info = ipc_wrapper.get('ipcInfo', [])
            if isinstance(ipc_info, dict): ipc_info = [ipc_info]
            ipc_codes = [item.get('ipcNumber').strip() for item in ipc_info if item.get('ipcNumber')]
        
        # Validator 필수값(required) 충족을 위한 안전장치
        if not ipc_codes:
            ipc_codes = ["Unknown"]

        # 2. 출원인(Applicant) 처리 (Validator: 단일 Object {name, country})
        applicant_wrapper = raw.get('applicantInfoArray', {})
        applicant_info = applicant_wrapper.get('applicantInfo', [])
        if isinstance(applicant_info, dict): applicant_info = [applicant_info]
        
        # 첫 번째 출원인 정보를 가져옴
        app_name = "Unknown Applicant"
        if applicant_info and len(applicant_info) > 0:
            app_name = applicant_info[0].get('name', "Unknown Applicant")

        applicant_obj = {
            "name": app_name.strip(),
            "country": None # Validator에서 null 허용
        }

        # 3. 발명자(Inventors) 처리 (Validator: Array of Objects {name, country})
        inventor_wrapper = raw.get('inventorInfoArray', {})
        inventor_info = inventor_wrapper.get('inventorInfo', [])
        if isinstance(inventor_info, dict): inventor_info = [inventor_info]
        
        inventor_objects = [
            {"name": item.get('name', "").strip(), "country": None} 
            for item in inventor_info if item.get('name')
        ]

        # 4. 최종 변환 데이터 조립
        transformed = {
            "applicationNumber": str(app_num),
            "title": {
                "ko": file_detail.get('inventionTitle', "제목 없음").strip(),
                "en": None
            },
            "applicant": applicant_obj,
            "inventors": inventor_objects,
            "ipcCodes": ipc_codes,
            "abstract": file_detail.get('summary', "").strip() or None,
            "claims": [], # 향후 확장성 위해 빈 배열 유지
            "rawRef": raw.get('_id') # 원본 데이터 추적용
        }
        return transformed

    except Exception as e:
        print(f"⚠️ 변환 중 개별 문서 오류 발생: {e}")
        return None

if __name__ == "__main__":
    db = get_db()
    raw_col = db["moaai_db"]    
    service_col = db["patents"] 

    # 전체 데이터 개수 확인
    total_docs = raw_col.count_documents({})
    print(f"🚀 전체 데이터 이관 시작 (총 {total_docs}건)...")
    
    # limit(10) 제거, 전체 데이터 조회
    raw_data_list = raw_col.find()
    
    success_count = 0
    error_count = 0

    # tqdm을 사용하여 진행 상황 시각화
    for raw in tqdm(raw_data_list, total=total_docs, desc="변환 중"):
        transformed = transform_raw_to_service(raw)
        
        if transformed:
            try:
                service_col.update_one(
                    {"applicationNumber": transformed["applicationNumber"]},
                    {"$set": transformed},
                    upsert=True
                )
                success_count += 1
            except Exception as e:
                # 에러 발생 시 상세 이유 기록 (디버깅용)
                # print(f"❌ 저장 실패: {transformed['applicationNumber']} - {e}")
                error_count += 1
        else:
            error_count += 1

    print("\n" + "="*50)
    print(f"🎊 이관 완료!")
    print(f"✅ 최종 성공: {success_count} / {total_docs}")
    print(f"❌ 최종 실패: {error_count}")
    print("="*50)