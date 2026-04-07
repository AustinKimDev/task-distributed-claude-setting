# AI Setup Guide

This file is written for AI agents (Claude Code, Codex, Gemini CLI, etc.).
Users: just tell your AI "follow SETUP.md" after cloning this repo.

---

## Instructions for AI Agent

You are setting up the task-distributed-claude-setting configuration for the user.
Follow each step in order. Ask the user when a decision is needed.

### Step 1: Detect Environment

```
Gather the following information:
- HOME directory path (echo $HOME)
- Whether ~/.claude/ directory exists
- Whether ~/.claude/CLAUDE.md already exists (backup if so)
- Whether ~/.claude/settings.json already exists (will need to merge)
- OS type (macOS / Linux)
```

### Step 2: Ask User Preferences

Ask the user these questions before proceeding:

1. **Obsidian vault**: "Obsidian vault를 Claude의 장기 기억으로 사용할까요? 사용한다면 vault 경로를 알려주세요."
   - Yes → get vault path, proceed with wiki hooks
   - No → will remove wiki hooks and LLM Wiki section from CLAUDE.md

2. **RTK (Rust Token Killer)**: "RTK로 토큰을 절약할까요? (rtk가 설치되어 있어야 합니다)"
   - Check if `rtk` is in PATH
   - Yes + installed → keep rtk hook and RTK.md
   - No → will remove rtk hook and RTK.md reference

3. **Language**: "CLAUDE.md의 응답 언어를 한국어로 유지할까요, 다른 언어로 바꿀까요?"
   - Korean → keep as is
   - Other → replace "Always respond in Korean. All explanations, reports, questions, and status updates in Korean." with the chosen language

4. **Plugins**: "어떤 Claude Code 플러그인을 사용할까요? 현재 설정된 목록:"
   - Show the enabledPlugins list from settings.json
   - User can keep, add, or remove

### Step 3: Apply Configuration

Based on user answers, modify the files:

#### 3a. Update settings.json

Replace all `<HOME>` placeholders with the actual home directory path:
```
<HOME>/.claude/hooks/... → /Users/actualname/.claude/hooks/...
```

If user said NO to Obsidian:
- Remove the SessionStart hook entry (wiki-session-start.sh)
- Remove the Stop hook entry (wiki-stop.sh)
- Remove the PostToolUse hook entry for wiki-post-tool.sh

If user said NO to RTK:
- Remove the rtk-rewrite.sh entry from PreToolUse hooks

If user has an existing ~/.claude/settings.json:
- Merge hooks arrays (append new hooks to existing)
- Merge enabledPlugins (union)
- Preserve user's existing env and other settings
- DO NOT overwrite — merge intelligently

#### 3b. Update CLAUDE.md

If user chose a different language:
- Replace the language instruction line

If user said NO to Obsidian:
- Remove the entire "## LLM Wiki — Your Persistent Brain" section
- Remove the `@RTK.md` reference at the top if RTK is also disabled

If user said NO to RTK:
- Remove `@RTK.md` at the top of CLAUDE.md

#### 3c. Update wiki hooks (if Obsidian = YES)

In all three wiki hook files (wiki-session-start.sh, wiki-stop.sh, wiki-post-tool.sh):
- Replace the VAULT line with the user's actual vault path:
```bash
VAULT="<user's vault path>"
```

#### 3d. Set permissions

```bash
chmod +x hooks/*.sh
```

### Step 4: Install (Symlink)

```bash
# Backup existing files
[ -f ~/.claude/CLAUDE.md ] && cp ~/.claude/CLAUDE.md ~/.claude/CLAUDE.md.backup.$(date +%s)
[ -f ~/.claude/settings.json ] && cp ~/.claude/settings.json ~/.claude/settings.json.backup.$(date +%s)

# Create symlinks (or copy if user prefers)
ln -sf "$(pwd)/CLAUDE.md" ~/.claude/CLAUDE.md
ln -sf "$(pwd)/RTK.md" ~/.claude/RTK.md  # only if RTK enabled

# Copy hooks to ~/.claude/hooks/
mkdir -p ~/.claude/hooks
cp hooks/* ~/.claude/hooks/
chmod +x ~/.claude/hooks/*.sh
```

For settings.json: if merged, write the merged result to ~/.claude/settings.json.
If no existing settings, symlink or copy directly.

### Step 5: Verify

Run these checks and report results:

```bash
# Symlinks exist and point correctly
ls -la ~/.claude/CLAUDE.md
ls -la ~/.claude/RTK.md  # if RTK enabled

# Hooks are executable
ls -la ~/.claude/hooks/*.sh

# No placeholders remain
grep -r '<HOME>\|<YOUR_' ~/.claude/CLAUDE.md ~/.claude/hooks/ 2>/dev/null && echo "WARNING: Placeholders remain!" || echo "OK: No placeholders"

# settings.json is valid JSON
node -e "JSON.parse(require('fs').readFileSync('$HOME/.claude/settings.json','utf8')); console.log('OK: Valid JSON')" 2>/dev/null || echo "WARNING: Invalid JSON"
```

### Step 6: Report

Print a summary:

```
Setup complete!

Installed:
- CLAUDE.md → ~/.claude/CLAUDE.md
- settings.json → ~/.claude/settings.json
- hooks/ → ~/.claude/hooks/ (N files)

Enabled features:
- [ ] Obsidian wiki integration
- [ ] RTK token savings
- [ ] Dangerous command blocking
- [ ] Secret file protection
- [ ] Main branch protection

Language: Korean / English / ...

Next steps:
- Restart Claude Code to load new settings
- Run `claude` in any project to verify
```

---

## For Humans (Manual Setup)

If you prefer to set up manually without an AI agent, see the "사용법" section in [README.md](./README.md).
