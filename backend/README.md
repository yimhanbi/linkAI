# Backend (FastAPI)

## Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Environment variables

Create `backend/.env` (not committed):

- `MONGODB_URI`: MongoDB connection string
- `OPENAI_API_KEY`
- `QDRANT_URL`
- `QDRANT_API_KEY`

## Run

```bash
cd /Users/imhanbi/dev/linkai
uvicorn backend.main:app --reload
```

If you prefer running it while your current directory is `backend/`, add the repo root to `PYTHONPATH`:

```bash
cd backend
PYTHONPATH=.. uvicorn backend.main:app --reload
```

## Docker (local)

From repo root:

```bash
docker compose up --build
```

Required env vars (set in your shell or Railway variables):

- `MONGODB_URI` (or `MONGO_URI`)
- `ELASTICSEARCH_URL`
- `OPENAI_API_KEY`
- `QDRANT_URL`
- `QDRANT_API_KEY`
- Optional: `PDF_DIR`

