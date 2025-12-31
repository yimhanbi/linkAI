import os
import pymongo
from dotenv import load_dotenv

load_dotenv()

def update_pdf_metadata():
    # 1. 클라우드 MongoDB 주소 사용 (sync_es.py와 동일한 주소)
    mongo_uri = "mongodb+srv://hanbi1_db_user:moaai1234@cluster0.aw3hxbh.mongodb.net/"
    print(f"📡 클라우드 MongoDB 연결 시도...")

    client = pymongo.MongoClient(mongo_uri)
    db = client["moaai_db"] 
    patents_col = db["patents"]

    # 2. PDF 폴더 경로
    pdf_dir = "/Users/imhanbi/dev/linkai/backend/storage/pdfs"
    
    if not os.path.exists(pdf_dir):
        print(f"❌ 폴더를 찾을 수 없습니다: {pdf_dir}")
        return

    pdf_files = [f for f in os.listdir(pdf_dir) if f.endswith('.pdf')]
    print(f"📂 발견된 PDF 파일: {len(pdf_files)}개")

    updated_count = 0
    for file_name in pdf_files:
        # 확장자 제거 (1020060006323)
        app_num_str = os.path.splitext(file_name)[0].strip()
        
        # 문자열 또는 숫자 타입 모두 대응
        query = {
            "$or": [
                {"applicationNumber": app_num_str},
                {"applicationNumber": int(app_num_str) if app_num_str.isdigit() else None}
            ]
        }
        
        result = patents_col.update_one(
            query,
            {"$set": {
                "pdfPath": f"/static/pdfs/{file_name}",
                "hasPdf": True
            }}
        )

        if result.matched_count > 0:
            updated_count += 1
            if updated_count % 100 == 0:
                print(f"✅ 진행 중... {updated_count}개 연결 완료")

    print(f"\n🎉 완료! 총 {updated_count}개의 특허에 PDF 경로가 연결되었습니다.")

if __name__ == "__main__":
    update_pdf_metadata()