# Wiki Skill Design Spec

## Overview

Obsidian vault 기반 LLM Wiki의 탐색 병목을 해결하는 Claude Code 스킬.
키워드 검색 + 시맨틱 검색 + 자동 인덱싱을 Bun CLI로 구현하고, 기존 스킬(open, stop, read-project)과 통합한다.

환경변수 기반으로 개인 경로를 분리하여 공개 배포 가능하게 한다.

## Goals

1. **탐색 라운드트립 감소** — 4-5회 grep+read → 1회 CLI 호출
2. **시맨틱 검색** — 키워드를 몰라도 의미 기반으로 노트 탐색
3. **자동 인덱싱** — 힌트 파일(배운점.md, 결정.md) 수동 관리 제거
4. **공개 배포** — 환경변수로 개인정보 분리, install.sh로 원커맨드 설치
5. **기존 스킬 통합** — 8개 커스텀 스킬을 이 레포로 이관

## Non-Goals

- MCP 서버 구현 (스킬 + CLI로 충분)
- 실시간 파일 감시 (수동 reindex로 시작, 필요하면 나중에 추가)
- 다중 vault 지원 (단일 vault만)

---

## Project Structure

```
jidong-claude-md/
├── skills/
│   ├── wiki/
│   │   ├── SKILL.md                 ← 스킬 진입점 + 서브커맨드 라우팅
│   │   └── cli/
│   │       ├── package.json
│   │       ├── tsconfig.json
│   │       └── src/
│   │           ├── index.ts         ← CLI 엔트리 (서브커맨드 파싱)
│   │           ├── search.ts        ← 키워드 검색 (ripgrep 래핑)
│   │           ├── semantic.ts      ← 벡터 검색 (LanceDB + ollama)
│   │           ├── reindex.ts       ← 인덱스 + 임베딩 재생성
│   │           ├── recent.ts        ← 최근 기록 조회
│   │           ├── summary.ts       ← 프로젝트/노트 요약
│   │           └── config.ts        ← 환경변수 로드
│   ├── generate-context/            ← 기존 스킬 이관
│   ├── create-design-md/            ← 기존 스킬 이관
│   ├── open/                        ← 수정: wiki CLI 연동
│   ├── go/                          ← 기존 스킬 이관
│   ├── stop/                        ← 수정: wiki CLI 연동
│   ├── read-project/                ← 수정: wiki CLI 연동
│   ├── web-capture/                 ← 기존 스킬 이관
│   └── atomic-commits/              ← 기존 스킬 이관
├── setup/
│   └── install.sh                   ← 글로벌 심링크 + ollama + env 설정
└── docs/superpowers/specs/
    └── 2026-04-09-wiki-skill-design.md  ← 이 문서
```

---

## CLI Interface

실행: `bun run ~/.claude/skills/wiki/cli/src/index.ts <command> [args]`
(install.sh에서 `wiki` alias 등록 가능)

### Commands

#### `wiki search <query> [--project <name>] [--type <type>]`

vault 전체에서 키워드 검색. ripgrep 래핑.

- `--project` — 특정 프로젝트 폴더로 범위 한정
- `--type` — learning | decision | knowhow 필터 (프론트매터 기반)
- 출력: 매칭 파일 경로 + 매칭 라인 + 프론트매터 메타데이터 (마크다운)

#### `wiki semantic <query> [--top <n>] [--project <name>]`

임베딩 기반 유사도 검색.

- `--top` — 결과 수 (기본 5)
- `--project` — 프로젝트 필터
- 출력: 유사도 순으로 노트 제목 + 요약 스니펫 + 유사도 점수

폴백: ollama 미실행 시 `wiki search`로 자동 전환 + 경고 메시지.

#### `wiki recent [--project <name>] [--days <n>]`

최근 생성/수정된 노트 조회.

- `--project` — 프로젝트 필터
- `--days` — 기간 (기본 30)
- 출력: 날짜순 정렬, 노트 제목 + 타입 + 프로젝트

정렬 기준: 프론트매터 `created`/`updated` > 파일 mtime.

#### `wiki summary <project> | --all`

프로젝트 요약 또는 전체 프로젝트 목록.

