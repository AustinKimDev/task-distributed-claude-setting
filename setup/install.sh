#!/bin/bash
set -e

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== jidong-claude-md 설치 ==="
echo ""

# 1. 스킬 심링크
echo "📦 스킬 심링크 생성..."
mkdir -p "$HOME/.claude/skills"
for skill in "$REPO_DIR"/skills/*/; do
  name=$(basename "$skill")
  ln -sfn "$skill" "$HOME/.claude/skills/$name"
  echo "  ✓ $name"
done
echo ""

# 1b. 루트 파일 & 디렉토리 심링크 (CLAUDE.md, RTK.md, references/, workflows/)
echo "🔗 루트 파일/디렉토리 심링크 생성..."
mkdir -p "$HOME/.claude"
for file in CLAUDE.md RTK.md; do
  ln -sfn "$REPO_DIR/$file" "$HOME/.claude/$file"
  echo "  ✓ $file"
done
for dir in references workflows; do
  if [ -d "$HOME/.claude/$dir" ] && [ ! -L "$HOME/.claude/$dir" ]; then
    mv "$HOME/.claude/$dir" "$HOME/.claude/$dir.bak.$(date +%s)"
  fi
  ln -sfn "$REPO_DIR/$dir" "$HOME/.claude/$dir"
  echo "  ✓ $dir/"
done
echo ""

# 1c. hooks 파일별 심링크 (.rtk-hook.sha256 같은 자동 생성 파일 보존)
echo "🔗 hooks 심링크 생성..."
mkdir -p "$HOME/.claude/hooks"
for hook in "$REPO_DIR"/hooks/*; do
  name=$(basename "$hook")
  ln -sfn "$hook" "$HOME/.claude/hooks/$name"
  echo "  ✓ $name"
done
echo ""

# 2. ollama 확인 + 모델 풀
echo "🤖 ollama 확인..."
if command -v ollama &>/dev/null; then
  if ollama list 2>/dev/null | grep -q nomic-embed-text; then
    echo "  ✓ nomic-embed-text 이미 설치됨"
  else
    echo "  ⬇️ nomic-embed-text 다운로드 중..."
    ollama pull nomic-embed-text
  fi
else
  echo "  ⚠️ ollama 미설치. 시맨틱 검색 없이 키워드 검색만 사용 가능."
  echo "     설치: https://ollama.com"
fi
echo ""

# 3. wiki.env 대화형 생성
if [ ! -f "$HOME/.claude/wiki.env" ]; then
  echo "📝 wiki.env 설정..."
  echo "   Obsidian vault 경로를 입력하세요."
  echo "   (예: ~/Library/Mobile Documents/com~apple~CloudDocs/obsidian/my-vault)"
  echo ""
  read -p "   Vault 경로: " vault_path

  if [ -n "$vault_path" ]; then
    cat > "$HOME/.claude/wiki.env" << EOF
CLAUDE_WIKI_VAULT=$vault_path
OLLAMA_EMBED_MODEL=nomic-embed-text
WIKI_TOP_K=5
EOF
    echo "  ✓ ~/.claude/wiki.env 생성 완료"
  else
    echo "  ⚠️ 경로 미입력. wiki.env를 직접 생성하세요."
  fi
else
  echo "📝 wiki.env 이미 존재 (스킵)"
fi
echo ""

# 4. CLI 의존성 설치
echo "📦 wiki CLI 의존성 설치..."
if command -v bun &>/dev/null; then
  cd "$REPO_DIR/skills/wiki/cli" && bun install
  echo "  ✓ 설치 완료"
else
  echo "  ⚠️ bun 미설치. wiki CLI를 사용하려면 bun을 설치하세요."
  echo "     설치: https://bun.sh"
fi
echo ""

# 5. 초기 인덱싱 (wiki.env + bun 있을 때만)
if [ -f "$HOME/.claude/wiki.env" ] && command -v bun &>/dev/null; then
  echo "🔍 초기 인덱싱..."
  cd "$REPO_DIR/skills/wiki/cli"
  bun run src/index.ts reindex 2>&1 || echo "  ⚠️ 인덱싱 실패 (나중에 wiki reindex로 재시도)"
fi

echo ""
echo "=== 설치 완료 ==="
echo ""
echo "사용법:"
echo "  /wiki search \"검색어\"     — 키워드 검색"
echo "  /wiki semantic \"질문\"     — 시맨틱 검색"
echo "  /wiki summary 프로젝트명   — 프로젝트 요약"
echo "  /wiki recent              — 최근 기록"
