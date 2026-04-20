# Workflow: Design Live Pick

Classification: **Standard**
Branch: `feat/[description]-design`

목표: 기능 목록만 주면 → 그룹핑/레이아웃 분석 → 라이브 웹 프리뷰에서 variant를 인터랙티브하게 골라 확정한다.

## Input
- 기능 목록 (자유 텍스트 / bullet)
- (선택) 대상 플랫폼 (web / iOS / macOS)
- (선택) 톤 키워드 (minimal, bold, playful…)

## Skill Hooks

| Step | Active Skills | Notes |
|---|---|---|
| STEP 1 | impeccable:shape | 기능 → IA/그룹핑/레이아웃 플래닝. discovery 인터뷰 필요하면 AskUserQuestion로 축약 |
| STEP 2 | design-consultation (optional) | 경쟁 레퍼런스/톤 매핑이 필요할 때만 |
| STEP 3 | design-shotgun | N개(3~5) variant HTML 생성 — 그룹별/섹션별 분리 |
| STEP 4 | gstack (browse) | 로컬 서버에 variant들 호스팅 → 스크린샷 + 비교 보드 |
| STEP 5 | AskUserQuestion 루프 | 섹션별 "A/B/C" 또는 tweak 질문. 선택마다 HTML 갱신 + 서버 리로드 |
| STEP 6 | design-html | 최종 선택 합쳐서 프로덕션 HTML/CSS 고정 |
| STEP 7 | /polish, /harden, /audit | 최종 품질 패스 |

## Execution Shape

```
[기능 목록]
  ↓ shape
[IA 트리 + 섹션별 레이아웃 후보]
  ↓ shotgun (섹션 단위)
[섹션 A: variant 1,2,3] [섹션 B: variant 1,2,3] ...
  ↓ gstack serve + screenshots
[비교 보드 URL]
  ↓ AskUserQuestion 루프 (섹션별)
[확정 조합 A1 + B2 + C1 ...]
  ↓ design-html
[단일 HTML/CSS 결과물]
```

## 라이브 프리뷰 규칙
- `gstack`으로 임의 포트에 정적 서버 기동
- variant별 URL: `/s1/v1`, `/s1/v2`, … (섹션/변형 구분)
- 최종 조합 URL: `/final`
- 각 선택 이후 `/final` 페이지를 덮어쓰고 리로드

## AskUserQuestion 패턴
- 섹션별로 thumbnail + 한 줄 설명
- "이 섹션은 어떤 게 좋나요? A/B/C/다시"
- tweak 질문: "카드 여백 좁게/넓게", "컬러 뉴트럴/강한 액센트"
- 5문항 넘어가면 묶어서 제시 (질문 피로 방지)

## Skipped Skills
- office-hours (제품 방향이 아니라 레이아웃 탐색)
- /cso, /benchmark (디자인 탐색 단계)
- TDD (결과물이 정적 HTML이면 불필요)

## Merge Report
- 기능 → 섹션 매핑
- 선택된 variant 목록 + 근거 (사용자 선택 요약)
- 최종 스크린샷

## Example
"로그인, 대시보드, 프로필 편집, 결제 내역, 알림 설정 — 이거 레이아웃 짜줘"
→ STEP 1: shape → "Auth(1) / Core(2,4) / Settings(3,5)" 3그룹, 사이드바+메인 레이아웃 제안
→ STEP 3: shotgun → 헤더 3종, 사이드바 2종, 카드 3종 생성
→ STEP 4: gstack → `http://localhost:4321/board`에 9개 variant 비교 보드
→ STEP 5: "헤더는 A/B/C? → B", "사이드바 고정/토글? → 토글", …
→ STEP 6: design-html → 확정본 1개 HTML
→ STEP 7: /polish
