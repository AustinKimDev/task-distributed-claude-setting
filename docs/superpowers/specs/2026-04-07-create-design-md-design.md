# create-design-md Skill Design Spec

## Overview

웹사이트 URL, 코드베이스, 서비스명을 입력으로 받아 9-section DESIGN.md를 자동 생성하는 Claude Code 스킬.
복수 소스 입력 시 웹 플레이그라운드에서 시각적으로 믹싱 후 최종 산출물 생성.

## Input Specification

### 입력 형식

```bash
# 기본 (인자 없음 → 코드베이스 기반)
create-design-md

# 단일 소스
create-design-md https://telepix.kr/ci
create-design-md from codebase
create-design-md stripe

# 복합 소스
create-design-md https://telepix.kr/ci, from codebase
create-design-md https://telepix.kr/ci, from codebase, stripe, vercel

# 속성 믹싱
create-design-md https://telepix.kr/ci, font from stripe, shadow from vercel

# 부분 수정
create-design-md update colors from vercel
create-design-md update typography
create-design-md regenerate

# 빠른 모드
create-design-md https://telepix.kr --quick
```

### 파싱 규칙

| 토큰 | 해석 |
|------|------|
| `https://...` 또는 `http://...` | URL 소스 |
| `from codebase` | 현재 프로젝트 코드베이스 소스 |
| `{name}` (URL도 키워드도 아닌 것) | 서비스명 → `resolve-service.ts`로 URL 해석 |
| `{attribute} from {source}` | 속성 믹싱 지시 — AI가 문맥에서 매칭 판단 |
| `update {attribute}` | 기존 DESIGN.md의 특정 섹션만 재생성 |
| `update {attribute} from {source}` | 특정 섹션을 새 소스로 교체 |
| `regenerate` | 기존 중간 산출물로 Phase 4만 재실행 |
| `--quick` | Phase 2 인터뷰 스킵, 감지된 값 그대로 사용 |
| (인자 없음) | `from codebase`로 자동 진행 |

### 속성 카테고리

AI가 자연어 입력을 아래 카테고리에 매칭. 정확한 키워드 일치가 아닌 의미 기반 판단.

| 카테고리 | DESIGN.md 섹션 | 포함 범위 |
|----------|---------------|-----------|
| colors | Section 2 | 팔레트, 시맨틱 역할, 그라디언트 |
| typography | Section 3 | 폰트 패밀리, 계층, weight, spacing |
| components | Section 4 | 버튼, 카드, 인풋, 네비 등 + 모션 |
| layout | Section 5 | 스페이싱, 그리드, 컨테이너 |
| elevation | Section 6 | 그림자 시스템, 깊이 레벨 |
| responsive | Section 8 | 브레이크포인트, 축소 전략 |
| mood | Section 1 | 시각적 분위기, 톤 |

---

## Phase Routing

```
인자 없음 → from codebase
--quick 플래그 → Phase 1 → Phase 4 (Phase 2, 3 스킵)
update/regenerate → 부분 재생성 (별도 섹션 참조)

기존 DESIGN.md 없음 + 소스 1개 → Phase 1 → Phase 2 → Phase 4
기존 DESIGN.md 없음 + 소스 2개+ → Phase 1 → Phase 2 → Phase 3 → Phase 4
기존 DESIGN.md 있음 + 소스 1개+ → Phase 1 → Phase 2 → Phase 3 → Phase 4
```

---

## State Management

각 Phase 완료 시 `.create-design-md/state.json`에 상태 저장. 중단 후 재개 가능.

```json
{
  "currentPhase": 3,
  "phase1": "completed",
  "phase2": "completed",
  "phase3": "in_progress",
  "phase4": "pending",
  "sources": ["telepix-kr", "stripe"],
  "flags": { "quick": false },
  "startedAt": "2026-04-07T10:00:00Z",
  "updatedAt": "2026-04-07T10:15:00Z"
}
```

재실행 시 → `state.json` 확인 → "Phase 3에서 중단됐습니다. 이어서 할까요?"

---

## Phase 1: Analysis

### 입력별 분석 파이프라인

#### URL 소스 (`analyze-url.ts`)

