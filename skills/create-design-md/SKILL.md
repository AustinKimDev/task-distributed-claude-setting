---
name: create-design-md
description: "Use when user wants to create, update, or regenerate a DESIGN.md file from websites, codebases, or service names. Triggers: \"create-design-md\", \"DESIGN.md 만들어\", \"디자인 시스템 추출\", \"design-md 생성\", \"/create-design-md\"."
---

# create-design-md

웹사이트 URL, 코드베이스, 서비스명에서 디자인 요소를 추출해 9-section DESIGN.md를 자동 생성합니다.

## 입력 파싱

사용자 입력을 아래 규칙으로 파싱합니다:

| 토큰 | 해석 |
|------|------|
| `https://...` 또는 `http://...` | URL 소스 |
| `from codebase` | 현재 프로젝트 코드베이스 소스 |
| `update {카테고리}` | 기존 DESIGN.md 특정 섹션 재생성 |
| `update {카테고리} from {소스}` | 특정 섹션을 새 소스로 교체 |
| `regenerate` | 기존 중간 산출물로 Phase 4만 재실행 |
| `--quick` | Phase 2 인터뷰 스킵 |
| `{attr} from {source}` | 속성 믹싱 지시 (font, color, shadow, layout 등) |
| 기타 단어 | 서비스명 → resolve-service.ts로 URL 해석 |
| (인자 없음) | `from codebase`로 자동 진행 |

속성 카테고리 매칭은 AI가 자연어 의미로 판단합니다:
- colors/palette/색상 → Section 2
- font/typography/글꼴 → Section 3
- component/button/컴포넌트 → Section 4
- layout/spacing/레이아웃 → Section 5
- shadow/elevation/그림자 → Section 6
- responsive/breakpoint/반응형 → Section 8
- mood/theme/분위기 → Section 1

## 기존 DESIGN.md 감지

프로젝트 루트에 `DESIGN.md`가 이미 존재하면:
- 자동으로 소스에 추가합니다
- 소스 수가 2개 이상이 되므로 Phase 3 믹싱을 진행합니다

## 중단/재개

`.create-design-md/state.json`이 존재하면:
```
"Phase {N}에서 중단됐습니다. 이어서 할까요? (Y/N)"
```
- Y → 해당 Phase부터 재개
- N → state.json 삭제 후 처음부터

## Phase 라우팅

```
update/regenerate 명령 → 부분 재생성 (아래 참조)
--quick 플래그 → Phase 1 → Phase 4 (Phase 2, 3 스킵)
기존 DESIGN.md 없음 + 소스 1개 → Phase 1 → Phase 2 → Phase 4
기존 DESIGN.md 없음 + 소스 2개+ → Phase 1 → Phase 2 → Phase 3 → Phase 4
기존 DESIGN.md 있음 + 소스 1개+ → Phase 1 → Phase 2 → Phase 3 → Phase 4
```

각 Phase는 별도 프롬프트 파일에 정의되어 있습니다:
- Phase 1: `phases/phase1-analyze.md`를 Read하고 따릅니다
- Phase 2: `phases/phase2-interview.md`를 Read하고 따릅니다
- Phase 3: `phases/phase3-mixing.md`를 Read하고 따릅니다
- Phase 4: `phases/phase4-generate.md`를 Read하고 따릅니다

## Update 모드

### update {카테고리} from {소스}

1. state.json 확인 → 기존 중간 산출물 존재 확인
2. 새 소스 분석 (Phase 1 절차)
3. selections.json에서 해당 카테고리만 교체
4. Phase 4 재실행

### update {카테고리}

1. 기존 소스에서 해당 카테고리 데이터 재확인
2. 해당 카테고리에 대해 인터뷰 1회
3. Phase 4 재실행

### regenerate

1. 기존 analyze/, interview.md, selections.json 그대로 사용
2. Phase 4만 재실행

## 서비스명 해석

서비스명이 입력되면 resolve-service.ts를 실행합니다:
```bash
bun run ~/.claude/skills/create-design-md/scripts/resolve-service.ts {service-name}
```

실패 시: "'{name}'에 해당하는 사이트를 찾지 못했습니다. URL을 직접 입력해주세요."

## 에러 처리

| 상황 | 처리 |
|------|------|
| URL 접근 불가 | 경고 + 해당 소스 스킵 |
| Chrome DevTools MCP 미연결 | WebFetch fallback (raw HTML만 분석, 제한 안내) |
| 코드베이스에 디자인 파일 없음 | 경고 + 빈 분석 결과로 진행 |
| 서비스명 해석 실패 | URL 직접 입력 요청 |
| Phase 중단 | state.json에 저장 |