- `wiki summary baegopax` — 개요 + 최근 배운점 3개 + 최근 결정 3개
- `wiki summary --all` — 전체 프로젝트 한 줄 요약 목록
- 출력: 마크다운 포맷

#### `wiki reindex [--embeddings-only]`

인덱스 재생성 + 임베딩 갱신.

- 기본: 프론트매터 인덱스 + 임베딩 모두 갱신
- `--embeddings-only` — 임베딩만 갱신
- 변경된 파일만 처리 (mtime 비교)
- 출력: 처리된 파일 수, 소요 시간

#### `wiki read <relative-path>`

단일 노트를 stdout으로 출력. 스킬에서 특정 노트를 읽을 때 사용.

---

## Environment Variables

파일: `~/.claude/wiki.env`

```bash
# 필수
CLAUDE_WIKI_VAULT=~/Library/Mobile Documents/com~apple~CloudDocs/obsidian/my-vault

# 선택 (기본값)
OLLAMA_EMBED_MODEL=nomic-embed-text
WIKI_TOP_K=5
```

### Config 로드 순서

1. `~/.claude/wiki.env` 파일 파싱
2. 환경변수 오버라이드 (셸에서 직접 export한 값 우선)
3. 기본값 폴백 (`OLLAMA_EMBED_MODEL=nomic-embed-text`, `WIKI_TOP_K=5`)

### config.ts

```typescript
interface WikiConfig {
  vaultPath: string;       // CLAUDE_WIKI_VAULT (필수, 없으면 에러)
  embedModel: string;      // OLLAMA_EMBED_MODEL (기본: nomic-embed-text)
  topK: number;            // WIKI_TOP_K (기본: 5)
  dataDir: string;         // ~/.claude/wiki-data/ (고정)
}
```

---

## Semantic Search Architecture

### 데이터 흐름

```
[vault .md 파일들]
       ↓ wiki reindex
[gray-matter로 프론트매터 파싱 + 본문 추출]
       ↓
[ollama HTTP API → nomic-embed-text → 임베딩 벡터]
       ↓
[LanceDB 저장]
  ~/.claude/wiki-data/
  ├── embeddings.lance/     ← 벡터 DB (코사인 유사도 검색)
  └── index.json            ← 프론트매터 인덱스 캐시
```

### 인덱싱 전략

- **단위**: 노트 1개 = 임베딩 1개 (청킹 안 함, 노트가 짧으므로)
- **증분 갱신**: mtime 비교로 변경된 파일만 재임베딩
- **인덱스 캐시**: `index.json`에 프론트매터 메타데이터 저장 (type, tags, project, created, updated, path)

### 검색 흐름

```
wiki semantic "쿼리"
  → ollama POST /api/embeddings (쿼리 임베딩 생성)
  → LanceDB 코사인 유사도 검색 (상위 K개)
  → index.json에서 메타데이터 매칭
  → 결과 마크다운 포맷 출력
```

### LanceDB 스키마

```typescript
interface NoteEmbedding {
  path: string;          // vault 내 상대 경로
  title: string;         // 파일명 또는 첫 번째 # 헤딩
  content: string;       // 본문 (검색 결과 스니펫용)
  vector: number[];      // 1024차원 임베딩
  project: string;       // 프론트매터 project
  type: string;          // 프론트매터 type
  tags: string[];        // 프론트매터 tags
  created: string;       // 프론트매터 created
  updated: string;       // 프론트매터 updated
  mtime: number;         // 파일 mtime (증분 갱신용)
}
```

### 에러 처리

| 상황 | 동작 |
|------|------|
| ollama 미실행 | `wiki search`로 폴백 + "ollama가 실행되지 않았습니다" 경고 |
| vault 경로 없음 | 에러 + "setup/install.sh를 실행하세요" 안내 |
| 임베딩 인덱스 없음 | 자동으로 `wiki reindex` 실행 |
| 노트에 프론트매터 없음 | 파일명에서 메타데이터 추론 (경로 기반 project, 파일명 기반 date) |

---

## Dependencies

```json
{
  "dependencies": {
    "@lancedb/lancedb": "latest",
    "gray-matter": "latest"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "latest"
  }
}
```

외부 도구:
- `ollama` — 로컬 임베딩 생성 (HTTP API, 별도 설치)
- `rg` (ripgrep) — 키워드 검색 (대부분 시스템에 설치됨)

