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
    try:
        # [공통] 필수 식별자 추출
        app_num = raw.get('applicationNumber')
        if not app_num:
            return None

        file_detail = raw.get('fileDetail', {}) 
        
        # 1. 행정상태 (가급적 구체적인 상태값 우선 추출)
        status = raw.get('applicationStatus') or raw.get('registrationStatus') or "공개"

        # 2. 대표청구항 처리
        claim_info_array = raw.get('claimInfoArray', {}).get('claimInfo', [])
        if isinstance(claim_info_array, dict): 
            claim_info_array = [claim_info_array]
        
        if claim_info_array and len(claim_info_array) > 0:
            claim_text = claim_info_array[0].get('claim', "").strip()
        else:
            claim_text = raw.get('representativeClaim') or "내용 없음"

        # 3. 요약(Abstract) 데이터 정제 (불필요한 헤더 제거)
        raw_summary = file_detail.get('summary', "")
        clean_abstract = raw_summary.split('【')[0].strip() if '【' in raw_summary else raw_summary.strip()

        # 4. CPC 코드 처리
        cpc_codes = []
        cpc_wrapper = raw.get('cpcInfoArray', {})
        if cpc_wrapper:
            cpc_info = cpc_wrapper.get('cpcInfo', [])
            if isinstance(cpc_info, dict): cpc_info = [cpc_info]
            cpc_codes = [item.get('cpcNumber').strip() for item in cpc_info if item.get('cpcNumber')]

        # 5. 날짜 및 번호들
        app_date = raw.get('applicationDate')
        pub_num = raw.get('publicationNumber')
        pub_date = raw.get('publicationDate')
        reg_num = raw.get('registrationNumber')
        reg_date = raw.get('registrationDate')

        # 6. IPC 코드
        ipc_codes = []
        ipc_wrapper = raw.get('ipcInfoArray', {})
        if ipc_wrapper:
            ipc_info = ipc_wrapper.get('ipcInfo', [])
            if isinstance(ipc_info, dict): ipc_info = [ipc_info]
            ipc_codes = [item.get('ipcNumber').strip() for item in ipc_info if item.get('ipcNumber')]
        if not ipc_codes: ipc_codes = ["Unknown"]

        # 7. 출원인 및 발명자 처리
        applicant_info = raw.get('applicantInfoArray', {}).get('applicantInfo', [])
        if isinstance(applicant_info, dict): applicant_info = [applicant_info]
        app_name = applicant_info[0].get('name', "Unknown Applicant").strip() if applicant_info else "Unknown Applicant"

        inventor_info = raw.get('inventorInfoArray', {}).get('inventorInfo', [])
        if isinstance(inventor_info, dict): inventor_info = [inventor_info]
        inventor_objects = [{"name": i.get('name', "").strip(), "country": None} for i in inventor_info if i.get('name')]

        # 최종 변환 데이터 조립
        transformed = {
            "applicationNumber": str(app_num),
            "applicationDate": app_date, 
            "status": status,            
            "title": {
                "ko": file_detail.get('inventionTitle', "제목 없음").strip(),
                "en": None
            },
            "applicant": {"name": app_name, "country": None},
            "inventors": inventor_objects,
            "ipcCodes": ipc_codes,
            "cpcCodes": cpc_codes,
            "publicationNumber": pub_num,
            "publicationDate": pub_date,
            "registrationNumber": reg_num,
            "registrationDate": reg_date,
            "abstract": clean_abstract or None,
            "representativeClaim": claim_text,
            "claims": [item.get('claim', '').strip() for item in claim_info_array if item.get('claim')],
            "rawRef": raw.get('_id')
        }
        return transformed

    except Exception as e:
        # 변환 단계에서의 오류 출력
        print(f"\n⚠️ 변환 중 개별 문서 오류 발생: {e}")
        return None

if __name__ == "__main__":
    db = get_db()
    raw_col = db["moaai_db"]    
    service_col = db["patents"] 

    total_docs = raw_col.count_documents({})
    print(f"🚀 전체 데이터 이관 시작 (총 {total_docs}건)...")
    
    raw_data_list = raw_col.find()
    
    success_count = 0
    error_count = 0

    for raw in tqdm(raw_data_list, total=total_docs, desc="변환 중"):
        transformed = transform_raw_to_service(raw)
        
        if transformed:
            try:
                # upsert 실행
                service_col.update_one(
                    {"applicationNumber": transformed["applicationNumber"]},
                    {"$set": transformed},
                    upsert=True
                )
                success_count += 1
            except Exception as e:
                # ❌ 저장 실패 시 구체적인 이유 출력 
                print(f"\n❌ DB 저장 실패 (출원번호: {transformed.get('applicationNumber')}): {e}")
                error_count += 1
        else:
            error_count += 1

    print("\n" + "="*50)
    print(f"🎊 이관 완료!")
    print(f"✅ 최종 성공: {success_count} / {total_docs}")
    print(f"❌ 최종 실패: {error_count}")
    print("="*50)