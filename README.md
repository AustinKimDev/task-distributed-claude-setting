# task-distributed-claude-setting

Claude Code를 체계적으로 제어하는 글로벌 설정 템플릿입니다.

작업 분류, 워크트리 기반 브랜치 전략, 병렬 에이전트 실행, 안전 규칙, 스킬 자동 라우팅, Obsidian 기반 장기 기억을 하나의 설정으로 통합합니다.

## 이걸 쓰면 뭐가 달라지나

- **작업을 분류하고 확인받은 뒤에만 코드를 건드림** — Fast/Standard/Critical 3단계로 나눠서, 위험한 작업은 반드시 승인을 거침
- **main 브랜치를 직접 수정하지 않음** — 모든 작업은 worktree에서 진행하고 git merge로만 반영
- **멀티 에이전트 병렬 실행** — 독립적인 작업은 각각 별도 worktree + 별도 에이전트로 동시 처리
- **스킬 자동 활성화** — "버그야", "배포해줘", "디자인이 별로" 같은 키워드만으로 적절한 스킬이 자동 실행
- **위험한 명령 차단** — hooks가 `rm -rf ~/`, force push, 시크릿 파일 접근 등을 사전 차단
- **Obsidian vault를 장기 기억으로 활용** — 세션 시작/종료 시 자동으로 위키를 읽고 기록하며, `/wiki` 스킬로 검색 가능

## 설치

### 방법 1: 원커맨드 설치

```bash
git clone git@github.com:AustinKimDev/task-distributed-claude-setting.git
cd task-distributed-claude-setting
bash setup/install.sh
```

스킬 심링크, ollama 임베딩 모델, wiki.env 설정, CLI 의존성 설치, 초기 인덱싱까지 자동으로 진행합니다.

### 방법 2: AI 자동 설치

```bash
git clone git@github.com:AustinKimDev/task-distributed-claude-setting.git
cd task-distributed-claude-setting
```

Claude Code를 열고:

> SETUP.md 따라서 설치해줘

AI가 환경 감지 → 옵션 질문 (Obsidian, RTK, 언어, 플러그인) → 자동 설정을 진행합니다.

### 방법 3: 수동 설치

```bash
git clone git@github.com:AustinKimDev/task-distributed-claude-setting.git
cd task-distributed-claude-setting

# 1. 플레이스홀더 수정
#    - settings.json: <HOME>을 실제 홈 경로로 교체
#    - CLAUDE.md: <YOUR_OBSIDIAN_VAULT_PATH>를 vault 경로로 교체 (안 쓰면 LLM Wiki 섹션 삭제)

# 2. 심볼릭 링크
ln -sf "$(pwd)/CLAUDE.md" ~/.claude/CLAUDE.md
ln -sf "$(pwd)/RTK.md" ~/.claude/RTK.md          # RTK 사용 시
mkdir -p ~/.claude/hooks && cp hooks/* ~/.claude/hooks/
mkdir -p ~/.claude/skills
for skill in skills/*/; do ln -sfn "$(pwd)/$skill" ~/.claude/skills/$(basename "$skill"); done

# 3. 실행 권한
chmod +x ~/.claude/hooks/*.sh

# 4. settings.json 반영 (기존 설정이 있으면 수동 머지 필요)
cp settings.json ~/.claude/settings.json
```

## 작업 흐름

```
사용자 요청
  ↓
분류 (Fast / Standard / Critical)
  ↓
Fast → 즉시 실행 → 결과 보고
Standard → 승인 대기 → worktree 생성 → 6단계 루프 → 머지 리포트 → 승인 후 merge
Critical → 2단계 승인 → worktree 생성 → 6단계 루프 → 머지 리포트 → 승인 후 merge
```

**Inner Work Loop 6단계:**
1. Discovery — 문제 파악, 스코프 확인
2. Planning — 접근법 확정, 라이브러리 평가, 병렬화 설계
3. Implementation — TDD로 코드 작성, 변경마다 커밋
4. Build & Test — 빌드, 린트, 테스트 실행
5. Review & QA — 품질 검증 (Fast: 생략, Standard: 경량, Critical: 전체)
6. Pre-Merge Report — 머지 리포트 작성

## 파일 구조

