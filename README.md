# 프로젝트 설계 계획서

**프로젝트명:** Personal Web Dashboard
**GitHub Repository:** https://github.com/CShoney01/web-dashboard

---

## 1. 서비스 개요 및 주요 기능

### 서비스 개요

개인 맞춤형 웹 대시보드 서비스로, 하나의 화면에서 일상에 필요한 다양한 정보를 위젯(Widget) 단위로 확인하고 관리할 수 있는 SPA(Single Page Application)이다. 위젯은 금융·정보·생산성 세 개의 섹션으로 분류되며, 캐러셀(Carousel) 방식으로 섹션 간을 슬라이딩하여 탐색한다.

### 주요 기능

| # | 위젯 | 기능 설명 |
|---|------|-----------|
| 1 | **Todo** | 할 일 목록 추가·완료 체크·삭제 |
| 2 | **Memo** | 자유 메모 작성·수정·삭제 |
| 3 | **Bookmarks** | URL 즐겨찾기 등록·방문 |
| 4 | **Weather** | 대한민국 특별시·광역시 드롭다운 선택 기반 현재 날씨 및 5일 예보 조회 |
| 5 | **Stock** | 종목명 검색(영문)으로 관심종목 등록, 현재 시세·등락률·보유 손익 표시 |
| 6 | **Crypto** | 암호화폐 시세 조회 및 보유 손익 표시 |
| 7 | **Exchange Rate** | 주요 통화 환율 조회 |
| 8 | **RSS News** | 사용자 지정 RSS 피드 구독·기사 목록 표시 |
| 9 | **Naver News** | 네이버 뉴스 검색 API 연동 |
| 10 | **Budget** | 지출 내역 기록·합계 표시 |
| 11 | **Quote** | 명언 무작위 표시 |
| 12 | **Calendar** | Google 캘린더 OAuth 2.0 연동, 향후 2주 일정 표시 |

### 부가 기능

- **캐러셀 레이아웃:** 위젯 섹션을 좌우 슬라이드로 탐색, 키보드 ←→ 지원
- **위젯 배경 테마:** 위젯별 파스텔 8색 색상 선택
- **위젯 확대 보기:** 각 위젯을 모달로 확대하여 상세 내용 확인
- **드래그 앤 드롭:** 섹션 내 위젯 순서 자유롭게 재정렬

---

## 2. 기술 스택

### 2-1. Frontend

| 분류 | 기술 | 버전 | 용도 |
|------|------|------|------|
| UI 프레임워크 | React | 18.3 | 컴포넌트 기반 SPA |
| 빌드 도구 | Vite | 5.3 | 개발 서버 + 번들러 |
| 스타일링 | Tailwind CSS | 3.4 | 유틸리티 CSS |
| UI 컴포넌트 | shadcn/ui (Radix UI) | — | Card, Button, Badge, Input |
| 상태 관리 | Zustand | 4.5 | 전역 상태 + localStorage persist |
| HTTP 클라이언트 | axios | 1.7 | REST API 호출 |
| 드래그 앤 드롭 | @dnd-kit | 6/8 | 위젯 순서 재정렬 |
| 아이콘 | lucide-react | 1.17 | UI 아이콘 |

### 2-2. Backend

| 분류 | 기술 | 버전 | 용도 |
|------|------|------|------|
| 런타임 | Node.js | 22 (Alpine) | 서버 실행 환경 (WebSocket 네이티브 지원) |
| 프레임워크 | Express | 4.x (ESM) | REST API 서버 |
| DB 클라이언트 | @supabase/supabase-js | 2.x | Supabase PostgreSQL 연결 |
| HTTP 클라이언트 | axios | 1.x | 외부 API 호출 (서버 → 외부) |
| 프로세스 매니저 | supervisord | — | Nginx + Node 동시 실행 |

### 2-3. 외부 API

모든 외부 API 호출은 보안을 위해 **백엔드(Express)에서만 수행**한다. 프론트엔드는 `/api/*` 엔드포인트만 호출하며, API 키는 서버 환경변수에만 존재한다.

