# LinkAI - 특허 검색 시스템

React + TypeScript + Vite 기반의 특허 검색 및 분석 플랫폼

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

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is currently not compatible with SWC. See [this issue](https://github.com/vitejs/vite-plugin-react/issues/428) for tracking the progress.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
