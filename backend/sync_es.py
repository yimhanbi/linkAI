import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from elasticsearch import AsyncElasticsearch
import os
from dotenv import load_dotenv

load_dotenv()

async def sync_data():
    # 1. 환경 변수 확인
    mongo_uri = os.getenv("MONGO_URI")
    db_name = os.getenv("DB_NAME", "moaai_db")
    
    # 2. 클라이언트 초기화
    mongo_client = AsyncIOMotorClient(mongo_uri)
    db = mongo_client[db_name]
    
    # localhost 대신 127.0.0.1 사용 (맥북 네트워크 안정성)
    es = AsyncElasticsearch(
        "http://127.0.0.1:9200",
        verify_certs=False,
        request_timeout=30
    )

    try:
        # 3. 연결 테스트
        if await es.ping():
            print("✅ Elasticsearch 연결 성공!")
        else:
            print("❌ Elasticsearch 연결 실패 (서버 응답 없음)")
            return

        print("🚀 데이터 동기화 시작...")
        count = 0
        
        # 4. MongoDB 데이터 읽기 및 인덱싱
        async for patent in db.patents.find({}):
            # _id 필드 처리
            p_id = str(patent.pop("_id"))
            if "rawRef" in patent:
                patent["rawRef"] = str(patent["rawRef"])

            # Elasticsearch 저장
            await es.index(index="patents", id=p_id, document=patent)
            count += 1
            if count % 10 == 0:
                print(f"진행 중: {count}개 완료")

        # 5. 인덱스 새로고침
        await es.indices.refresh(index="patents")
        print(f"🎉 동기화 완료! 총 {count}개의 데이터가 이동되었습니다.")

    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")
    
    finally:
        # 6. 안전하게 연결 종료
        await es.close()
        mongo_client.close()
        print("🔌 연결 종료")

if __name__ == "__main__":
    asyncio.run(sync_data())