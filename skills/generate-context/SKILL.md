---
name: generate-context
description: Use when setting up a new project, initializing CLAUDE.md, or when user wants to auto-detect and fill the Project Context section. Triggers on "/generate-context", "프로젝트 컨텍스트 생성", "CLAUDE.md 컨텍스트 채워줘", "context 자동 생성", "프로젝트 정보 수집".
---

# Generate Context

프로젝트를 자동 분석하고 인터뷰를 통해 CLAUDE.md의 `## Project Context` 섹션을 완성합니다.

## 흐름

```
Phase 1: 자동 분석 → Phase 2: 인터뷰 → Phase 3: 생성 및 적용
```

---

## Phase 1 — 자동 분석

아래 항목을 순서대로 감지합니다. 감지 못한 항목은 `[미감지]`로 표시합니다.

### Project name

1. `package.json` → `name` 필드
2. `*.csproj` → 파일명에서 추출
3. `pubspec.yaml` → `name` 필드
4. `go.mod` → `module` 경로 마지막 세그먼트
5. 위 모두 없으면 → 현재 폴더명

### Backend stack

| 파일 | 스택 |
|------|------|
| `*.csproj` | .NET Core (버전: `TargetFramework` 태그) |
| `go.mod` | Go |
| `requirements.txt` 또는 `pyproject.toml` | Python |
| `Gemfile` | Ruby on Rails |
| `pom.xml` 또는 `build.gradle` | Java/Kotlin |

### Frontend stack

`package.json`의 `dependencies`/`devDependencies`에서:

| 키 | 스택 |
|----|------|
| `next` | Next.js |
| `react` | React |
| `vue` | Vue |
| `svelte` | Svelte |
| `@angular/core` | Angular |

### Mobile stack

| 파일 | 스택 |
|------|------|
| `Podfile` 또는 `*.xcworkspace` | iOS (Swift) |
| `pubspec.yaml` | Flutter |
| `build.gradle` + `AndroidManifest.xml` | Android |

### Database

`package.json`, `*.csproj`, `requirements.txt`에서:

| 패키지 | DB |
|--------|-----|
| `pg`, `npgsql`, `psycopg2` | PostgreSQL |
| `mysql`, `mysqlclient` | MySQL |
| `sqlite`, `sqlite3`, `better-sqlite3` | SQLite |
| `mongoose`, `mongodb` | MongoDB |
| `redis`, `ioredis` | Redis |

### Test command

1. `package.json` → `scripts.test` 값 그대로
2. `*.csproj` 존재 → `dotnet test`
3. `go.mod` 존재 → `go test ./...`
4. `pytest.ini` 또는 `pyproject.toml [tool.pytest]` → `pytest`
5. `Makefile`에 `test:` 타겟 → `make test`
6. `.github/workflows/*.yml`에서 test step의 `run` 명령어
7. 없으면 → `[미감지]`

### Main branch

```bash
git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||'
```
실패 시 → `git branch -r | grep HEAD` → 실패 시 → `main`

### Deploy platform

| 파일 | 플랫폼 |
|------|--------|
| `vercel.json` | Vercel |
| `railway.toml` / `railway.json` | Railway |
| `fly.toml` | Fly.io |
| `render.yaml` | Render |
| `.github/workflows/*.yml`에 `aws` | AWS |
| `.github/workflows/*.yml`에 `gcp` | GCP |
| `Dockerfile`만 있고 위 없음 | Docker (플랫폼 미정) |

### Staging / Production URL

1. `vercel.json`, `railway.toml`, `fly.toml`에서 도메인 추출
2. `.env.example`, `.env`에서: `NEXT_PUBLIC_API_URL`, `APP_URL`, `BASE_URL`, `API_BASE_URL`, `SITE_URL`
3. 없으면 → `[미감지]`

### Teammate mode

- `~/.claude/skills/gstack` 또는 `.claude/skills/gstack` 디렉토리 존재 → `enabled`
- 없으면 → `disabled`

---

## Phase 2 — 인터뷰

### 결과 표시

분석이 끝나면 아래 형식으로 결과를 먼저 보여줍니다:

```markdown
## 🔍 자동 분석 결과

| 항목 | 감지 결과 |
|---|---|
| Project | {name} |
| Stack | {backend} + {frontend/mobile} + {db} |
| Test command | {command} |
| Main branch | {branch} |
| Deploy platform | {platform} |
| Staging URL | {url 또는 [미감지]} |
| Production URL | {url 또는 [미감지]} |
| Teammate mode | {enabled/disabled} |
```

### 파트 A — 미감지 항목 채우기

`[미감지]` 항목만 질문합니다. 한 번에 전부 묻지 말고 자연스럽게 대화합니다.
사용자가 엔터(빈 응답)하면 "없음"으로 처리합니다.

### 파트 B — 프로젝트 성격 파악 (항상 진행)

아래 질문을 **하나씩** 대화하듯 진행합니다:

1. **주요 사용자** — "이 프로젝트의 주요 사용자는 누구인가요?" (일반 소비자 앱 / B2B SaaS / 내부 툴 / 오픈소스)
2. **개발 단계** — "현재 개발 단계는 어디인가요?" (MVP 개발 중 / 베타 서비스 중 / 프로덕션 운영 중)
3. **팀 구성** — "팀 구성이 어떻게 되나요?" (솔로 / 소규모 2~3명 / 팀 5명 이상)
4. **제약사항** — "절대 건드리면 안 되는 레거시 영역이나 제약사항이 있나요?" (없으면 엔터)
5. **외부 서비스** — "자주 쓰는 외부 서비스나 API가 있나요?" (Stripe, Firebase, OpenAI 등 / 없으면 엔터)

---

## Phase 3 — 생성 및 적용

인터뷰 완료 후 최종 결과를 보여줍니다:

```markdown
## Project Context
- Project: {프로젝트명}
- Description: {사용자/개발단계 기반 한 줄 설명}
- Stack: {백엔드} + {프론트/모바일} + {DB} + {인프라}
- Staging URL: {URL 또는 없음}
- Production URL: {URL 또는 없음}
- Main branch: {브랜치}
- Test command: {커맨드}
- Deploy platform: {플랫폼}
- Teammate mode: {enabled/disabled}
- Team: {팀 구성}
- Stage: {개발 단계}
- External services: {외부 서비스 목록} (있을 경우만)
- Known constraints: {제약사항} (있을 경우만)
```

그 다음 확인: **"이 내용을 CLAUDE.md에 적용할까요? 수정할 항목 있으면 말씀해 주세요."**

### 적용 로직

1. 프로젝트 루트에 `CLAUDE.md` 있음 → `## Project Context` 섹션 찾아서 교체 (다음 `##` 전까지)
2. `## Project Context` 섹션 없음 → 파일 맨 위에 추가
3. `CLAUDE.md` 없음 → "CLAUDE.md가 없습니다. 새로 만들까요?" 물어보고 생성

---

## Common Mistakes

| 실수 | 올바른 방법 |
|------|------------|
| 인터뷰 질문을 한꺼번에 나열 | 하나씩 대화하듯 진행 |
| 미감지 항목을 추측해서 채움 | 반드시 사용자에게 물어봄 |
| CLAUDE.md 기존 내용 덮어쓰기 | `## Project Context` 섹션만 교체 |
| 사용자 확인 없이 바로 적용 | 항상 최종 확인 후 적용 |
