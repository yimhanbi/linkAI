# LinkAI - 특허 검색 시스템

React + TypeScript + Vite 기반의 특허 검색 및 분석 플랫폼으로, Elasticsearch를 활용한 고성능 검색 엔진과 MongoDB를 통한 데이터 관리 기능을 제공합니다.

## Repository layout

- Frontend: `frontend/` (React + Vite) — see `frontend/README.md`
- Backend: `backend/` (FastAPI) — see `backend/README.md`
Each side has its own README:

- `frontend/README.md`
- `backend/README.md`

## Deploy on Railway (Docker)

This repo is a monorepo (two services). Create **two Railway Services**, both from the same GitHub repo:

### 1) Backend service (FastAPI)

- **Builder**: Dockerfile
- **Dockerfile path**: `backend/Dockerfile`
- **Port**: Railway provides `PORT` automatically (the container uses it)
- **Variables** (set in Railway):
  - `MONGODB_URI` (or `MONGO_URI`)
  - `DB_NAME` (optional)
  - `ELASTICSEARCH_URL`
  - `OPENAI_API_KEY`
  - `QDRANT_URL`
  - `QDRANT_API_KEY`
  - `SECRET_KEY` (recommended)
  - `PDF_DIR` (optional; default is `/app/backend/storage/pdfs`)

### 2) Frontend service (Vite build + static serve)

- **Builder**: Dockerfile
- **Dockerfile path**: `frontend/Dockerfile`
- **Build arg**:
  - `VITE_BACKEND_URL` = your backend public URL (e.g. `https://<backend>.up.railway.app`)
- **Port**: Railway provides `PORT` automatically (the container uses it)

## 주요 기여 사항

- **고성능 검색 엔진**: Elasticsearch 기반의 실시간 특허 검색 시스템 구축
- **다크모드 지원**: 전역 테마 시스템을 통한 라이트/다크 모드 자동 전환
- **반응형 UI**: Ant Design 기반의 모던하고 직관적인 사용자 인터페이스
- **고급 검색 기능**: AND/OR 연산자 지원, 다중 필드 검색, 필터링 기능
- **PDF 통합**: 특허 공보 PDF 파일 조회 및 관리 시스템
- **데이터 동기화**: MongoDB와 Elasticsearch 간 자동 데이터 동기화

## 시스템 주요 기능

### 1. 고급 특허 검색
- **다중 키워드 검색**: 기술 키워드, 제품 키워드, 명세서, 청구범위 검색
- **AND/OR 연산자 지원**: 복합 검색 쿼리 작성 가능
- **필터링**: 발명자, 책임연구자, 출원인, 출원번호, 등록번호, 법적 상태 필터
- **국가별 분류**: 한국/해외 특허 자동 분류 및 통계 제공

### 2. 특허 상세 정보
- **상세 정보 조회**: 출원번호, 공개번호, 등록번호, IPC/CPC 코드 등
- **요약 및 청구항**: 발명의 요약, 대표청구항, 전체 청구항 조회
- **발명자 정보**: 발명자 목록 및 소속 정보
- **PDF 뷰어**: 특허 공보 PDF 파일 인라인 뷰어

### 3. 사용자 인터페이스
- **다크모드**: 라이트/다크 테마 자동 전환
- **반응형 레이아웃**: 사이드바 네비게이션 및 메인 콘텐츠 영역
- **탭 기반 필터링**: 전체/한국/해외 특허 탭으로 빠른 필터링
- **페이지네이션**: 대용량 데이터 효율적 탐색

### 4. 데이터 관리
- **MongoDB 통합**: 특허 데이터 영구 저장 및 관리
- **Elasticsearch 동기화**: 검색 성능 최적화를 위한 자동 동기화
- **PDF 파일 관리**: 로컬 스토리지 기반 PDF 파일 관리 시스템

## 기술 스택

### Frontend
- **React 19.2.0**: UI 라이브러리
- **TypeScript**: 타입 안정성
- **Vite 7.2.4**: 빌드 도구 및 개발 서버
- **Ant Design 6.1.1**: UI 컴포넌트 라이브러리
- **React Router 7.10.1**: 라우팅
- **Styled Components 6.1.19**: CSS-in-JS 스타일링
- **Axios 1.13.2**: HTTP 클라이언트

### Backend
- **FastAPI**: 고성능 Python 웹 프레임워크
- **MongoDB**: NoSQL 데이터베이스 (Motor 비동기 드라이버)
- **Elasticsearch**: 검색 엔진
- **Python 3.12+**: 백엔드 언어

### 개발 도구
- **ESLint**: 코드 품질 관리
- **TypeScript ESLint**: TypeScript 린팅
- **Git**: 버전 관리

## PDF 파일 관리

### 중요: PDF 파일은 Git에 포함되지 않습니다

- PDF 파일들은 `backend/storage/pdfs/` 디렉토리에 저장됩니다 (약 4.4GB)
- Git에는 코드만 포함되며, PDF 파일들은 `.gitignore`에 의해 제외됩니다
- 각 환경(개발/프로덕션)에서 PDF 파일을 별도로 관리해야 합니다

### PDF 파일 설정 방법

1. **로컬 개발 환경**:
   ```bash
   # backend/storage/pdfs/ 디렉토리에 PDF 파일들을 복사
   mkdir -p backend/storage/pdfs
   # PDF 파일들을 해당 디렉토리에 배치
   ```

2. **프로덕션 환경**:
   - 서버에 `backend/storage/pdfs/` 디렉토리 생성
   - PDF 파일들을 서버에 직접 복사 또는 rsync 사용
   - FastAPI가 `/static/pdfs/` 경로로 제공합니다

3. **PDF 경로 업데이트**:
   ```bash
   # MongoDB에 PDF 경로를 업데이트하는 스크립트 실행
   python backend/update_pdf_paths.py
   ```

### 향후 개선 방안

- 클라우드 스토리지 (AWS S3, Google Cloud Storage) 연동
- CDN을 통한 PDF 파일 제공
- Git LFS 사용 (용량 제한 고려 필요)

## 시작하기

### 필수 요구사항

- Node.js 18+
- Python 3.12+
- MongoDB
- Elasticsearch

### 설치 및 실행

1. **프론트엔드 설정**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

2. **백엔드 설정**:
   ```bash
   cd backend
   pip install -r requirements.txt
   cd ..
   uvicorn backend.main:app --reload
   ```

3. **환경 변수 설정**:
   - Backend: `backend/.env`에 `MONGODB_URI` 및 기타 설정 추가
   - Frontend: 필요 시 `frontend/.env.local` 사용

## 라이선스

이 프로젝트는 한양대학교 산학협력단에게 있습니다.
