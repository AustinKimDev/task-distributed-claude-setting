# Phase 3: Mixing Playground

소스가 2개 이상일 때 웹 플레이그라운드에서 카테고리별 디자인 요소를 선택합니다.

## 서버 시작

```bash
bash ~/.claude/skills/create-design-md/scripts/start.sh {project-root}
```

출력에서 `url`, `contentDir`, `stateDir`를 저장합니다.
사용자에게 URL을 안내합니다: "브라우저에서 {url}을 열어주세요."

## 믹싱 흐름

### Step 1: 카테고리별 소스 선택 페이지 생성

각 카테고리(colors, typography, components, layout, elevation, responsive, mood)에 대해
소스별 옵션을 보여주는 HTML을 Write로 `{contentDir}/`에 생성합니다.

파일명 규칙: `01-colors.html`, `02-typography.html` 등

HTML 구조:
```html
<h2>Colors 소스 선택</h2>
<p class="subtitle">각 소스의 컬러 팔레트를 비교하고 선택해주세요</p>

<div class="options" data-category="colors">
  <div class="option" data-choice="source-a" onclick="toggleSelect(this)">
    <div class="letter">A</div>
    <div class="content">
      <h3>{Source A Name}</h3>
      <p>{색상 개수}개 색상 — {핵심 특징 요약}</p>
      <div class="preview-box">
        <!-- 실제 색상 스워치를 렌더링 -->
        <div style="display:flex;gap:4px;flex-wrap:wrap;">
          <div style="width:32px;height:32px;border-radius:6px;background:{hex1}"></div>
          <div style="width:32px;height:32px;border-radius:6px;background:{hex2}"></div>
          <!-- ... -->
        </div>
      </div>
    </div>
  </div>

  <div class="option" data-choice="source-b" onclick="toggleSelect(this)">
    <div class="letter">B</div>
    <div class="content">
      <h3>{Source B Name}</h3>
      <p>{색상 개수}개 색상 — {핵심 특징 요약}</p>
      <div class="preview-box">
        <!-- 색상 스워치 -->
      </div>
    </div>
  </div>
</div>
```

### Step 2: 사용자에게 안내

각 카테고리 HTML을 Write한 후:
```
"브라우저에서 {카테고리} 소스를 확인하고 선택해주세요. ({url})"
```

### Step 3: 선택 결과 읽기

사용자가 응답하면 `{stateDir}/events.jsonl`을 Read로 읽어 선택 결과를 확인합니다.

```bash
cat {stateDir}/events.jsonl
```

### Step 4: 통합 미리보기 생성

모든 카테고리 선택 후, 선택된 조합으로 대표 컴포넌트를 렌더링하는 HTML을 생성합니다.

파일명: `integrated-preview.html`

포함 컴포넌트:
- 버튼 (primary, secondary, ghost)
- 카드 (텍스트 + 이미지)
- 인풋 + 라벨
- 네비게이션 바

선택된 소스의 실제 hex, font-family, border-radius, shadow 값을 CSS 변수로 주입합니다.

**커스텀 폰트 처리:**
- Google Fonts에 있는 폰트 → `<link>` 태그로 로드
- 없는 폰트 → fallback 사용 + `/* Actual: {font-name} */` 주석
- 코드베이스 로컬 폰트 → `@font-face`로 로컬 경로 시도

### Step 5: 반응형 미리보기

반응형이 선택됐으면, 모바일/태블릿/데스크탑 토글 버튼을 미리보기에 추가합니다:

```html
<div class="responsive-toggle">
  <button onclick="setViewport(393)" class="active">Mobile</button>
  <button onclick="setViewport(768)">Tablet</button>
  <button onclick="setViewport(1200)">Desktop</button>
</div>
<iframe id="preview-frame" style="width:393px;..." srcdoc="..."></iframe>
```

### Step 6: 선택 완료

사용자가 "선택 완료" 버튼을 클릭하거나 터미널에서 완료를 알리면:

1. `events.jsonl`에서 `type: "complete"` 이벤트를 확인
2. 최종 선택을 `.create-design-md/mixing/selections.json`에 저장:

```json
{
  "colors": { "source": "{source-id}", "overrides": {} },
  "typography": { "source": "{source-id}", "overrides": {} },
  "components": { "source": "{source-id}" },
  "elevation": { "source": "{source-id}" },
  "layout": { "source": "{source-id}" },
  "responsive": { "source": "{source-id}" },
  "mood": { "source": "{source-id}" }
}
```

### 속성 믹싱 프리셋

입력에 `font from stripe` 등 속성 믹싱 지시가 있었으면:
- 해당 카테고리의 기본 선택을 프리셋합니다
- HTML에서 해당 옵션을 `.selected` 클래스로 표시합니다
- 사용자는 확인만 하거나 변경할 수 있습니다

## 서버 종료

```bash
bash ~/.claude/skills/create-design-md/scripts/stop.sh {stateDir}
```

## State 업데이트

```json
{ "phase3": "completed", "currentPhase": 4 }
```
