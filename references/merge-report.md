# Merge Report Format

Natural language only. No code blocks.

## Fast

## 완료 보고: [task]

변경 내용: [one line]
테스트: 기존 통과 확인

## Standard / Critical

## 머지 리포트: [branch]

### 요약

### 변경된 부분 (functional, not code)

### 머지 시 달라지는 것

- User-facing / API contract / DB schema / env vars / external services / new dependencies

### 리스크 및 주의사항

- Affected features / rollback / deploy order

### 테스트 결과

- Before N → After M (+X) / pass status / manual scenarios

### 결정 요청

승인하시겠습니까?

---

## Feedback Loop

1. Classify: (A) Minor — same worktree / (B) Approach change — restart from STEP 1 / (C) Scope expansion — new task
2. Present analysis, wait for confirmation
3. Execute, write new merge report
