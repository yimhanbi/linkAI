# Frontend (React + Vite)

## Setup

```bash
cd frontend
npm install
```

## Environment variables

Create `frontend/.env.local` (not committed) if needed.

## Run

```bash
cd frontend
npm run dev
```

## Build

```bash
cd frontend
npm run build
```

## Docker (local)

From repo root:

```bash
docker compose up --build
```

For production builds, the backend URL is baked at build time via:

- `VITE_BACKEND_URL`

