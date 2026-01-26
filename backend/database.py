import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from urllib.parse import urlsplit

def load_backend_environment_variables() -> None:
    backend_dir: str = os.path.abspath(os.path.dirname(__file__))
    root_dir: str = os.path.abspath(os.path.join(backend_dir, ".."))
    root_env_path: str = os.path.join(root_dir, ".env")
    backend_env_path: str = os.path.join(backend_dir, ".env")
    load_dotenv(dotenv_path=root_env_path)
    load_dotenv(dotenv_path=backend_env_path, override=True)
    load_dotenv(override=True)

load_backend_environment_variables()

def _is_running_in_docker() -> bool:
    if os.path.exists("/.dockerenv"):
        return True
    env_raw: str = (os.getenv("RUNNING_IN_DOCKER") or "").strip().lower()
    return env_raw in ["1", "true", "yes", "y", "on"]

def _resolve_local_mongo_uri(raw_uri: str) -> str:
    default_uri: str = "mongodb://127.0.0.1:27017"
    try:
        host: str = urlsplit(raw_uri).hostname or ""
        if host == "mongo" and not _is_running_in_docker():
            return default_uri
        return raw_uri
    except Exception:
        return raw_uri

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
        else:
            mongo_uri = _resolve_local_mongo_uri(mongo_uri)
        
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