#!/bin/bash
# LLM Wiki — SessionStart hook (lightweight)
# 세션 시작 시 위키 컨텍스트를 로드하도록 지시

VAULT="${WIKI_VAULT:-$HOME/Library/Mobile Documents/com~apple~CloudDocs/obsidian/<YOUR_VAULT>/<YOUR_VAULT>}"

if [ ! -d "$VAULT" ]; then
  exit 0
fi

PROJECT_NAME=$(basename "$(pwd)")

# Check if project has wiki notes
if [ -d "$VAULT/프로젝트/$PROJECT_NAME" ]; then
  HAS_NOTES="true"
  LEARNING_COUNT=$(grep -c "^## " "$VAULT/프로젝트/$PROJECT_NAME/배운점.md" 2>/dev/null || echo "0")
  DECISION_COUNT=$(grep -c "^## " "$VAULT/프로젝트/$PROJECT_NAME/결정.md" 2>/dev/null || echo "0")
else
  HAS_NOTES="false"
fi

if [ "$HAS_NOTES" = "true" ]; then
  cat <<EOF
[LLM Wiki] 프로젝트 "${PROJECT_NAME}" 위키 발견 (배운점 ${LEARNING_COUNT}건, 결정 ${DECISION_COUNT}건).
작업 시작 전: 관련 키워드로 vault를 Grep 검색하고 관련 노트를 읽으세요.
Vault: $VAULT
EOF
else
  cat <<EOF
[LLM Wiki] 프로젝트 "${PROJECT_NAME}" 위키 없음.
작업 후 /stop에서 자동 생성됩니다.
Vault: $VAULT
EOF
fi
