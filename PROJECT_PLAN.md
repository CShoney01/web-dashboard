# 프로젝트 설계 계획서

**프로젝트명:** Personal Web Dashboard  
**GitHub Repository:** https://github.com/CShoney01/web-dashboard

---

## 1. 서비스 개요 및 주요 기능

### 서비스 개요

개인 맞춤형 웹 대시보드 서비스로, 하나의 화면에서 일상에 필요한 다양한 정보를 위젯 단위로 확인하고 관리할 수 있는 서비스이다.
사용자는 할 일 관리, 메모, 북마크, 금융 정보, 날씨, 뉴스 등을 한 페이지에서 조회·편집할 수 있으며, 여러 위젯 섹션을 슬라이딩하여 탐색한다.

### 주요 기능

| #   | 위젯              | 기능 설명                                               |
| --- | ----------------- | ------------------------------------------------------- |
| 1   | **Todo**          | 할 일 목록 추가·완료 체크·삭제                          |
| 2   | **Memo**          | 자유 메모 작성·수정·삭제                                |
| 3   | **Bookmarks**     | URL 즐겨찾기 등록·방문                                  |
| 4   | **Weather**       | 도시명 기반 현재 날씨 조회 (Open-Meteo API)             |
| 5   | **Stock**         | 주식 종목 시세 조회 (Alpha Vantage / Yahoo Finance API) |
| 6   | **Crypto**        | 암호화폐 시세 조회 (CoinGecko API)                      |
| 7   | **Exchange Rate** | 주요 통화 환율 조회 (ExchangeRate-API)                  |
| 8   | **RSS News**      | 사용자 지정 RSS 피드 구독·기사 목록 표시                |
| 9   | **Naver News**    | 네이버 뉴스 검색 API 연동 (Nginx 프록시로 CORS 우회)    |
| 10  | **Budget**        | 지출 내역 기록·합계 표시                                |
| 11  | **Quote**         | 명언 무작위 표시                                        |
| 12  | **Calendar**      | 이번 달 달력 표시                                       |

### 부가 기능

- **캐러셀 레이아웃:** 위젯 섹션을 좌우 슬라이드로 탐색, 키보드 ←→ 지원
- **위젯 배경 테마:** 위젯별 파스텔 8색 색상 선택 (Zustand persist로 저장)

---

## 2. 기술 스택

### 2-1. Frontend

| 분류            | 기술                 | 버전 | 용도                             |
| --------------- | -------------------- | ---- | -------------------------------- |
| UI 프레임워크   | React                | 18.3 | 컴포넌트 기반 SPA                |
| 빌드 도구       | Vite                 | 5.3  | 개발 서버 + 번들러               |
| 스타일링        | Tailwind CSS         | 3.4  | 유틸리티 CSS                     |
| UI 컴포넌트     | shadcn/ui (Radix UI) | —    | Card, Button, Badge, Input       |
| 상태 관리       | Zustand              | 4.5  | 전역 상태 + localStorage persist |
| HTTP 클라이언트 | axios                | 1.7  | REST API 호출                    |
| 드래그 앤 드롭  | @dnd-kit             | 6/8  | 위젯 순서 재정렬                 |
| 아이콘          | lucide-react         | 1.17 | UI 아이콘                        |

### 2-2. Backend

| 분류            | 기술                  | 버전        | 용도                     |
| --------------- | --------------------- | ----------- | ------------------------ |
| 런타임          | Node.js               | 20 (Alpine) | 서버 실행 환경           |
| 프레임워크      | Express               | 4.x (ESM)   | REST API 서버            |
| DB 클라이언트   | @supabase/supabase-js | 2.x         | Supabase PostgreSQL 연결 |
| 프로세스 매니저 | supervisord           | —           | Nginx + Node 동시 실행   |

### 2-3. 외부 API

| API              | 용도          | 인증 방식                              |
| ---------------- | ------------- | -------------------------------------- |
| Open-Meteo       | 날씨 조회     | 무료, 키 불필요                        |
| CoinGecko        | 암호화폐 시세 | 무료 플랜                              |
| ExchangeRate-API | 환율          | 무료 플랜                              |
| Alpha Vantage    | 주식 시세     | API Key                                |
| Naver 검색 API   | 뉴스 검색     | Client-ID / Secret (Nginx 프록시 경유) |

