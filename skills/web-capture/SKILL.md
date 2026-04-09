---
name: web-capture
description: Use when the user asks to capture screenshots, do a deep crawl of all pages, take UI snapshots, compare mobile vs desktop layouts, or capture UI state changes. Triggers: "캡처해줘", "스크린샷", "UI 확인", "전체 캡처", "deep crawl", "UI 상태", "디자인 비교", "모바일 화면 봐줘".
---

# Web Capture

Captures web UI screenshots across devices using Playwright for parallel capture. Falls back to chrome-devtools-mcp for interactive state capture.

## Command Format

```
/web-capture {url} {all | page-name}
```

- `all` — AI-powered deep crawl of every discoverable page
- `page-name` — capture only that specific page (e.g. `dashboard`, `login`)

## Device Presets

| Device | viewport param | UA label |
|--------|---------------|----------|
| Mobile (iPhone 15) | `393x852x3,mobile,touch` | `iphone15` |
| Tablet (iPad) | `820x1180x2,mobile,touch` | `ipad` |
| Desktop | `1920x1080x1` | (default) |
| Desktop Dark | `1920x1080x1` + `colorScheme: dark` | (default) |

## Discovery Flow (all mode)

**Phase 1 — Route Discovery**
- Grep codebase for route definitions, URL patterns, template files
- Navigate to root URL → `take_snapshot` → extract all internal links
- Merge codebase routes + discovered links → initial URL list

**Phase 2 — Deep Crawl Loop** (max depth: 3)
- For each URL: navigate → `take_snapshot` → extract NEW internal links
- New links found → add to list (log: "새로운 페이지 규칙 발견!")
- Run capture.js with discovered URLs for parallel screenshot capture
- Repeat until no new links discovered

**Phase 3 — Interactive State Capture**
- Identify interactive elements from snapshot + codebase analysis
- Forms: fill with sample data → capture filled state
- Buttons/dropdowns: click → capture expanded state
- Modals: trigger → capture open state
- Error states: submit empty form → capture validation errors

**URL Pattern Recognition**
- List page (e.g. `/sessions`) → always check for detail pattern (`/sessions/:id`) → capture one example
- Same for `/targets`, `/users`, any resource list page

## Capture Engine — Playwright Script

Primary capture method. Runs all pages × devices in parallel (~7s for 18 screenshots).

```bash
node ~/.claude/skills/web-capture/scripts/capture.js \
  --url {baseUrl} \
  --output {projectRoot}/.screenshots \
  --pages '/' '/sessions' '/targets' \
  --devices desktop,mobile \
  --interactive '[{"url":"/targets","action":"click","selector":"button:has-text(\"추가\")","name":"targets-modal"}]'
```

Parse the JSON stdout for results. Use chrome-devtools-mcp only for Phase 3 interactive captures that need snapshot-based element discovery.

## Single Page Mode

For single pages, still use the script: `--pages '/just-this-page'`

1. `mkdir -p .screenshots/` in project root
2. `navigate_page` to target URL
3. `emulate` with viewport + UA (never use `resize_page` alone for mobile)
4. `wait_for` selector — use content wrapper for SPAs, not just `body`
5. Dismiss overlays: `document.querySelectorAll('[class*="cookie"],[class*="modal"],[id*="gdpr"]').forEach(e=>e.remove())`
6. `take_screenshot` → `filePath: .screenshots/{domain}_{page}_{device}_{timestamp}.png`
7. Read file to display inline
8. On blank/failed capture → re-navigate and retry once

## Common Mistakes

- `resize_page` for mobile → always use `emulate` with `mobile,touch` + real UA
- No `wait_for` → dynamic content won't render
- `fullPage: true` with sticky navbars → navbar repeats; fix `position` first
- Overlay not dismissed → blocks content; always run the one-liner
- Skipping codebase grep → misses routes not linked from UI

## UA Reference

**iphone15**
```
Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1
```

**ipad**
```
Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1
```