| API | 용도 | 인증 방식 | 백엔드 엔드포인트 |
|-----|------|-----------|------------------|
| OpenWeatherMap | 현재 날씨·5일 예보 | API Key (`WEATHER_API_KEY`) | `GET /api/weather`, `GET /api/weather/forecast` |
| ExchangeRate-API | 환율 | API Key (`EXCHANGE_API_KEY`) | `GET /api/exchange` |
| Naver 검색 API | 뉴스 검색 | Client-ID/Secret (`NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`) | `GET /api/naver-news` |
| Yahoo Finance | 주식 시세·종목 검색 | 불필요 (비공식 API) | `GET /api/stock-price/quote`, `GET /api/stock-price/search` |
| CoinGecko | 암호화폐 시세 | 선택적 API Key (`COINGECKO_API_KEY`) | `GET /api/crypto-price` |
| Google Calendar | 일정 조회 | OAuth 2.0 (브라우저 토큰) | 프론트에서 직접 호출 (토큰 필요) |

> **Yahoo Finance 사용 이유:** 기존에 사용하던 한국 공공데이터(KRX) API는 해외 서버(Render)에서 네트워크 레벨로 차단되어 접근 불가. Yahoo Finance 비공식 API는 API 키 없이 해외 서버에서 호출 가능하며 KOSPI(.KS), KOSDAQ(.KQ) 한국 주식을 지원한다.

> **Google Calendar 예외:** Google OAuth 2.0 인증 흐름은 브라우저에서 직접 Google과 통신해야 하는 구조이므로 프론트엔드에서 처리한다. `GOOGLE_CLIENT_ID`는 OAuth 규격상 공개값이므로 노출되어도 무방하며, 백엔드의 `/api/config` 엔드포인트를 통해 런타임에 전달받는다.

### 2-4. Web Storage / DBMS 사용 전략

#### Supabase (PostgreSQL) — 서버 사이드 영속 데이터

브라우저나 기기가 바뀌어도 유지되어야 하는 데이터를 저장한다. 서버 환경변수(`SUPABASE_URL`, `SUPABASE_SECRET_KEY`)로 연결하며, API 키는 백엔드에서만 사용하여 클라이언트에 노출되지 않는다.

| 테이블 | 저장 데이터 |
|--------|------------|
| `todos` | 할 일 항목 (text, done, created_at) |
| `memos` | 메모 내용 (content, created_at) |
| `bookmarks` | 즐겨찾기 (title, url, created_at) |
| `budget_expenses` | 지출 내역 (date, category, amount, memo) |
| `rss_feeds` | RSS 피드 URL 목록 (url, name) |
| `widget_settings` | 위젯별 설정값 (key, settings JSON) — 예: 날씨 위젯의 선택 도시 |
| `stocks` | 주식 관심종목 (code=Yahoo심볼, name, qty, avg_price, sort_order) |
| `cryptos` | 암호화폐 관심종목 (coin_id, name, symbol, qty, avg_price, sort_order) |

#### localStorage — 클라이언트 전용 UI 상태

브라우저를 닫아도 유지할 UI 설정을 저장하되, 서버까지 동기화할 필요가 없는 데이터에 한정한다.

**키 1: `dashboard-widget-config`**

- **저장 방식:** Zustand의 `persist` 미들웨어가 스토어 상태 변경 시 자동으로 직렬화(JSON)하여 저장
- **저장 시점:** 위젯 색상 변경, 위젯 순서 변경, 섹션 접힘 상태 변경 시마다 자동 갱신
- **저장 데이터:**

  | 필드 | 타입 | 설명 |
  |------|------|------|
  | `widgets` | Array | 각 위젯의 id, label, enabled(활성화 여부), 순서 |
  | `sectionOrder` | Array | 섹션 표시 순서 (예: `['finance', 'info', 'productivity']`) |
  | `collapsedSections` | Array | 현재 접혀 있는 섹션 id 목록 |
  | `widgetColors` | Object | 각 위젯의 선택된 색상 id (예: `{ stock: 'blue', weather: 'emerald' }`) |

**키 2: `gc_access_token`**

- **저장 방식:** `CalendarWidget.jsx`에서 Google OAuth 인증 성공 시 `localStorage.setItem('gc_access_token', token)` 직접 호출
- **저장 시점:** Google 로그인 팝업에서 사용자가 인증을 완료한 직후
- **저장 데이터:** Google OAuth 2.0 액세스 토큰 문자열 (Google Calendar API 호출 시 Authorization 헤더에 사용)

**키 3: `gc_token_expiry`**

