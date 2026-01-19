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
cd backend
uvicorn main:app --reload
```

