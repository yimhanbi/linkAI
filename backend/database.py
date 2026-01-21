import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

def load_backend_environment_variables() -> None:
    backend_dir: str = os.path.abspath(os.path.dirname(__file__))
    root_dir: str = os.path.abspath(os.path.join(backend_dir, ".."))
    root_env_path: str = os.path.join(root_dir, ".env")
    backend_env_path: str = os.path.join(backend_dir, ".env")
    load_dotenv(dotenv_path=root_env_path)
    load_dotenv(dotenv_path=backend_env_path, override=True)
    load_dotenv(override=True)

load_backend_environment_variables()

class MongoDB:
    def __init__(self):
        self.client = None
        self.db = None

    def connect(self):
        mongo_uri = os.getenv("MONGODB_URI") or os.getenv("MONGO_URI")
        db_name = os.getenv("DB_NAME")
        
        if not mongo_uri:
            print("⚠️  MONGODB_URI/MONGO_URI 환경 변수가 설정되지 않았습니다. 기본값을 사용합니다.")
            mongo_uri = "mongodb://localhost:27017"
        
        if not db_name:
            print("⚠️  DB_NAME 환경 변수가 설정되지 않았습니다. 기본값을 사용합니다.")
            db_name = "moaai_db"
        
        self.client = AsyncIOMotorClient(mongo_uri)
        self.db = self.client[db_name]
        print(f"✅ MongoDB 비동기 연결 성공 (DB: {db_name})")

    def close(self):
        if self.client:
            self.client.close()
            print("❌ MongoDB 연결 종료")

db_manager = MongoDB()