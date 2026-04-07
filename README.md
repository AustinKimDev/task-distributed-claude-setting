# task-distributed-claude-setting

Claude Code를 체계적으로 제어하는 글로벌 CLAUDE.md 설정 템플릿입니다.

작업 분류, 워크트리 기반 브랜치 전략, 병렬 에이전트 실행, 안전 규칙, 스킬 자동 라우팅을 하나의 설정으로 통합합니다.

## 이걸 쓰면 뭐가 달라지나

- **작업을 분류하고 확인받은 뒤에만 코드를 건드림** — Fast/Standard/Critical 3단계로 나눠서, 위험한 작업은 반드시 승인을 거침
- **main 브랜치를 직접 수정하지 않음** — 모든 작업은 worktree에서 진행하고 git merge로만 반영
- **멀티 에이전트 병렬 실행** — 독립적인 작업은 각각 별도 worktree + 별도 에이전트로 동시 처리
- **스킬 자동 활성화** — "버그야", "배포해줘", "디자인이 별로" 같은 키워드만으로 적절한 스킬이 자동 실행
- **위험한 명령 차단** — hooks가 `rm -rf ~/`, force push, 시크릿 파일 접근 등을 사전 차단
- **Obsidian vault를 장기 기억으로 활용** — 세션 시작/종료 시 자동으로 위키를 읽고 기록

## 파일 구조

```
CLAUDE.md                 # 메인 설정 — Claude Code가 읽는 핵심 지침
RTK.md                    # RTK (Rust Token Killer) 토큰 절약 프록시 설정
settings.json             # Claude Code settings — hooks, 플러그인, 환경변수

hooks/                    # PreToolUse/PostToolUse/Session 훅 스크립트
  block-dangerous-commands.js   # rm -rf, fork bomb 등 위험 명령 차단
  protect-secrets.js            # .env, SSH키, 자격증명 파일 접근 차단
  main-branch-protection.sh     # main 브랜치에서 직접 파일 수정 차단
  rtk-rewrite.sh                # 명령어를 rtk로 자동 리라이트 (토큰 절약)
  wiki-session-start.sh         # 세션 시작 시 Obsidian vault 읽기 강제
  wiki-stop.sh                  # 세션 종료 시 배운점/결정 기록 강제
  wiki-post-tool.sh             # 파일 수정 후 위키 저장 필요 여부 리마인드

workflows/                # 작업 유형별 워크플로우 정의
  new-project.md          # 새 프로젝트 셋업 (Critical)
  new-feature.md          # 새 기능 개발 (Standard)
  bug-fix.md              # 버그 수정 (Standard)
  bug-investigation.md    # 버그 조사 (워크트리 없음)
  refactor.md             # 리팩토링 (Standard)
  performance.md          # 성능 최적화 (Standard)
  security.md             # 보안 강화 (Critical)
  testing.md              # 테스트 작성 (Standard)
  docs.md                 # 문서 업데이트 (Fast/Standard)
  code-review.md          # 코드 리뷰 (워크트리 없음)
  deps-update.md          # 의존성 업데이트 (Standard)
  hotfix.md               # 긴급 핫픽스 (Critical, 단축 허용)
  legacy-migration.md     # 레거시 마이그레이션 (Critical)
  db-schema.md            # DB 스키마 변경 (Critical)
  ui-ux.md                # UI/UX 개선 (Standard)
  infra.md                # 인프라 변경 (Critical)

references/               # 워크플로우에서 참조하는 상세 정책
  step-details.md         # Inner Work Loop 6단계 상세 (Discovery → Merge Report)
  model-routing.md        # 모델 라우팅 — Opus 오케스트레이션, Sonnet/Haiku 실행
  worktree-policy.md      # 워크트리 생성/관리/정리 규칙
  parallel-strategy.md    # 병렬화 전략 — 언제, 어떻게 에이전트를 나눌지
  merge-report.md         # 머지 리포트 템플릿
  agent-handoff.md        # 에이전트 간 핸드오프 프로토콜
  library-selection.md    # 라이브러리 도입 평가 기준 (build vs adopt)
```

## 사용법

### 1. 클론

```bash
git clone git@github.com:AustinKimDev/task-distributed-claude-setting.git
```

### 2. 개인 설정 적용

플레이스홀더를 본인 환경에 맞게 수정합니다:

**settings.json** — 훅 경로의 `<HOME>`을 실제 홈 경로로 교체:
```json
"command": "/Users/yourname/.claude/hooks/wiki-session-start.sh"
```

**hooks/wiki-*.sh** — Obsidian vault를 사용하는 경우, vault 경로 설정:
```bash
# 방법 1: 쉘 프로필에 환경변수 설정
export WIKI_VAULT="$HOME/Library/Mobile Documents/com~apple~CloudDocs/obsidian/my-vault"

# 방법 2: 훅 파일에서 직접 수정
VAULT="${WIKI_VAULT:-$HOME/path/to/your/vault}"
```

**CLAUDE.md** — `<YOUR_OBSIDIAN_VAULT_PATH>`를 본인 vault 경로로 교체. Obsidian을 안 쓰면 LLM Wiki 섹션 전체를 삭제해도 됩니다.

### 3. Claude Code에 연결

```bash
# 글로벌 설정으로 심볼릭 링크
ln -s /path/to/task-distributed-claude-setting/CLAUDE.md ~/.claude/CLAUDE.md

# settings.json도 링크 (hooks 사용 시)
ln -s /path/to/task-distributed-claude-setting/settings.json ~/.claude/projects/<project>/settings.json
```

### 4. 훅 스크립트 실행 권한

```bash
chmod +x hooks/*.sh
```

## 작업 흐름 요약

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

## 커스터마이징

- **워크플로우 추가/수정**: `workflows/` 안에 새 `.md` 파일을 만들고 `CLAUDE.md`의 Workflow Routing 테이블에 추가
- **훅 비활성화**: `settings.json`에서 해당 훅 항목을 제거
- **스킬 라우팅 변경**: `CLAUDE.md`의 Skill Routing 테이블에서 트리거-스킬 매핑 수정
- **모델 라우팅 조정**: `references/model-routing.md`에서 태스크-모델 매핑 변경
- **위키 기능 제거**: `hooks/wiki-*.sh` 3개 삭제 + `settings.json`에서 해당 훅 제거 + `CLAUDE.md`에서 LLM Wiki 섹션 삭제

## 의존성

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) — 필수
- [RTK](https://github.com/rtk-ai/rtk) — 선택 (토큰 절약 프록시, 없으면 훅이 자동 스킵)
- [jq](https://jqlang.github.io/jq/) — RTK 훅 사용 시 필요
- [Obsidian](https://obsidian.md/) — 선택 (위키 기능 사용 시)