**페이지 목록 결정 (우선순위)**:
1. 사용자가 URL 목록 직접 지정 → 그대로 사용
2. CI/브랜드 페이지 자동 탐지 (`/ci`, `/brand`, `/design`, `/style-guide`, `/about`)
3. 메인 + nav 링크에서 주요 하위 페이지 (최대 5개)
4. 최소 메인 페이지는 항상 포함

**CSS 추출 방법 (Chrome DevTools MCP)**:
1. `navigate_page(url)` → 페이지 로드
2. `evaluate_script` → `document.styleSheets` 파싱
3. `evaluate_script` → CSS 변수 (`--*`) 전체 수집
4. `evaluate_script` → 주요 요소들의 `getComputedStyle` 수집
   - 헤딩 (h1-h6), 바디, 버튼, 링크, 카드, 인풋, 네비게이션
   - 색상, font-family, font-size, font-weight, line-height, letter-spacing
   - padding, margin, border-radius, box-shadow
   - transition, animation
   - background (그라디언트 포함)
5. 외부 스타일시트 URL 추출 → WebFetch로 원본 CSS 가져오기
6. 메타 정보 수집 (theme-color, favicon, OG 이미지)

**진행률 출력**:
```
[1/5] telepix.kr/ci — 분석 중...
[1/5] telepix.kr/ci — 완료 (색상 24개, 폰트 3개, 컴포넌트 12개)
[2/5] telepix.kr — 분석 중...
```

#### 코드베이스 소스 (`analyze-codebase.ts`)

1. **스택 자동 감지**: package.json, Podfile, build.gradle, requirements.txt, Cargo.toml 등
2. **디자인 파일 탐색**:
   - CSS/SCSS/Less 변수 파일
   - Tailwind config (`tailwind.config.*`)
   - 디자인 토큰 파일 (JSON/YAML)
   - 테마 파일 (theme.ts, colors.swift 등)
3. **컴포넌트 분석**: React/SwiftUI/Compose 등 컴포넌트에서 인라인 스타일 패턴
4. **기존 디자인 문서**: DESIGN.md, style-guide.*, design-system.* 등

#### 서비스명 소스 (`resolve-service.ts`)

1. `{name}.com`, `{name}.io`, `{name}.dev`, `{name}.app` 후보 생성
2. WebFetch로 존재 여부 + 리다이렉트 확인
3. 확인된 URL로 `analyze-url.ts` 파이프라인 진행

#### 기존 DESIGN.md 소스

1. 9-section 구조 파싱
2. 색상/폰트/spacing 등 토큰 추출
3. Do's and Don'ts 보존

### 추출 항목

| 카테고리 | 추출 항목 |
|----------|-----------|
| 색상 | 팔레트, 시맨틱 역할, 그라디언트, opacity 패턴 |
| 타이포그래피 | 폰트 패밀리, weight, size, line-height, letter-spacing, OpenType features |
| 컴포넌트 | 버튼, 카드, 인풋, 배지, 네비게이션, 모달 등 스타일 |
| 레이아웃 | 스페이싱 스케일, 그리드, max-width, padding 패턴 |
| 깊이 | box-shadow 값, border 패턴, elevation 레벨 |
| 반응형 | 미디어 쿼리 브레이크포인트, 뷰포트 메타 |
| 모션 | transition, animation, hover/focus 효과 |
| 아이콘 | 크기, 스트로크 두께, 스타일(filled/outlined) |
| 이미지 | border-radius, aspect-ratio, object-fit 패턴 |

### 산출물

```
.create-design-md/
├── state.json
├── analyze/
│   ├── source-telepix-kr.md
│   ├── source-codebase.md
│   ├── source-existing-design.md
│   └── source-stripe.md
└── summary.md
```

각 소스 분석 파일 구조:
```markdown
# Source: telepix.kr

## Colors (N개 발견)
### Primary
### Secondary & Accent
### Neutral Scale
### Surface & Background
### Gradients

## Typography (폰트 N개, 계층 N단계)
### Font Families
### Hierarchy Table

## Components
### Buttons
### Cards
### Inputs
### Navigation

## Layout & Spacing
## Shadows & Elevation
## Responsive (브레이크포인트)
## Motion & Animation
## Icons & Images
## Raw Data (추출 원본)
```