### 2-4. Web Storage / DBMS 사용 전략

```
개발 초기            →  localStorage / IndexedDB (클라이언트 전용)
배포 이후 (현재)     →  Supabase (PostgreSQL) — 서버 사이드 영속성
```

- **Supabase:** todos, memos, bookmarks, budget_expenses, rss_feeds, widget_settings 등 8개 테이블에 영속 데이터 저장
- **localStorage (Zustand persist):** 위젯 배경색·UI 설정 등 UI 상태만 클라이언트에 저장

#### 백엔드 API 엔드포인트

```
GET/POST/PATCH/DELETE  /api/todos
GET/POST/PATCH/DELETE  /api/memos
GET/POST/PATCH/DELETE  /api/bookmarks
GET/POST/PATCH/DELETE  /api/budget_expenses
GET/POST/PATCH/DELETE  /api/rss_feeds
GET/PATCH              /api/widget_settings/:key
```

### 2-5. Reverse-Proxy (Nginx) 사용 계획

| 역할             | 설정 내용                                                       |
| ---------------- | --------------------------------------------------------------- |
| 정적 파일 서빙   | `/usr/share/nginx/html` → Vite 빌드 결과물                      |
| API 프록시       | `/api/*` → `http://127.0.0.1:4000` (Express)                    |
| CORS 우회 프록시 | `/naver-news` → `https://openapi.naver.com/v1/search/news.json` |

### 2-6. Docker 사용 계획

Render에 배포되는 Docker 이미지는 **프론트엔드, 백엔드, 웹 서버를 하나로 합친 단일 이미지**이다.

**이미지에 포함된 구성 요소**

| 구성 요소              | 역할                                                         |
| ---------------------- | ------------------------------------------------------------ |
| 빌드된 React 정적 파일 | 브라우저에 전달되는 HTML/CSS/JS                              |
| Nginx                  | 80번 포트로 외부 요청을 받아 정적 파일 서빙 및 API 요청 전달 |
| Express 서버           | Nginx로부터 전달된 API 요청을 처리하고 Supabase DB와 통신    |

외부에서 보이는 포트는 **80번(Nginx) 하나뿐**이며, Express 서버는 이미지 내부에서만 동작한다.
Render는 이 이미지를 그대로 받아 실행하므로 별도의 서버 설정 없이 배포가 완료된다.

- 필요한 환경 변수: `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (Render 대시보드에서 입력)

---

## 3. GitHub 계정 및 Repository

| 항목        | 내용                                       |
| ----------- | ------------------------------------------ |
| Repository  | https://github.com/CShoney01/web-dashboard |
| 공개 범위   | Public                                     |
| 기본 브랜치 | `main`                                     |

## 4. CI/CD 계획

GitHub Actions을 사용하여 CI/CD를 구성한다.

### 흐름

```
개발자 push (main) → GitHub Actions 실행 → 린트·빌드 검증(CI) → Render Deploy Hook 호출(CD) → Render 배포
```

### 단계별 설명

| 단계   | 내용                                                                            |
| ------ | ------------------------------------------------------------------------------- |
| **CI** | 코드 push 시 lint와 프론트엔드 빌드를 자동 실행하여 오류가 있으면 배포를 막는다 |
| **CD** | CI가 모두 통과했을 때만 Render의 Deploy Hook URL을 호출하여 배포를 트리거한다   |

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: CI/CD

on:
  push:
    branches: [main]

jobs:
  ci-cd:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build

      - name: Deploy to Render
        run: curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK_URL }}
```

### 사전 준비

- Render 서비스 생성 후 **Deploy Hook URL**을 발급받아 GitHub Repository의 **Settings > Secrets > Actions**에 `RENDER_DEPLOY_HOOK_URL`로 등록한다.
- Render 대시보드에서 **Auto-Deploy를 비활성화**하여 GitHub Actions 외의 경로로는 배포가 일어나지 않도록 한다.

---