```
CLAUDE.md                 # 메인 설정 — Claude Code가 읽는 핵심 지침
RTK.md                    # RTK (Rust Token Killer) 토큰 절약 프록시 설정
SETUP.md                  # AI 에이전트용 대화형 설치 가이드
settings.json             # Claude Code settings — hooks, 플러그인, 환경변수

setup/
  install.sh              # 원커맨드 설치 스크립트

hooks/                    # PreToolUse/PostToolUse/Session 훅 스크립트
  block-dangerous-commands.js   # rm -rf, fork bomb 등 위험 명령 차단
  protect-secrets.js            # .env, SSH키, 자격증명 파일 접근 차단
  main-branch-protection.sh     # main 브랜치에서 직접 파일 수정 차단
  rtk-rewrite.sh                # 명령어를 rtk로 자동 리라이트 (토큰 절약)
  wiki-session-start.sh         # 세션 시작 시 Obsidian vault 읽기 강제
  wiki-stop.sh                  # 세션 종료 시 배운점/결정 기록 강제

skills/                   # Claude Code 커스텀 스킬 (/명령어로 실행)
  wiki/                   # /wiki — Obsidian vault 검색/조회
    SKILL.md              #   스킬 정의
    cli/                  #   bun 기반 검색 엔진 (search, semantic, recent, summary, read, reindex)
    install.sh            #   wiki CLI 단독 설치 스크립트
  open/                   # /open — 세션 시작 시 위키 컨텍스트 로드
  stop/                   # /stop — 세션 종료 시 위키 기록
  read-project/           # /read-project — 프로젝트 컨텍스트 빠른 조회
  generate-context/       # /generate-context — 프로젝트별 CLAUDE.md 자동 생성
  go/                     # /go — 확인 없이 즉시 실행 모드 전환
  atomic-commits/         # /atomic-commits — 변경마다 커밋 강제
  create-design-md/       # /create-design-md — DESIGN.md 생성 (분석→인터뷰→믹싱→생성)
  web-capture/            # /web-capture — 웹 스크린샷 캡처

workflows/                # 작업 유형별 워크플로우 정의
  new-project.md          #   새 프로젝트 셋업 (Critical)
  new-feature.md          #   새 기능 개발 (Standard)
  bug-fix.md              #   버그 수정 (Standard)
  bug-investigation.md    #   버그 조사 (워크트리 없음)
  refactor.md             #   리팩토링 (Standard)
  performance.md          #   성능 최적화 (Standard)
  security.md             #   보안 강화 (Critical)
  testing.md              #   테스트 작성 (Standard)
  docs.md                 #   문서 업데이트 (Fast/Standard)
  code-review.md          #   코드 리뷰 (워크트리 없음)
  deps-update.md          #   의존성 업데이트 (Standard)
  hotfix.md               #   긴급 핫픽스 (Critical, 단축 허용)
  legacy-migration.md     #   레거시 마이그레이션 (Critical)
  db-schema.md            #   DB 스키마 변경 (Critical)
  ui-ux.md                #   UI/UX 개선 (Standard)
  infra.md                #   인프라 변경 (Critical)

references/               # 워크플로우에서 참조하는 상세 정책
  step-details.md         #   Inner Work Loop 6단계 상세
  model-routing.md        #   모델 라우팅 — Opus 오케스트레이션, Sonnet/Haiku 실행
  worktree-policy.md      #   워크트리 생성/관리/정리 규칙
  parallel-strategy.md    #   병렬화 전략
  merge-report.md         #   머지 리포트 템플릿
  agent-handoff.md        #   에이전트 간 핸드오프 프로토콜
  library-selection.md    #   라이브러리 도입 평가 기준

docs/                     # 설계 문서, 스펙
```

## 스킬 라우팅

자연어 키워드로 스킬이 자동 활성화됩니다.

| 키워드 | 스킬 | 용도 |
|--------|------|------|
| "버그야", "왜 안 돼" | investigate | 가설 기반 원인 분석 |
| "코드 리뷰해줘" | review | 프로덕션 버그 탐지 |
| "보안 점검" | cso | OWASP+STRIDE 분석 |
| "배포해줘" | ship | 테스트 → PR |
| "전체 리뷰해줘" | autoplan | CEO→Design→Eng 자동 리뷰 |
| "위키", "전에 뭐했지" | wiki | Obsidian vault 검색 |
| "디자인이 별로" | critique → audit | UX + 기술 진단 |
| "새 아이디어" | office-hours | 아이디어 검증 + 설계 |

전체 목록은 `CLAUDE.md`의 Skill Routing 테이블을 참고하세요.

## 커스터마이징

- **워크플로우 추가/수정**: `workflows/`에 새 `.md` 파일 생성 → `CLAUDE.md`의 Workflow Routing 테이블에 추가
- **스킬 추가**: `skills/`에 새 디렉토리 + `SKILL.md` 생성 → `CLAUDE.md`의 Skill Routing에 트리거 매핑
- **훅 비활성화**: `settings.json`에서 해당 훅 항목 제거
- **모델 라우팅 조정**: `references/model-routing.md`에서 태스크-모델 매핑 변경
- **위키 기능 제거**: `hooks/wiki-*.sh` 삭제 + `settings.json`에서 해당 훅 제거 + `CLAUDE.md`에서 LLM Wiki 섹션 삭제

## 의존성

| 도구 | 필수 | 용도 |
|------|------|------|
| [Claude Code](https://docs.anthropic.com/en/docs/claude-code) | 필수 | AI 코딩 에이전트 |
| [Bun](https://bun.sh/) | 선택 | wiki CLI 실행 |
| [Ollama](https://ollama.com/) | 선택 | 시맨틱 검색 임베딩 (nomic-embed-text) |
| [Obsidian](https://obsidian.md/) | 선택 | 장기 기억 vault |
| [RTK](https://github.com/rtk-ai/rtk) | 선택 | 토큰 절약 프록시 |
| [jq](https://jqlang.github.io/jq/) | 선택 | RTK 훅 사용 시 |