---

## Phase 2: Goal Setting (Dynamic Interview)

### 동작 방식

Phase 1 `summary.md`를 읽고 동적 질문 생성.
기본 질문 4개는 **항상** 진행 (감지 여부 무관). 감지된 값을 기본값으로 제시 + 최소 3개 대안.
추가 질문은 분석 결과에 따라 동적 생성.

### 기본 질문 (필수 4개)

**Q1: 반응형**
```
반응형 브레이크포인트를 선택해주세요:
 A) 감지된 값 그대로 [480, 768, 1024, 1280]px
 B) Tailwind 기본 [640, 768, 1024, 1280, 1536]px
 C) Bootstrap 기본 [576, 768, 992, 1200, 1400]px
 D) 모바일 퍼스트 심플 [768, 1024]px
 E) 직접 입력
```

**Q2: 다크모드**
```
다크모드 전략을 선택해주세요:
 A) 시스템 설정 연동 (prefers-color-scheme)
 B) 사용자 토글 (localStorage 저장)
 C) 시스템 연동 + 수동 오버라이드
 D) 다크모드 미지원
 E) 기타
```

**Q3: 타겟 플랫폼**
```
타겟 플랫폼을 선택해주세요:
 A) 웹 전용
 B) 웹 + iOS (SwiftUI)
 C) 웹 + Android (Compose)
 D) 웹 + iOS + Android
 E) 기타
```

**Q4: 주요 컴포넌트**
```
DESIGN.md에 포함할 컴포넌트를 선택해주세요 (복수 선택):
 A) 기본 세트 (버튼, 카드, 인풋, 네비게이션) — 감지 기반
 B) A + 데이터 (테이블, 차트, 배지)
 C) A + 오버레이 (모달, 토스트, 드롭다운)
 D) A + B + C 전체
 E) 직접 입력
```

### 동적 질문

Claude가 `summary.md`를 읽고 불확실한 항목에 대해 추가 질문 생성.
각 질문은 최소 3개 선택지 + 직접 입력 옵션.

### --quick 모드

Phase 2 전체 스킵. 감지된 값 그대로 사용:
- 반응형: 감지된 브레이크포인트 또는 Tailwind 기본
- 다크모드: 감지 시 시스템 연동, 미감지 시 미지원
- 플랫폼: 웹 전용
- 컴포넌트: 감지된 것 전부

### 산출물

```yaml
# .create-design-md/interview.md
responsive: true
breakpoints: [480, 768, 1024, 1280]
darkMode: true
darkModeStrategy: system-toggle
platform: web
components: [button, card, input, navigation, table, modal]
additionalNotes: "..."
```

---

## Phase 3: Mixing Playground

### 진입 조건

소스 2개 이상일 때만 실행 (기존 DESIGN.md 자동 감지 포함).

### 플레이그라운드 아키텍처

```
scripts/playground/
├── server.ts          # Bun HTTP 서버 (파일 감시 + SSE push)
├── watcher.ts         # .create-design-md/playground/ 감시
├── events.ts          # 사용자 선택 이벤트 수집 → events.jsonl
├── templates/
│   ├── frame.html     # 기본 프레임 (헤더, 테마, SSE 클라이언트)
│   └── helpers.js     # 클라이언트 선택/토글/이벤트 전송
└── public/
    └── styles.css     # 플레이그라운드 자체 스타일
```

### 서버 동작

1. `start.sh` → Bun 서버 기동 (포트 자동 할당, 포트 번호 출력)
2. `.create-design-md/playground/` 디렉토리 감시
3. Claude가 HTML 파일을 Write → 서버가 감지 → SSE로 브라우저 자동 갱신
4. 사용자 클릭 → `events.jsonl`에 기록
5. Claude가 다음 턴에 `events.jsonl` 읽고 반영
6. `stop.sh` → 서버 종료

### 믹싱 UI 흐름

**Step 1: 카테고리별 탭 선택**

DESIGN.md 섹션을 탭으로 표시. 각 탭에서 소스별 옵션 + 컴포넌트 미리보기:

```
[Colors] [Typography] [Components] [Layout] [Shadows] [Responsive] ...

┌─────────────────────────────────────────────┐
│  Typography 소스 선택                         │
│                                              │
│  ○ A: Telepix (Pretendard, 극적 대비)        │
│     ┌──────────────────────────┐             │
│     │ Heading 미리보기          │             │
│     │ Body 미리보기             │             │
│     │ [모바일] [태블릿] [데스크탑] │            │
│     └──────────────────────────┘             │
│                                              │
│  ○ B: Stripe (sohne-var 300, 타이트 자간)    │
│     ┌──────────────────────────┐             │
│     │ Heading 미리보기          │             │
│     │ Body 미리보기             │             │
│     └──────────────────────────┘             │
└─────────────────────────────────────────────┘
```

**Step 2: 통합 컴포넌트 미리보기**

선택 조합으로 대표 컴포넌트 실시간 렌더링:
- 버튼 (primary, secondary, ghost)
- 카드
- 인풋/폼
- 네비게이션 바
- 반응형 뷰 (모바일/태블릿/데스크탑 토글)

**Step 3: 코드베이스 프리뷰** (from codebase인 경우)

기존 코드베이스의 실제 컴포넌트에 선택한 스타일을 입혀서 근사치 미리보기.

**커스텀 폰트 처리**:
- Google Fonts에 있는 폰트 → 직접 로드
- 라이선스 제한 폰트 → fallback 폰트로 근사치 렌더링 + 실제 폰트명 표기
- 코드베이스 로컬 폰트 → 로컬 경로에서 로드 시도

**Step 4: 선택 완료**

사용자가 브라우저에서 "선택 완료" 클릭 → 최종 선택 저장.

### 속성 믹싱 프리셋

`font from stripe, shadow from vercel` 입력 시:
- Phase 3 진입 시 해당 탭이 자동으로 프리셋 선택된 상태
- 사용자는 확인만 하거나 수정 가능

### 산출물

```json
// .create-design-md/mixing/selections.json
{
  "colors": { "source": "telepix-kr", "overrides": {} },
  "typography": { "source": "stripe", "overrides": { "bodyFont": "Pretendard" } },
  "components": { "source": "telepix-kr" },
  "elevation": { "source": "vercel" },
  "layout": { "source": "codebase" },
  "responsive": { "source": "telepix-kr" },
  "mood": { "source": "telepix-kr" }
}
```

---

## Phase 4: Generation

### 입력

- `analyze/*.md` — 소스별 분석 결과
- `interview.md` — 인터뷰 결과
- `mixing/selections.json` — 믹싱 선택 결과 (Phase 3 거친 경우)

### 생성 프로세스

**Step 1: 병합** (`generate-design-md.ts`)

selections.json 기반으로 각 섹션에 사용할 소스 데이터 결정:
```
selections.colors: "telepix-kr" → analyze/source-telepix-kr.md의 Colors 섹션
selections.typography: "stripe" → analyze/source-stripe.md의 Typography 섹션
Phase 3 안 거침 → 단일 소스의 전체 데이터
```

**Step 2: DESIGN.md 생성**

Claude가 병합 데이터 + interview.md 기반으로 9-section DESIGN.md 작성:

| 섹션 | 데이터 소스 | 생성 방식 |
|------|------------|-----------|
| 1. Visual Theme & Atmosphere | 전체 분석 종합 | 산문 생성 (무드, 철학, 키 특성) |
| 2. Color Palette & Roles | colors 선택 소스 | 시맨틱 이름 + hex + 역할 3종 세트 |
| 3. Typography Rules | typography 선택 소스 | 폰트 패밀리 + 계층 테이블 |
| 4. Component Stylings | components 선택 소스 | 구체적 CSS 값 + 모션 |
| 5. Layout Principles | layout 선택 소스 | 스페이싱 스케일 + 그리드 + 화이트스페이스 철학 |
| 6. Depth & Elevation | elevation 선택 소스 | 레벨별 shadow 테이블 + 철학 |
| 7. Do's and Don'ts | 전체 분석 | 패턴/안티패턴 추출 |
| 8. Responsive Behavior | responsive 선택 소스 + interview | 브레이크포인트 + 축소 전략 |
| 9. Agent Prompt Guide | 위 전체 | Quick Reference + 예시 프롬프트 5개+ |

