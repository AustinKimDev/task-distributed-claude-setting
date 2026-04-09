# Phase 1: Analysis

소스별 디자인 요소를 추출하고 분석 보고서를 생성합니다.

## 작업 디렉토리 준비

```bash
mkdir -p .create-design-md/analyze
```

## URL 소스 분석

URL 소스가 있으면 Chrome DevTools MCP를 사용해 CSS를 추출합니다.

### Step 1: 페이지 목록 결정

우선순위:
1. 사용자가 URL 목록 직접 지정했으면 그대로 사용
2. 아니면 CI/브랜드 페이지 자동 탐지 — 아래 경로를 `navigate_page`로 시도:
   - `{base}/ci`, `{base}/brand`, `{base}/design`, `{base}/style-guide`, `{base}/about`
3. 없으면 메인 페이지의 nav 링크에서 주요 하위 페이지 (최대 5개)
4. 최소 메인 페이지는 항상 포함

### Step 2: 각 페이지에서 CSS 추출

각 페이지마다 아래 순서로 `evaluate_script`를 실행합니다.

**2-1. CSS 변수 수집:**
```javascript
(() => {
  const vars = {};
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule.type === 1 && rule.selectorText === ':root') {
          for (const prop of rule.style) {
            if (prop.startsWith('--')) vars[prop] = rule.style.getPropertyValue(prop).trim();
          }
        }
      }
    } catch(e) {} // cross-origin sheets
  }
  return JSON.stringify(vars);
})()
```

**2-2. 주요 요소 Computed Styles 수집:**
```javascript
(() => {
  const selectors = {
    headings: 'h1, h2, h3, h4, h5, h6',
    body: 'p, span, li',
    buttons: 'button, a.btn, [class*="button"], [class*="btn"]',
    links: 'a',
    cards: '[class*="card"], [class*="Card"]',
    inputs: 'input, textarea, select',
    nav: 'nav, [class*="nav"], header',
  };
  const props = ['color','background-color','font-family','font-size','font-weight',
    'line-height','letter-spacing','padding','margin','border-radius','box-shadow',
    'border','transition','animation','background-image','opacity'];
  const results = {};
  for (const [name, sel] of Object.entries(selectors)) {
    const els = document.querySelectorAll(sel);
    results[name] = [];
    els.forEach((el, i) => {
      if (i >= 5) return; // 카테고리당 최대 5개
      const cs = getComputedStyle(el);
      const styles = {};
      for (const p of props) styles[p] = cs.getPropertyValue(p);
      styles._tag = el.tagName;
      styles._class = el.className?.toString().slice(0, 100) || '';
      styles._text = el.textContent?.trim().slice(0, 50) || '';
      results[name].push(styles);
    });
  }
  return JSON.stringify(results);
})()
```

**2-3. 외부 스타일시트 URL 추출:**
```javascript
(() => {
  const urls = [];
  document.querySelectorAll('link[rel="stylesheet"]').forEach(l => urls.push(l.href));
  return JSON.stringify(urls);
})()
```

**2-4. 메타 정보:**
```javascript
(() => {
  return JSON.stringify({
    themeColor: document.querySelector('meta[name="theme-color"]')?.content,
    ogImage: document.querySelector('meta[property="og:image"]')?.content,
    title: document.title,
    favicon: document.querySelector('link[rel="icon"]')?.href,
  });
})()
```

### Step 3: 외부 스타일시트 파싱

추출된 스타일시트 URL에 대해 WebFetch로 원본 CSS를 가져오고, CSS 변수와 미디어 쿼리 브레이크포인트를 추출합니다.

### Step 4: 진행률 출력

각 페이지 분석 시:
```
[1/N] {url} — 분석 중...
[1/N] {url} — 완료 (색상 X개, 폰트 X개, 컴포넌트 X개)
```

## 코드베이스 소스 분석

코드베이스 소스가 있으면 analyze-codebase.ts를 실행합니다:

```bash
bun run ~/.claude/skills/create-design-md/scripts/analyze-codebase.ts {project-root}
```

출력 JSON을 기반으로 발견된 디자인 파일들을 Read로 읽고 분석합니다.

## 서비스명 소스 분석

서비스명 소스가 있으면 resolve-service.ts를 실행합니다:

```bash
bun run ~/.claude/skills/create-design-md/scripts/resolve-service.ts {service-name}
```

해석된 URL로 위의 URL 소스 분석 절차를 진행합니다.

## 기존 DESIGN.md 분석

프로젝트 루트에 DESIGN.md가 이미 존재하면:
1. Read로 내용을 읽습니다
2. 9-section 구조를 파싱합니다
3. 색상/폰트/spacing 등 토큰을 추출합니다
4. `.create-design-md/analyze/source-existing-design.md`에 저장합니다

## 분석 보고서 작성

각 소스별로 `.create-design-md/analyze/source-{name}.md`에 보고서를 작성합니다.

보고서 구조:
```
# Source: {name}

## Colors (N개 발견)
### Primary
- **{Name}** (`{hex}`): {role}
### Secondary & Accent
### Neutral Scale
### Surface & Background
### Gradients

## Typography (폰트 N개, 계층 N단계)
### Font Families
### Hierarchy Table
| Role | Font | Size | Weight | Line Height | Letter Spacing |

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
## Raw Data
```

## 요약 보고서 작성

모든 소스 분석이 끝나면 `.create-design-md/summary.md`에 전체 요약을 작성합니다:
- 각 소스의 핵심 특징
- 소스 간 공통점
- 소스 간 차이점/충돌점
- 카테고리별 소스 매핑 추천

## State 업데이트

```json
{ "phase1": "completed", "currentPhase": 2 }
```

`.create-design-md/state.json`을 업데이트합니다.
