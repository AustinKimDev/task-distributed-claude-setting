# Phase 2: Goal Setting (Dynamic Interview)

Phase 1 분석 결과를 기반으로 사용자에게 디자인 목표를 확인합니다.

## 사전 준비

1. `.create-design-md/summary.md`를 Read로 읽습니다
2. 각 소스 분석 파일도 필요하면 참조합니다

## 기본 질문 (필수 4개 — 항상 진행)

감지 여부와 무관하게 항상 질문합니다.
감지된 값이 있으면 기본값으로 제시 + 최소 3개 대안을 보여줍니다.
한 질문씩 순서대로 진행합니다.

### Q1: 반응형

감지된 브레이크포인트가 있으면:
```
반응형 브레이크포인트를 선택해주세요:
 A) 감지된 값 그대로 [{detected}]px
 B) Tailwind 기본 [640, 768, 1024, 1280, 1536]px
 C) Bootstrap 기본 [576, 768, 992, 1200, 1400]px
 D) 모바일 퍼스트 심플 [768, 1024]px
 E) 직접 입력
```

감지 안 된 경우:
```
반응형을 지원할까요? 지원한다면 브레이크포인트는:
 A) Tailwind 기본 [640, 768, 1024, 1280, 1536]px
 B) Bootstrap 기본 [576, 768, 992, 1200, 1400]px
 C) 모바일 퍼스트 심플 [768, 1024]px
 D) 반응형 미지원
 E) 직접 입력
```

### Q2: 다크모드

```
다크모드 전략을 선택해주세요:
 A) 시스템 설정 연동 (prefers-color-scheme)
 B) 사용자 토글 (localStorage 저장)
 C) 시스템 연동 + 수동 오버라이드
 D) 다크모드 미지원
 E) 기타
```

다크모드 CSS가 감지됐으면 감지 사실을 언급하고 A를 기본 추천합니다.

### Q3: 타겟 플랫폼

```
타겟 플랫폼을 선택해주세요:
 A) 웹 전용
 B) 웹 + iOS (SwiftUI)
 C) 웹 + Android (Compose)
 D) 웹 + iOS + Android
 E) 기타
```

코드베이스 분석에서 iOS/Android가 감지됐으면 해당 옵션을 기본 추천합니다.

### Q4: 주요 컴포넌트

```
DESIGN.md에 포함할 컴포넌트를 선택해주세요 (복수 선택):
 A) 기본 세트 (버튼, 카드, 인풋, 네비게이션) — 감지 기반
 B) A + 데이터 (테이블, 차트, 배지)
 C) A + 오버레이 (모달, 토스트, 드롭다운)
 D) A + B + C 전체
 E) 직접 입력
```

## 동적 질문

summary.md에서 불확실한 항목이 있으면 추가 질문을 생성합니다.
각 질문은:
- 최소 3개 선택지 + 직접 입력 옵션
- Phase 1에서 감지된 값 기반 추천

예시 트리거:
- 소스 간 색상 팔레트 톤이 크게 다름 → "전체 톤은 어느 쪽이 좋을까요?"
- 폰트가 3개 이상 감지됨 → "주 폰트를 하나 선택해주세요"
- 그라디언트 사용 여부가 모호 → "그라디언트를 사용할까요?"

## 결과 저장

인터뷰 결과를 `.create-design-md/interview.md`에 저장합니다:

```yaml
responsive: true
breakpoints: [480, 768, 1024, 1280]
darkMode: true
darkModeStrategy: system-toggle
platform: web
components: [button, card, input, navigation, table, modal]
additionalNotes: "사용자 추가 요구사항"
```

## State 업데이트

```json
{ "phase2": "completed", "currentPhase": 3 }
```