**Step 3: preview.html 생성** (`generate-preview.ts`)

DESIGN.md를 파싱해서 컴포넌트 카탈로그 HTML 생성:
- 색상 팔레트 스워치
- 타이포그래피 계층 샘플
- 버튼/카드/인풋/배지 등 컴포넌트 실물
- 다크모드 선택 시 `preview-dark.html`도 생성

### 최종 산출물

```
[project root]/
├── DESIGN.md
├── preview.html
├── preview-dark.html       # (다크모드 선택 시)
└── .create-design-md/      # 중간 산출물 (.gitignore 추가)
    ├── state.json
    ├── analyze/
    ├── summary.md
    ├── interview.md
    └── mixing/
```

---

## Update & Regenerate Mode

### 부분 수정

```bash
create-design-md update colors from vercel
```

1. `state.json` 확인 → 기존 중간 산출물 존재 확인
2. 새 소스(vercel) 분석 → `analyze/source-vercel.md` 생성
3. `selections.json`에서 해당 카테고리만 교체
4. Phase 4 재실행 → DESIGN.md의 해당 섹션만 재생성

```bash
create-design-md update typography
```

1. 기존 소스 목록에서 typography 관련 데이터 재확인
2. 해당 섹션에 대해 인터뷰 1회
3. Phase 4 재실행

### 전체 재생성

```bash
create-design-md regenerate
```

1. 기존 `analyze/`, `interview.md`, `mixing/selections.json` 그대로 사용
2. Phase 4만 재실행

---

## Skill File Structure

```
~/.claude/skills/create-design-md/
├── SKILL.md                        # 오케스트레이터 (Phase 라우팅, 입력 파싱)
├── phases/
│   ├── phase1-analyze.md           # Phase 1 프롬프트
│   ├── phase2-interview.md         # Phase 2 동적 인터뷰 프롬프트
│   ├── phase3-mixing.md            # Phase 3 플레이그라운드 프롬프트
│   └── phase4-generate.md          # Phase 4 DESIGN.md 생성 프롬프트
├── scripts/
│   ├── analyze-url.ts              # URL → CSS/디자인 추출
│   ├── analyze-codebase.ts         # 코드베이스 → 디자인 추출
│   ├── resolve-service.ts          # 서비스명 → URL 해석
│   ├── generate-design-md.ts       # 중간 산출물 → 병합 데이터
│   ├── generate-preview.ts         # DESIGN.md → preview.html 생성
│   ├── playground/
│   │   ├── server.ts               # Bun HTTP 서버 (SSE + 파일 감시)
│   │   ├── watcher.ts              # 파일 감시
│   │   ├── events.ts               # 이벤트 수집
│   │   ├── templates/
│   │   │   ├── frame.html          # 기본 프레임
│   │   │   └── helpers.js          # 클라이언트 스크립트
│   │   └── public/
│   │       └── styles.css          # 플레이그라운드 스타일
│   ├── start.sh                    # 플레이그라운드 서버 시작
│   └── stop.sh                     # 플레이그라운드 서버 종료
├── package.json
└── bunfig.toml
```

---

## Dependencies

- **Runtime**: Bun
- **CSS 추출**: Chrome DevTools MCP (navigate_page, evaluate_script)
- **웹 콘텐츠 fetch**: WebFetch (외부 스타일시트, 서비스 URL 해석)
- **파일 감시**: Bun.file watcher (서버 내장)
- **SSE**: Bun HTTP 서버 네이티브

---

## Error Handling

| 상황 | 처리 |
|------|------|
| URL 접근 불가 | 경고 출력 + 해당 소스 스킵 + 나머지 진행 |
| 서비스명 해석 실패 | "'{name}'에 해당하는 사이트를 찾지 못했습니다. URL을 직접 입력해주세요" |
| Chrome DevTools MCP 미연결 | WebFetch fallback (raw HTML만 분석, 제한 안내) |
| 코드베이스에 디자인 파일 없음 | 경고 출력 + 빈 분석 결과로 진행 |
| Phase 중단 | state.json에 저장 → 재실행 시 이어서 |
| 플레이그라운드 서버 포트 충돌 | 자동 포트 재할당 |