- **저장 방식:** `CalendarWidget.jsx`에서 `localStorage.setItem('gc_token_expiry', expiry)` 직접 호출
- **저장 시점:** `gc_access_token`과 동시에 저장
- **저장 데이터:** 토큰 만료 시각(Unix timestamp, 밀리초). 페이지 로드 시 현재 시각과 비교하여 만료 여부 판단. 만료 시 자동으로 silent 재인증 시도

### 2-5. Reverse-Proxy (Nginx) 사용 계획

| 역할 | 설정 내용 |
|------|-----------|
| 정적 파일 서빙 | `/usr/share/nginx/html` → Vite 빌드 결과물 (HTML/CSS/JS) |
| SPA 폴백 | 알 수 없는 경로 → `index.html` (React Router 대응) |
| API 프록시 | `/api/*` → `http://127.0.0.1:4000` (Express 서버) |
| Gzip 압축 | JS, CSS, JSON 등 텍스트 파일 압축 전송 |
| 보안 헤더 | `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` |
| 정적 자산 캐시 | JS/CSS/이미지 → `Cache-Control: public, immutable, 1y` |

### 2-6. Docker 사용 계획

Render에 배포되는 Docker 이미지는 **프론트엔드, 백엔드, 웹 서버를 하나로 합친 단일 이미지**이다.

**이미지에 포함된 구성 요소**

| 구성 요소 | 역할 |
|-----------|------|
| 빌드된 React 정적 파일 | 브라우저에 전달되는 HTML/CSS/JS |
| Nginx | 80번 포트로 외부 요청을 받아 정적 파일 서빙 및 `/api/*` 요청 전달 |
| Express 서버 | Nginx로부터 전달된 API 요청을 처리하고 Supabase DB 및 외부 API와 통신 |

외부에서 보이는 포트는 **80번(Nginx) 하나뿐**이며, Express 서버는 내부 포트 4000번에서만 동작한다. Render가 주입하는 `PORT` 환경변수와의 충돌을 방지하기 위해 Express는 `API_PORT` 환경변수를 사용하며, 미설정 시 4000번을 기본값으로 사용한다.

- 필요한 런타임 환경변수: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `WEATHER_API_KEY`, `EXCHANGE_API_KEY`, `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`, `COINGECKO_API_KEY`, `GOOGLE_CLIENT_ID`

---

## 3. GitHub 계정 및 Repository

| 항목 | 내용 |
|------|------|
| Repository | https://github.com/CShoney01/web-dashboard |
| 공개 범위 | Public |
| 기본 브랜치 | `main` |

---

## 4. CI/CD 계획

GitHub Actions만을 사용하여 CI/CD를 구성한다. Render의 자동 배포 기능은 **비활성화(Auto-Deploy: No)**하여 GitHub Actions 외의 경로로는 배포가 일어나지 않도록 한다.

### 흐름

```
개발자 push (main 브랜치)
       ↓
GitHub Actions 워크플로우 실행
       ↓
[CI] 의존성 설치 → Lint → Build  ← 실패 시 배포 중단
       ↓ 성공
[CD] Render Deploy Hook URL 호출
       ↓
Render가 GitHub 코드를 받아 Docker 이미지 빌드 후 배포
```

### 단계별 설명

| 단계 | 명령 | 내용 |
|------|------|------|
| **Install** | `npm ci` | 프론트엔드 의존성 설치 (package-lock.json 기준 고정 버전) |
| **Lint** | `npm run lint` | ESLint로 소스 코드 규칙 위반 검사. 오류 발생 시 이후 단계 실행 안 됨 |
| **Build** | `npm run build` | Vite로 React 코드를 정적 파일로 번들링. 빌드 실패 시 이후 단계 실행 안 됨 |
| **Deploy** | `curl -X POST $RENDER_DEPLOY_HOOK_URL` | Render의 Deploy Hook URL로 HTTP 요청을 보내 배포 트리거 |

### GitHub Actions Workflow

```yaml
# .github/workflows/ci-cd.yml
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
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build

      - name: Deploy to Render
        run: curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK_URL }}
```

### 사전 준비 사항

- Render 서비스 생성 후 **Deploy Hook URL** 발급
- GitHub Repository → **Settings → Secrets → Actions**에 `RENDER_DEPLOY_HOOK_URL` 등록
- Render 대시보드에서 **Auto-Deploy → No** 설정