---

## Skill Integration

### SKILL.md 동작

```
사용자: /wiki search 인증 삽질
→ SKILL.md가 LLM에게 CLI 호출 지시
→ LLM이 Bash로 `bun run ... search "인증 삽질"` 실행
→ 결과를 컨텍스트에 주입
```

### CLAUDE.md Skill Routing 추가

```markdown
| "위키", "기록 찾아", "전에 뭐했지" | wiki | 위키 검색 + 요약 |
```

### 기존 스킬 수정

| 스킬 | 변경 내용 |
|------|----------|
| `open` | vault 하드코딩 제거 → `wiki summary $PROJECT` 호출로 대체 |
| `stop` | vault 하드코딩 제거 → `source ~/.claude/wiki.env`로 경로 참조 |
| `read-project` | vault 하드코딩 제거 → `wiki summary $PROJECT` 호출로 대체 |
| `generate-context` | 그대로 이관 (`gstack` 참조는 선택적 플러그인으로 문서화) |
| `create-design-md` | 그대로 이관 (서브파일 포함) |
| `go` | 그대로 이관 |
| `web-capture` | 그대로 이관 (scripts/ 포함) |
| `atomic-commits` | 그대로 이관 |

### Hooks 수정

```bash
# wiki-session-start.sh 변경
# Before: VAULT="~/Library/Mobile Documents/..."
# After:
source ~/.claude/wiki.env
VAULT="$CLAUDE_WIKI_VAULT"

# wiki-stop.sh 동일 패턴
```

---

## Setup / Installation

### `setup/install.sh`

```bash
#!/bin/bash
set -e

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# 1. 스킬 심링크
echo "=== 스킬 심링크 생성 ==="
mkdir -p ~/.claude/skills
for skill in "$REPO_DIR"/skills/*/; do
  name=$(basename "$skill")
  ln -sfn "$skill" "$HOME/.claude/skills/$name"
  echo "  $name → linked"
done

# 2. ollama 확인 + 모델 풀
echo "=== ollama 모델 확인 ==="
if command -v ollama &>/dev/null; then
  ollama list | grep -q nomic-embed-text || ollama pull nomic-embed-text
else
  echo "⚠️  ollama가 설치되어 있지 않습니다. 시맨틱 검색을 사용하려면 ollama를 설치하세요."
  echo "   https://ollama.com"
fi

# 3. wiki.env 대화형 생성
if [ ! -f ~/.claude/wiki.env ]; then
  echo "=== wiki.env 설정 ==="
  read -p "Obsidian vault 경로: " vault_path
  cat > ~/.claude/wiki.env << EOF
CLAUDE_WIKI_VAULT=$vault_path
OLLAMA_EMBED_MODEL=nomic-embed-text
WIKI_TOP_K=5
EOF
  echo "  ~/.claude/wiki.env 생성 완료"
else
  echo "  ~/.claude/wiki.env 이미 존재 (스킵)"
fi

# 4. CLI 의존성 설치
echo "=== CLI 의존성 설치 ==="
cd "$REPO_DIR/skills/wiki/cli" && bun install

# 5. 초기 인덱싱
echo "=== 초기 인덱싱 ==="
bun run src/index.ts reindex

echo "=== 설치 완료 ==="
```

### .gitignore 추가

```
# Wiki personal data
wiki.env
wiki-data/
node_modules/
```

---

## Testing Strategy

- **search**: vault에 테스트용 .md 파일 생성 → 키워드 매칭 검증
- **semantic**: 의미적으로 유사한 쿼리가 올바른 노트를 반환하는지 검증
- **reindex**: 파일 추가/수정/삭제 후 인덱스 정합성 검증
- **config**: wiki.env 없을 때, 환경변수 오버라이드, 기본값 폴백 각각 검증
- **폴백**: ollama 미실행 시 키워드 검색 폴백 검증

---

## Future Considerations (Not In Scope)

- fswatch 기반 실시간 인덱싱
- MCP 서버 전환 (다른 AI 도구에서 사용 시)
- 다중 vault 지원
- 청킹 전략 (노트가 길어질 경우)
- 웹 UI 대시보드
