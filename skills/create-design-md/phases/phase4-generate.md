# Phase 4: DESIGN.md Generation

분석 결과와 인터뷰/믹싱 선택을 종합해 최종 DESIGN.md를 생성합니다.

## 데이터 수집

1. `.create-design-md/analyze/*.md` — 모든 소스 분석 파일을 Read
2. `.create-design-md/interview.md` — 인터뷰 결과 Read
3. `.create-design-md/mixing/selections.json` — 믹싱 선택 Read (Phase 3 거친 경우)

## 소스 결정

**Phase 3을 거친 경우:**
selections.json의 카테고리별 source를 따름.

**Phase 3을 안 거친 경우 (소스 1개):**
단일 소스의 전체 데이터를 모든 섹션에 사용.

## DESIGN.md 생성

프로젝트 루트에 `DESIGN.md`를 Write합니다.
아래 9개 섹션을 순서대로 작성합니다.

### Section 1: Visual Theme & Atmosphere

**소스:** 전체 분석 종합 (mood 카테고리 우선)
**형식:** 산문 (prose) — 2~4 문단

포함:
- 전체 디자인의 무드/톤/철학을 생생한 형용사로 서술
- "왜 이런 모양인지" 맥락 설명
- Key Characteristics 불릿 리스트 (6~8항목)
  - 각 항목에 hex 코드 + 시맨틱 이름 포함

참고: awesome-design-md의 Claude/Stripe DESIGN.md를 톤 레퍼런스로 삼음.
산문 품질이 핵심 — LLM이 응용할 수 있도록 "왜"를 설명해야 함.

### Section 2: Color Palette & Roles

**소스:** colors 카테고리
**형식:** 카테고리별 컬러 리스트

카테고리: Primary, Secondary & Accent, Surface & Background, Neutrals & Text, Semantic & Accent, Gradient System

각 색상:
```
- **{Semantic Name}** (`{hex}`): {역할 설명 — 어디에, 왜 사용하는지}
```

### Section 3: Typography Rules

**소스:** typography 카테고리
**형식:** Font Family + Hierarchy Table

Font Family:
- Headline: `{font}`, fallback: `{fallback}`
- Body/UI: `{font}`, fallback: `{fallback}`
- Code: `{font}`, fallback: `{fallback}`

Hierarchy Table:
| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |

Principles (3~5개):
- 타이포그래피 사용의 핵심 원칙 설명

### Section 4: Component Stylings

**소스:** components 카테고리
**형식:** 컴포넌트별 상세 스타일

각 컴포넌트 (Buttons, Cards, Inputs, Navigation, + interview에서 선택된 추가 컴포넌트):
- Background, Text, Padding, Radius, Shadow, Hover 등 구체적 CSS 값
- transition/animation 포함

### Section 5: Layout Principles

**소스:** layout 카테고리
**형식:** Spacing System + Grid + Whitespace Philosophy

- Base unit
- Spacing scale
- Grid & Container (max-width, column 수)
- Whitespace Philosophy (산문)
- Border Radius Scale

### Section 6: Depth & Elevation

**소스:** elevation 카테고리
**형식:** Level 테이블 + Shadow Philosophy

| Level | Treatment | Use |

Shadow Philosophy (산문):
- 그림자 시스템의 철학과 특징 설명

### Section 7: Do's and Don'ts

**소스:** 전체 분석
**형식:** Do 리스트 + Don't 리스트

분석에서 발견된 패턴과 안티패턴을 정리.
각 항목에 구체적 값 포함 (hex, px 등).

### Section 8: Responsive Behavior

**소스:** responsive 카테고리 + interview 결과
**형식:** Breakpoints Table + Touch Targets + Collapsing Strategy

| Name | Width | Key Changes |

### Section 9: Agent Prompt Guide

**소스:** 위 전체
**형식:** Quick Color Reference + Example Component Prompts + Iteration Guide

Quick Color Reference: 주요 색상 8~10개를 한 줄씩
Example Component Prompts: 5개+ 즉시 복붙 가능한 프롬프트
Iteration Guide: 7~10개 팁

## preview.html 생성

DESIGN.md 생성 후 generate-preview.ts를 실행합니다:

```bash
bun run ~/.claude/skills/create-design-md/scripts/generate-preview.ts {project-root}/DESIGN.md
```

interview.md에서 darkMode가 true면 `--dark` 플래그를 추가합니다:

```bash
bun run ~/.claude/skills/create-design-md/scripts/generate-preview.ts {project-root}/DESIGN.md --dark
```

## .gitignore 업데이트

프로젝트 `.gitignore`에 `.create-design-md/`가 없으면 추가합니다.

## State 업데이트

```json
{ "phase4": "completed", "currentPhase": null }
```

## 완료 메시지

```
DESIGN.md 생성 완료!

산출물:
- DESIGN.md (9개 섹션, 색상 {N}개, 타이포 {N}단계, 컴포넌트 {N}개)
- preview.html
- preview-dark.html (다크모드 선택 시)

preview.html을 브라우저에서 열어 결과를 확인해주세요.
수정이 필요하면:
- `create-design-md update {카테고리}` — 특정 섹션 수정
- `create-design-md update {카테고리} from {소스}` — 새 소스로 교체
- `create-design-md regenerate` — 전체 재생성
```
