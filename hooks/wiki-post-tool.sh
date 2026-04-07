#!/bin/bash
# LLM Wiki — PostToolUse hook (Edit|Write)
# 파일 수정 후 위키 저장이 필요한지 판단하도록 리마인드

# Set your Obsidian vault path here (or export WIKI_VAULT in your shell profile)
VAULT="${WIKI_VAULT:-$HOME/Library/Mobile Documents/com~apple~CloudDocs/obsidian/<YOUR_VAULT>/<YOUR_VAULT>}"

if [ -f "$VAULT/_위키-스키마.md" ]; then
  cat <<EOF
[LLM Wiki] 방금 파일을 수정했습니다. _위키-스키마.md의 자동 저장 규칙에 해당하는지 확인하세요:
- 디버깅 원인 발견 → 노하우/개발/ + 배운점.md
- 의사결정 → 결정.md
- 새 패턴/방법 → 노하우/개발/
- 해당 없으면 무시 (알림 불필요)
Vault: $VAULT
EOF
fi
