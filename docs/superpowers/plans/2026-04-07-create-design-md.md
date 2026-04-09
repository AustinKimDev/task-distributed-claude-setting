# create-design-md Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 웹사이트 URL/코드베이스/서비스명에서 디자인 요소를 추출하고, 믹싱 플레이그라운드를 거쳐 9-section DESIGN.md를 자동 생성하는 Claude Code 스킬

**Architecture:** SKILL.md가 입력을 파싱하고 4개 Phase .md 파일로 라우팅. Phase 1은 Chrome DevTools MCP + 헬퍼 스크립트로 CSS 추출, Phase 2는 동적 인터뷰, Phase 3은 Bun HTTP 서버 기반 믹싱 플레이그라운드, Phase 4는 Claude가 DESIGN.md 생성 + generate-preview.ts가 preview.html 생성.

**Tech Stack:** Bun (runtime), Chrome DevTools MCP (CSS 추출), SSE (실시간 갱신)

**Spec:** `docs/superpowers/specs/2026-04-07-create-design-md-design.md`

---

## File Structure

```
~/.claude/skills/create-design-md/
├── SKILL.md                          # 오케스트레이터 — 입력 파싱, Phase 라우팅, state 관리
├── phases/
│   ├── phase1-analyze.md             # Phase 1 — Chrome DevTools MCP로 CSS 추출 가이드
│   ├── phase2-interview.md           # Phase 2 — 동적 인터뷰 프롬프트
│   ├── phase3-mixing.md              # Phase 3 — 플레이그라운드 사용 가이드
│   └── phase4-generate.md            # Phase 4 — DESIGN.md + preview 생성 가이드
├── scripts/
│   ├── resolve-service.ts            # 서비스명 → URL 해석 (독립 CLI)
│   ├── analyze-codebase.ts           # 코드베이스 스캔 → 디자인 파일 탐지 (독립 CLI)
│   ├── generate-preview.ts           # DESIGN.md 파싱 → preview.html 생성 (독립 CLI)
│   ├── playground/
│   │   ├── server.ts                 # Bun HTTP 서버 (SSE + 파일 감시 + 이벤트 수집)
│   │   ├── templates/
│   │   │   ├── frame.html            # 기본 프레임 (헤더, 테마, SSE 클라이언트)
│   │   │   └── helpers.js            # 클라이언트 선택/토글/이벤트 전송
│   │   └── public/
│   │       └── styles.css            # 플레이그라운드 UI 스타일
│   ├── start.sh                      # 플레이그라운드 서버 시작
│   └── stop.sh                       # 플레이그라운드 서버 종료
├── package.json                      # bun dependencies (없음 — zero deps)
└── bunfig.toml                       # bun config
```

**설계 결정: 스크립트 vs 프롬프트 역할 분리**

| 컴포넌트 | 형태 | 이유 |
|----------|------|------|
| CSS 추출 (URL) | phase1-analyze.md (프롬프트) | Chrome DevTools MCP는 Claude 도구 — 스크립트에서 호출 불가 |
| 코드베이스 스캔 | analyze-codebase.ts (스크립트) | 파일시스템 글로빙/파싱은 스크립트가 효율적 |
| 서비스명 해석 | resolve-service.ts (스크립트) | URL 후보 생성 + HTTP 체크는 스크립트가 빠름 |
| 인터뷰 | phase2-interview.md (프롬프트) | 대화형 — Claude가 직접 수행 |
| 플레이그라운드 | server.ts (스크립트) | 웹 서버 — 독립 프로세스 필수 |
| DESIGN.md 생성 | phase4-generate.md (프롬프트) | 산문 생성 — Claude가 직접 수행 |
| preview.html 생성 | generate-preview.ts (스크립트) | DESIGN.md 파싱 + HTML 템플릿 조합 — 결정적 변환 |

---

## Task 1: Project Scaffold

**Files:**
- Create: `~/.claude/skills/create-design-md/package.json`
- Create: `~/.claude/skills/create-design-md/bunfig.toml`

- [ ] **Step 1: 스킬 디렉토리 생성**

```bash
mkdir -p ~/.claude/skills/create-design-md/{phases,scripts/playground/{templates,public}}
```

- [ ] **Step 2: package.json 작성**

```json
{
  "name": "create-design-md",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "resolve": "bun run scripts/resolve-service.ts",
    "analyze:codebase": "bun run scripts/analyze-codebase.ts",
    "preview": "bun run scripts/generate-preview.ts",
    "playground": "bun run scripts/playground/server.ts"
  }
}
```

- [ ] **Step 3: bunfig.toml 작성**

```toml
[run]
bun = true
```

- [ ] **Step 4: 커밋**

```bash
cd ~/.claude/skills/create-design-md
git init
git add package.json bunfig.toml
git commit -m "chore: scaffold create-design-md skill"
```

---

## Task 2: resolve-service.ts

**Files:**
- Create: `~/.claude/skills/create-design-md/scripts/resolve-service.ts`

- [ ] **Step 1: 테스트 케이스 정의 (주석)**

`resolve-service.ts` 상단에 예상 동작을 주석으로 문서화:

```typescript
// resolve-service.ts
// Usage: bun run scripts/resolve-service.ts <service-name>
// 
// Examples:
//   bun run scripts/resolve-service.ts stripe
//   → { "name": "stripe", "url": "https://stripe.com", "brandPages": ["/customers", "/about"] }
//
//   bun run scripts/resolve-service.ts nonexistent
//   → { "name": "nonexistent", "url": null, "error": "No reachable URL found" }
```

- [ ] **Step 2: 구현**

```typescript
const SERVICE_NAME = process.argv[2];

if (!SERVICE_NAME) {
  console.error(JSON.stringify({ error: "Usage: bun run resolve-service.ts <service-name>" }));
  process.exit(1);
}

const TLD_CANDIDATES = [".com", ".io", ".dev", ".app", ".co", ".org", ".net"];
const BRAND_PATHS = ["/ci", "/brand", "/design", "/style-guide", "/design-system", "/about"];

interface ResolveResult {
  name: string;
  url: string | null;
  brandPages: string[];
  error?: string;
}

async function checkUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function findBaseUrl(name: string): Promise<string | null> {
  for (const tld of TLD_CANDIDATES) {
    const url = `https://${name}${tld}`;
    if (await checkUrl(url)) return url;
  }
  return null;
}

async function findBrandPages(baseUrl: string): Promise<string[]> {
  const found: string[] = [];
  const checks = BRAND_PATHS.map(async (path) => {
    const url = `${baseUrl}${path}`;
    if (await checkUrl(url)) found.push(path);
  });
  await Promise.all(checks);
  return found;
}

async function main(): Promise<void> {
  const baseUrl = await findBaseUrl(SERVICE_NAME);

  if (!baseUrl) {
    const result: ResolveResult = {
      name: SERVICE_NAME,
      url: null,
      brandPages: [],
      error: `No reachable URL found for "${SERVICE_NAME}". Tried: ${TLD_CANDIDATES.map(t => `${SERVICE_NAME}${t}`).join(", ")}`,
    };
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  const brandPages = await findBrandPages(baseUrl);

  const result: ResolveResult = {
    name: SERVICE_NAME,
    url: baseUrl,
    brandPages,
  };
  console.log(JSON.stringify(result, null, 2));
}

main();
```

- [ ] **Step 3: 수동 테스트**

```bash
cd ~/.claude/skills/create-design-md
bun run scripts/resolve-service.ts stripe
# Expected: { "name": "stripe", "url": "https://stripe.com", "brandPages": [...] }

bun run scripts/resolve-service.ts xyznonexistent123
# Expected: { "name": "xyznonexistent123", "url": null, "error": "..." }
```

- [ ] **Step 4: 커밋**

```bash
git add scripts/resolve-service.ts
git commit -m "feat: add resolve-service.ts for service name → URL resolution"
```

---

## Task 3: analyze-codebase.ts

**Files:**
- Create: `~/.claude/skills/create-design-md/scripts/analyze-codebase.ts`

- [ ] **Step 1: 구현**

```typescript
// analyze-codebase.ts
// Usage: bun run scripts/analyze-codebase.ts [project-root]
// Scans project for design-related files and outputs structured JSON report.
// Claude uses this output to build the source analysis markdown.

import { $ } from "bun";
import { existsSync } from "fs";
import { join, resolve } from "path";

const PROJECT_ROOT = resolve(process.argv[2] || ".");

interface CodebaseReport {
  projectRoot: string;
  stack: StackInfo;
  designFiles: DesignFileGroup[];
  existingDesignDocs: string[];
  summary: string;
}

interface StackInfo {
  detected: string[];
  packageManager: string | null;
  frameworks: string[];
}

interface DesignFileGroup {
  category: string;
  files: { path: string; type: string; preview: string }[];
}

// Stack detection markers
const STACK_MARKERS: Record<string, string[]> = {
  "package.json": ["node"],
  "Podfile": ["ios"],
  "build.gradle": ["android"],
  "build.gradle.kts": ["android"],
  "requirements.txt": ["python"],
  "pyproject.toml": ["python"],
  "Cargo.toml": ["rust"],
  "go.mod": ["go"],
  "Gemfile": ["ruby"],
  "pubspec.yaml": ["flutter"],
};

// Framework detection in package.json
const FRAMEWORK_DEPS: Record<string, string> = {
  next: "Next.js",
  react: "React",
  vue: "Vue",
  svelte: "Svelte",
  "@angular/core": "Angular",
  "tailwindcss": "Tailwind CSS",
  "styled-components": "styled-components",
  "@emotion/react": "Emotion",
  "sass": "SCSS",
};

// Design file patterns
const DESIGN_PATTERNS: { category: string; globs: string[]; type: string }[] = [
  { category: "CSS Variables", globs: ["**/*.css"], type: "css" },
  { category: "SCSS Variables", globs: ["**/*.scss", "**/*.sass"], type: "scss" },
  { category: "Tailwind Config", globs: ["tailwind.config.*"], type: "tailwind" },
  { category: "Design Tokens", globs: ["**/tokens.json", "**/tokens.yaml", "**/tokens.yml", "**/design-tokens.*"], type: "tokens" },
  { category: "Theme Files", globs: ["**/theme.ts", "**/theme.js", "**/theme.tsx", "**/colors.swift", "**/Colors.kt", "**/Theme.kt"], type: "theme" },
  { category: "Design Docs", globs: ["DESIGN.md", "**/DESIGN.md", "**/style-guide.*", "**/design-system.*"], type: "docs" },
];

async function detectStack(): Promise<StackInfo> {
  const detected: string[] = [];
  const frameworks: string[] = [];
  let packageManager: string | null = null;

  for (const [file, stacks] of Object.entries(STACK_MARKERS)) {
    if (existsSync(join(PROJECT_ROOT, file))) {
      detected.push(...stacks);
    }
  }

  // Check package.json for frameworks
  const pkgPath = join(PROJECT_ROOT, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = await Bun.file(pkgPath).json();
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      for (const [dep, framework] of Object.entries(FRAMEWORK_DEPS)) {
        if (dep in allDeps) frameworks.push(framework);
      }
      // Package manager detection
      if (existsSync(join(PROJECT_ROOT, "bun.lockb"))) packageManager = "bun";
      else if (existsSync(join(PROJECT_ROOT, "pnpm-lock.yaml"))) packageManager = "pnpm";
      else if (existsSync(join(PROJECT_ROOT, "yarn.lock"))) packageManager = "yarn";
      else if (existsSync(join(PROJECT_ROOT, "package-lock.json"))) packageManager = "npm";
    } catch { /* ignore parse errors */ }
  }

  return { detected: [...new Set(detected)], packageManager, frameworks };
}

async function findDesignFiles(): Promise<{ groups: DesignFileGroup[]; docs: string[] }> {
  const groups: DesignFileGroup[] = [];
  const docs: string[] = [];

  for (const pattern of DESIGN_PATTERNS) {
    const files: { path: string; type: string; preview: string }[] = [];

    for (const glob of pattern.globs) {
      try {
        const result = await $`find ${PROJECT_ROOT} -path "*/node_modules" -prune -o -path "*/.git" -prune -o -name "${glob.replace("**/", "")}" -print`.text();
        const paths = result.trim().split("\n").filter(Boolean);

        for (const filePath of paths.slice(0, 10)) {
          // Read first 20 lines as preview
          try {
            const content = await Bun.file(filePath).text();
            const preview = content.split("\n").slice(0, 20).join("\n");

            if (pattern.type === "docs") {
              docs.push(filePath);
            }

            // Only include CSS/SCSS files that contain variables or design tokens
            if (pattern.type === "css" || pattern.type === "scss") {
              if (!content.match(/--[\w-]+\s*:|^\$[\w-]+\s*:/m)) continue;
            }

            files.push({
              path: filePath.replace(PROJECT_ROOT, "."),
              type: pattern.type,
              preview: preview.length > 500 ? preview.slice(0, 500) + "..." : preview,
            });
          } catch { /* skip unreadable files */ }
        }
      } catch { /* glob failed */ }
    }

    if (files.length > 0) {
      groups.push({ category: pattern.category, files });
    }
  }

  return { groups, docs };
}

async function main(): Promise<void> {
  const stack = await detectStack();
  const { groups, docs } = await findDesignFiles();

  const report: CodebaseReport = {
    projectRoot: PROJECT_ROOT,
    stack,
    designFiles: groups,
    existingDesignDocs: docs.map(d => d.replace(PROJECT_ROOT, ".")),
    summary: [
      `Stack: ${stack.detected.join(", ") || "unknown"}`,
      `Frameworks: ${stack.frameworks.join(", ") || "none"}`,
      `Package Manager: ${stack.packageManager || "unknown"}`,
      `Design files found: ${groups.reduce((sum, g) => sum + g.files.length, 0)}`,
      `Existing design docs: ${docs.length}`,
    ].join("\n"),
  };

  console.log(JSON.stringify(report, null, 2));
}

main();
```

- [ ] **Step 2: 현재 프로젝트에서 수동 테스트**

```bash
cd ~/.claude/skills/create-design-md
bun run scripts/analyze-codebase.ts /path/to/project
# Expected: JSON with stack info, design file groups
```

- [ ] **Step 3: 커밋**

```bash
git add scripts/analyze-codebase.ts
git commit -m "feat: add analyze-codebase.ts for design file discovery"
```

---

## Task 4: Playground Server

**Files:**
- Create: `scripts/playground/server.ts`
- Create: `scripts/playground/templates/frame.html`
- Create: `scripts/playground/templates/helpers.js`
- Create: `scripts/playground/public/styles.css`
- Create: `scripts/start.sh`
- Create: `scripts/stop.sh`

- [ ] **Step 1: server.ts 구현**

```typescript
// playground/server.ts
// Bun HTTP server for the mixing playground.
// Watches a content directory for HTML files, serves newest, pushes SSE updates.
// Records user click events to events.jsonl.

import { watch } from "fs";
import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import { join, resolve } from "path";
import { existsSync } from "fs";

const args = parseArgs();
const CONTENT_DIR = resolve(args.contentDir);
const STATE_DIR = resolve(args.stateDir);
const PORT = args.port;
const SKILL_DIR = import.meta.dir.replace("/playground", "/..");

// Ensure directories exist
await mkdir(CONTENT_DIR, { recursive: true });
await mkdir(STATE_DIR, { recursive: true });

// Load templates
const FRAME_TEMPLATE = await Bun.file(join(import.meta.dir, "templates/frame.html")).text();
const HELPERS_JS = await Bun.file(join(import.meta.dir, "templates/helpers.js")).text();
const STYLES_CSS = await Bun.file(join(import.meta.dir, "public/styles.css")).text();

// SSE connections
const sseClients: Set<ReadableStreamDefaultController> = new Set();

// File watcher
let latestFile = "";
watch(CONTENT_DIR, async (event, filename) => {
  if (!filename?.endsWith(".html")) return;
  latestFile = await getNewestHtmlFile();
  // Clear events on new screen
  const eventsPath = join(STATE_DIR, "events.jsonl");
  if (existsSync(eventsPath)) await writeFile(eventsPath, "");
  // Notify SSE clients
  for (const controller of sseClients) {
    try {
      controller.enqueue(`data: ${JSON.stringify({ type: "reload" })}\n\n`);
    } catch {
      sseClients.delete(controller);
    }
  }
});

async function getNewestHtmlFile(): Promise<string> {
  const files = await readdir(CONTENT_DIR);
  const htmlFiles = files.filter(f => f.endsWith(".html"));
  if (htmlFiles.length === 0) return "";

  let newest = htmlFiles[0];
  let newestMtime = 0;
  for (const file of htmlFiles) {
    const stat = Bun.file(join(CONTENT_DIR, file));
    const mtime = stat.lastModified;
    if (mtime > newestMtime) {
      newestMtime = mtime;
      newest = file;
    }
  }
  return newest;
}

function wrapInFrame(content: string): string {
  // If content is a full document, inject helpers only
  if (content.trimStart().startsWith("<!DOCTYPE") || content.trimStart().startsWith("<html")) {
    return content.replace("</body>", `<script>${HELPERS_JS}</script></body>`);
  }
  // Otherwise wrap in frame template
  return FRAME_TEMPLATE
    .replace("{{CONTENT}}", content)
    .replace("{{STYLES}}", STYLES_CSS)
    .replace("{{HELPERS}}", HELPERS_JS);
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // SSE endpoint
    if (url.pathname === "/events") {
      const stream = new ReadableStream({
        start(controller) {
          sseClients.add(controller);
          controller.enqueue(`data: ${JSON.stringify({ type: "connected" })}\n\n`);
        },
        cancel(controller) {
          sseClients.delete(controller);
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Record click events
    if (url.pathname === "/record" && req.method === "POST") {
      const body = await req.json();
      const eventsPath = join(STATE_DIR, "events.jsonl");
      const line = JSON.stringify({ ...body, timestamp: Date.now() }) + "\n";
      await Bun.write(eventsPath, (existsSync(eventsPath) ? await Bun.file(eventsPath).text() : "") + line);
      return new Response("ok");
    }

    // Serve styles
    if (url.pathname === "/styles.css") {
      return new Response(STYLES_CSS, { headers: { "Content-Type": "text/css" } });
    }

    // Serve latest content
    if (!latestFile) latestFile = await getNewestHtmlFile();
    if (!latestFile) {
      return new Response(wrapInFrame(`
        <div style="display:flex;align-items:center;justify-content:center;min-height:60vh">
          <p style="color:#888;font-size:18px;">Waiting for content...</p>
        </div>
      `), { headers: { "Content-Type": "text/html" } });
    }

    const content = await readFile(join(CONTENT_DIR, latestFile), "utf-8");
    return new Response(wrapInFrame(content), { headers: { "Content-Type": "text/html" } });
  },
});

// Write server info
const serverInfo = {
  type: "server-started",
  port: server.port,
  url: `http://localhost:${server.port}`,
  contentDir: CONTENT_DIR,
  stateDir: STATE_DIR,
};
await writeFile(join(STATE_DIR, "server-info.json"), JSON.stringify(serverInfo, null, 2));
console.log(JSON.stringify(serverInfo));

function parseArgs() {
  const args = process.argv.slice(2);
  let contentDir = "";
  let stateDir = "";
  let port = 0;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--content-dir" && args[i + 1]) contentDir = args[++i];
    else if (args[i] === "--state-dir" && args[i + 1]) stateDir = args[++i];
    else if (args[i] === "--port" && args[i + 1]) port = parseInt(args[++i]);
  }

  if (!contentDir || !stateDir) {
    console.error("Usage: bun run server.ts --content-dir <path> --state-dir <path> [--port <num>]");
    process.exit(1);
  }

  return { contentDir, stateDir, port };
}
```

- [ ] **Step 2: frame.html 템플릿 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DESIGN.md Mixing Playground</title>
  <style>
    {{STYLES}}
  </style>
</head>
<body>
  <header class="pg-header">
    <h1>DESIGN.md Mixer</h1>
    <div id="pg-indicator" class="pg-indicator"></div>
  </header>
  <main class="pg-main">
    {{CONTENT}}
  </main>
  <script>
    {{HELPERS}}
  </script>
</body>
</html>
```

- [ ] **Step 3: helpers.js 클라이언트 스크립트 작성**

```javascript
// helpers.js — Client-side selection, toggling, SSE, and event recording

(function() {
  // SSE connection for live reload
  const evtSource = new EventSource("/events");
  evtSource.onmessage = function(e) {
    const data = JSON.parse(e.data);
    if (data.type === "reload") {
      window.location.reload();
    }
  };

  // Selection state
  const selections = {};

  // Toggle selection on option click
  window.toggleSelect = function(el) {
    const parent = el.closest("[data-multiselect], .options, .cards");
    const isMulti = parent?.hasAttribute("data-multiselect");
    const choice = el.dataset.choice;
    const category = el.closest("[data-category]")?.dataset.category || "default";

    if (!isMulti) {
      // Single select — deselect others in same group
      parent?.querySelectorAll(".option, .card").forEach(opt => opt.classList.remove("selected"));
    }

    el.classList.toggle("selected");
    const isSelected = el.classList.contains("selected");

    // Update indicator
    updateIndicator();

    // Record event
    fetch("/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "click",
        choice: choice,
        category: category,
        selected: isSelected,
        text: el.querySelector("h3, .content h3")?.textContent || choice,
      }),
    });
  };

  // "Selection complete" button
  window.completeSelection = function() {
    const allSelected = document.querySelectorAll(".selected");
    const summary = {};
    allSelected.forEach(el => {
      const category = el.closest("[data-category]")?.dataset.category || "default";
      if (!summary[category]) summary[category] = [];
      summary[category].push(el.dataset.choice);
    });

    fetch("/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "complete", selections: summary }),
    });

    document.getElementById("pg-indicator").textContent = "Selection saved. Return to terminal.";
    document.getElementById("pg-indicator").classList.add("pg-done");
  };

  function updateIndicator() {
    const count = document.querySelectorAll(".selected").length;
    const indicator = document.getElementById("pg-indicator");
    if (indicator) {
      indicator.textContent = count > 0 ? `${count} selected` : "";
    }
  }
})();
```

- [ ] **Step 4: styles.css 작성**

```css
/* Playground UI styles */
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #0a0a0a;
  color: #e0e0e0;
  line-height: 1.6;
}

.pg-header {
  position: sticky; top: 0; z-index: 100;
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 24px;
  background: #141414;
  border-bottom: 1px solid #2a2a2a;
}

.pg-header h1 {
  font-size: 16px; font-weight: 600; color: #fff;
}

.pg-indicator {
  font-size: 13px; color: #888;
  transition: color 0.2s;
}

.pg-indicator.pg-done { color: #4ade80; font-weight: 600; }

.pg-main { max-width: 960px; margin: 0 auto; padding: 32px 24px; }

/* Tabs */
.tabs {
  display: flex; gap: 4px;
  border-bottom: 1px solid #2a2a2a;
  margin-bottom: 24px;
  overflow-x: auto;
}

.tab {
  padding: 8px 16px;
  font-size: 14px; font-weight: 500;
  color: #888; cursor: pointer;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
  transition: color 0.2s, border-color 0.2s;
}

.tab:hover { color: #ccc; }
.tab.active { color: #fff; border-bottom-color: #3b82f6; }

/* Tab content */
.tab-content { display: none; }
.tab-content.active { display: block; }

/* Options (A/B/C selections) */
.options { display: flex; flex-direction: column; gap: 12px; }

.option {
  display: flex; gap: 16px; align-items: flex-start;
  padding: 16px; border-radius: 12px;
  background: #1a1a1a; border: 1px solid #2a2a2a;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.option:hover { border-color: #444; background: #1e1e1e; }
.option.selected { border-color: #3b82f6; background: #1a1a2e; }

.option .letter {
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 8px; background: #2a2a2a;
  font-size: 14px; font-weight: 700; color: #888;
  flex-shrink: 0;
}

.option.selected .letter { background: #3b82f6; color: #fff; }

.option .content h3 { font-size: 15px; font-weight: 600; color: #fff; margin-bottom: 4px; }
.option .content p { font-size: 13px; color: #999; }

/* Preview boxes */
.preview-box {
  margin-top: 12px; padding: 16px;
  border-radius: 8px; background: #111;
  border: 1px solid #222;
}

/* Cards layout */
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }

.card {
  border-radius: 12px; background: #1a1a1a;
  border: 1px solid #2a2a2a; overflow: hidden;
  cursor: pointer; transition: border-color 0.2s;
}

.card:hover { border-color: #444; }
.card.selected { border-color: #3b82f6; }
.card-image { padding: 16px; background: #111; min-height: 120px; }
.card-body { padding: 16px; }
.card-body h3 { font-size: 15px; font-weight: 600; color: #fff; margin-bottom: 4px; }
.card-body p { font-size: 13px; color: #999; }

/* Responsive preview toggle */
.responsive-toggle {
  display: flex; gap: 8px; margin-top: 12px;
}

.responsive-toggle button {
  padding: 4px 12px; font-size: 12px;
  border-radius: 6px; border: 1px solid #333;
  background: #1a1a1a; color: #888;
  cursor: pointer;
}

.responsive-toggle button.active { background: #3b82f6; color: #fff; border-color: #3b82f6; }

/* Complete button */
.complete-btn {
  display: block; width: 100%;
  margin-top: 32px; padding: 14px;
  font-size: 16px; font-weight: 600;
  border-radius: 12px; border: none;
  background: #3b82f6; color: #fff;
  cursor: pointer;
  transition: background 0.2s;
}

.complete-btn:hover { background: #2563eb; }
.complete-btn:disabled { background: #333; color: #666; cursor: not-allowed; }

/* Subtitle */
.subtitle { font-size: 14px; color: #888; margin-bottom: 24px; }

h2 { font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 8px; }

/* Split view */
.split { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 640px) { .split { grid-template-columns: 1fr; } }
```

- [ ] **Step 5: start.sh 작성**

```bash
#!/bin/bash
# start.sh — Start the mixing playground server
# Usage: start.sh <project-dir>

set -e

PROJECT_DIR="${1:-.}"
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SESSION_ID="$$-$(date +%s)"
PLAYGROUND_DIR="${PROJECT_DIR}/.create-design-md/playground"
CONTENT_DIR="${PLAYGROUND_DIR}/${SESSION_ID}/content"
STATE_DIR="${PLAYGROUND_DIR}/${SESSION_ID}/state"

mkdir -p "$CONTENT_DIR" "$STATE_DIR"

# Find available port
PORT=0

# Start server in background
cd "$SKILL_DIR"
nohup bun run scripts/playground/server.ts \
  --content-dir "$CONTENT_DIR" \
  --state-dir "$STATE_DIR" \
  --port "$PORT" \
  > "$STATE_DIR/server.log" 2>&1 &

SERVER_PID=$!
echo "$SERVER_PID" > "$STATE_DIR/server.pid"

# Wait for server-info.json
for i in $(seq 1 10); do
  if [ -f "$STATE_DIR/server-info.json" ]; then
    cat "$STATE_DIR/server-info.json"
    exit 0
  fi
  sleep 0.5
done

echo '{"error": "Server failed to start within 5 seconds"}'
exit 1
```

- [ ] **Step 6: stop.sh 작성**

```bash
#!/bin/bash
# stop.sh — Stop the playground server
# Usage: stop.sh <state-dir>

set -e

STATE_DIR="$1"

if [ -z "$STATE_DIR" ]; then
  echo "Usage: stop.sh <state-dir>"
  exit 1
fi

PID_FILE="$STATE_DIR/server.pid"

if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID"
    echo '{"type": "server-stopped", "pid": '"$PID"'}'
  else
    echo '{"type": "server-already-stopped"}'
  fi
  rm -f "$PID_FILE"
else
  echo '{"type": "no-server-found"}'
fi

touch "$STATE_DIR/server-stopped"
```

- [ ] **Step 7: 실행 권한 부여 + 수동 테스트**

```bash
chmod +x scripts/start.sh scripts/stop.sh

# 테스트 시작
scripts/start.sh /tmp/test-playground
# Expected: {"type":"server-started","port":XXXXX,"url":"http://localhost:XXXXX",...}

# 테스트 정지 (STATE_DIR은 start.sh 출력에서 확인)
scripts/stop.sh /tmp/test-playground/.create-design-md/playground/*/state
```

- [ ] **Step 8: 커밋**

```bash
git add scripts/playground/ scripts/start.sh scripts/stop.sh
git commit -m "feat: add mixing playground server with SSE and event recording"
```

---

## Task 5: generate-preview.ts

**Files:**
- Create: `scripts/generate-preview.ts`

- [ ] **Step 1: 구현**

```typescript
// generate-preview.ts
// Usage: bun run scripts/generate-preview.ts <design-md-path> [--dark]
// Parses DESIGN.md and generates preview.html with component catalog.

import { readFile, writeFile } from "fs/promises";
import { resolve, dirname, join } from "path";

const DESIGN_MD_PATH = resolve(process.argv[2] || "DESIGN.md");
const GENERATE_DARK = process.argv.includes("--dark");
const OUTPUT_DIR = dirname(DESIGN_MD_PATH);

interface ParsedDesign {
  colors: { name: string; hex: string; role: string }[];
  typography: { role: string; font: string; size: string; weight: string; lineHeight: string }[];
  components: { type: string; styles: string }[];
  shadows: { level: string; treatment: string; use: string }[];
  borderRadius: string[];
}

function parseDesignMd(content: string): ParsedDesign {
  const colors: ParsedDesign["colors"] = [];
  const typography: ParsedDesign["typography"] = [];
  const shadows: ParsedDesign["shadows"] = [];

  // Extract colors: **Name** (`#hex`): description
  const colorRegex = /\*\*(.+?)\*\*\s*\(`(#[0-9a-fA-F]{3,8})`\):\s*(.+)/g;
  let match;
  while ((match = colorRegex.exec(content)) !== null) {
    colors.push({ name: match[1], hex: match[2], role: match[3].trim() });
  }

  // Extract typography from hierarchy table
  const typoTableRegex = /\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|/g;
  let inTypoSection = false;
  for (const line of content.split("\n")) {
    if (line.includes("Hierarchy") || line.includes("hierarchy")) inTypoSection = true;
    if (inTypoSection && line.startsWith("|") && !line.includes("---") && !line.includes("Role")) {
      const cols = line.split("|").map(c => c.trim()).filter(Boolean);
      if (cols.length >= 5) {
        typography.push({
          role: cols[0],
          font: cols[1],
          size: cols[2],
          weight: cols[3],
          lineHeight: cols[4],
        });
      }
    }
    if (inTypoSection && line.startsWith("##") && !line.includes("Hierarchy")) inTypoSection = false;
  }

  // Extract shadow levels from elevation table
  const shadowTableRegex = /\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|/g;
  let inShadowSection = false;
  for (const line of content.split("\n")) {
    if (line.includes("Depth") || line.includes("Elevation")) inShadowSection = true;
    if (inShadowSection && line.startsWith("|") && !line.includes("---") && !line.includes("Level")) {
      const cols = line.split("|").map(c => c.trim()).filter(Boolean);
      if (cols.length >= 3) {
        shadows.push({ level: cols[0], treatment: cols[1], use: cols[2] });
      }
    }
    if (inShadowSection && line.startsWith("##") && !line.includes("Depth") && !line.includes("Elevation")) inShadowSection = false;
  }

  return { colors, typography, components: [], shadows, borderRadius: [] };
}

function generateHtml(design: ParsedDesign, isDark: boolean): string {
  const bg = isDark ? "#0a0a0a" : "#ffffff";
  const fg = isDark ? "#e0e0e0" : "#1a1a1a";
  const cardBg = isDark ? "#1a1a1a" : "#f5f5f5";
  const border = isDark ? "#2a2a2a" : "#e0e0e0";

  const colorSwatches = design.colors.map(c => `
    <div class="swatch">
      <div class="swatch-color" style="background:${c.hex}"></div>
      <div class="swatch-info">
        <strong>${c.name}</strong>
        <code>${c.hex}</code>
        <small>${c.role.slice(0, 60)}</small>
      </div>
    </div>
  `).join("");

  const typoSamples = design.typography.slice(0, 8).map(t => `
    <div class="typo-sample" style="font-size:${t.size};font-weight:${t.weight};line-height:${t.lineHeight}">
      ${t.role} — The quick brown fox
    </div>
  `).join("");

  const shadowSamples = design.shadows.map(s => `
    <div class="shadow-sample" style="box-shadow:${s.treatment.replace(/`/g, "")}">
      <strong>${s.level}</strong>
      <small>${s.use}</small>
    </div>
  `).join("");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DESIGN.md Preview${isDark ? " (Dark)" : ""}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, sans-serif; background: ${bg}; color: ${fg}; padding: 32px; }
    h1 { font-size: 28px; margin-bottom: 8px; }
    h2 { font-size: 20px; margin: 32px 0 16px; padding-bottom: 8px; border-bottom: 1px solid ${border}; }
    .subtitle { color: #888; margin-bottom: 32px; }

    .swatches { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
    .swatch { display: flex; gap: 12px; align-items: center; padding: 8px; border-radius: 8px; background: ${cardBg}; }
    .swatch-color { width: 48px; height: 48px; border-radius: 8px; border: 1px solid ${border}; flex-shrink: 0; }
    .swatch-info { display: flex; flex-direction: column; gap: 2px; }
    .swatch-info strong { font-size: 13px; }
    .swatch-info code { font-size: 12px; color: #888; }
    .swatch-info small { font-size: 11px; color: #aaa; }

    .typo-samples { display: flex; flex-direction: column; gap: 16px; }
    .typo-sample { padding: 12px; border-radius: 8px; background: ${cardBg}; }

    .shadow-samples { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
    .shadow-sample { padding: 24px 16px; border-radius: 12px; background: ${cardBg}; text-align: center; }
    .shadow-sample strong { display: block; margin-bottom: 4px; font-size: 13px; }
    .shadow-sample small { font-size: 11px; color: #888; }

    .components { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .component-card { padding: 24px; border-radius: 12px; background: ${cardBg}; border: 1px solid ${border}; }
  </style>
</head>
<body>
  <h1>Design System Preview</h1>
  <p class="subtitle">Auto-generated from DESIGN.md${isDark ? " — Dark Mode" : ""}</p>

  <h2>Color Palette (${design.colors.length} colors)</h2>
  <div class="swatches">${colorSwatches}</div>

  <h2>Typography Hierarchy</h2>
  <div class="typo-samples">${typoSamples}</div>

  <h2>Elevation & Shadows</h2>
  <div class="shadow-samples">${shadowSamples}</div>
</body>
</html>`;
}

async function main() {
  const content = await readFile(DESIGN_MD_PATH, "utf-8");
  const design = parseDesignMd(content);

  // Generate light preview
  const lightHtml = generateHtml(design, false);
  await writeFile(join(OUTPUT_DIR, "preview.html"), lightHtml);
  console.log(`preview.html generated (${design.colors.length} colors, ${design.typography.length} type levels)`);

  // Generate dark preview if requested
  if (GENERATE_DARK) {
    const darkHtml = generateHtml(design, true);
    await writeFile(join(OUTPUT_DIR, "preview-dark.html"), darkHtml);
    console.log("preview-dark.html generated");
  }
}

main();
```

- [ ] **Step 2: 기존 DESIGN.md로 테스트**

awesome-design-md에서 가져온 Claude DESIGN.md로 테스트:

```bash
# 테스트 DESIGN.md 가져오기
curl -o /tmp/test-DESIGN.md https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/claude/DESIGN.md

# preview 생성
bun run scripts/generate-preview.ts /tmp/test-DESIGN.md --dark
# Expected: preview.html, preview-dark.html in /tmp/
```

- [ ] **Step 3: 커밋**

```bash
git add scripts/generate-preview.ts
git commit -m "feat: add generate-preview.ts for DESIGN.md → preview.html"
```

---

## Task 6: Phase 1 — phase1-analyze.md

**Files:**
- Create: `phases/phase1-analyze.md`

- [ ] **Step 1: 프롬프트 작성**

```markdown
# Phase 1: Analysis

소스별 디자인 요소를 추출하고 분석 보고서를 생성합니다.

## 작업 디렉토리 준비

```bash
mkdir -p .create-design-md/analyze
```

## URL 소스 분석

URL 소스가 있으면 Chrome DevTools MCP를 사용해 CSS를 추출합니다.

### Step 1: 페이지 목록 결정

우선순위:
1. 사용자가 URL 목록 직접 지정했으면 그대로 사용
2. 아니면 CI/브랜드 페이지 자동 탐지 — 아래 경로를 `navigate_page`로 시도:
   - `{base}/ci`, `{base}/brand`, `{base}/design`, `{base}/style-guide`, `{base}/about`
3. 없으면 메인 페이지의 nav 링크에서 주요 하위 페이지 (최대 5개)
4. 최소 메인 페이지는 항상 포함

### Step 2: 각 페이지에서 CSS 추출

각 페이지마다 아래 순서로 `evaluate_script`를 실행합니다.

**2-1. CSS 변수 수집:**
```javascript
(() => {
  const vars = {};
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule.type === 1 && rule.selectorText === ':root') {
          for (const prop of rule.style) {
            if (prop.startsWith('--')) vars[prop] = rule.style.getPropertyValue(prop).trim();
          }
        }
      }
    } catch(e) {} // cross-origin sheets
  }
  return JSON.stringify(vars);
})()
```

**2-2. 주요 요소 Computed Styles 수집:**
```javascript
(() => {
  const selectors = {
    headings: 'h1, h2, h3, h4, h5, h6',
    body: 'p, span, li',
    buttons: 'button, a.btn, [class*="button"], [class*="btn"]',
    links: 'a',
    cards: '[class*="card"], [class*="Card"]',
    inputs: 'input, textarea, select',
    nav: 'nav, [class*="nav"], header',
  };
  const props = ['color','background-color','font-family','font-size','font-weight',
    'line-height','letter-spacing','padding','margin','border-radius','box-shadow',
    'border','transition','animation','background-image','opacity'];
  const results = {};
  for (const [name, sel] of Object.entries(selectors)) {
    const els = document.querySelectorAll(sel);
    results[name] = [];
    els.forEach((el, i) => {
      if (i >= 5) return; // 카테고리당 최대 5개
      const cs = getComputedStyle(el);
      const styles = {};
      for (const p of props) styles[p] = cs.getPropertyValue(p);
      styles._tag = el.tagName;
      styles._class = el.className?.toString().slice(0, 100) || '';
      styles._text = el.textContent?.trim().slice(0, 50) || '';
      results[name].push(styles);
    });
  }
  return JSON.stringify(results);
})()
```

**2-3. 외부 스타일시트 URL 추출:**
```javascript
(() => {
  const urls = [];
  document.querySelectorAll('link[rel="stylesheet"]').forEach(l => urls.push(l.href));
  return JSON.stringify(urls);
})()
```

**2-4. 메타 정보:**
```javascript
(() => {
  return JSON.stringify({
    themeColor: document.querySelector('meta[name="theme-color"]')?.content,
    ogImage: document.querySelector('meta[property="og:image"]')?.content,
    title: document.title,
    favicon: document.querySelector('link[rel="icon"]')?.href,
  });
})()
```

### Step 3: 외부 스타일시트 파싱

추출된 스타일시트 URL에 대해 WebFetch로 원본 CSS를 가져오고, CSS 변수와 미디어 쿼리 브레이크포인트를 추출합니다.

### Step 4: 진행률 출력

각 페이지 분석 시:
```
[1/N] {url} — 분석 중...
[1/N] {url} — 완료 (색상 X개, 폰트 X개, 컴포넌트 X개)
```

## 코드베이스 소스 분석

코드베이스 소스가 있으면 analyze-codebase.ts를 실행합니다:

```bash
bun run ~/.claude/skills/create-design-md/scripts/analyze-codebase.ts {project-root}
```

출력 JSON을 기반으로 발견된 디자인 파일들을 Read로 읽고 분석합니다.

## 서비스명 소스 분석

서비스명 소스가 있으면 resolve-service.ts를 실행합니다:

```bash
bun run ~/.claude/skills/create-design-md/scripts/resolve-service.ts {service-name}
```

해석된 URL로 위의 URL 소스 분석 절차를 진행합니다.

## 기존 DESIGN.md 분석

프로젝트 루트에 DESIGN.md가 이미 존재하면:
1. Read로 내용을 읽습니다
2. 9-section 구조를 파싱합니다
3. 색상/폰트/spacing 등 토큰을 추출합니다
4. `.create-design-md/analyze/source-existing-design.md`에 저장합니다

## 분석 보고서 작성

각 소스별로 `.create-design-md/analyze/source-{name}.md`에 보고서를 작성합니다.

보고서 구조:
```
# Source: {name}

## Colors (N개 발견)
### Primary
- **{Name}** (`{hex}`): {role}
### Secondary & Accent
### Neutral Scale
### Surface & Background
### Gradients

## Typography (폰트 N개, 계층 N단계)
### Font Families
### Hierarchy Table
| Role | Font | Size | Weight | Line Height | Letter Spacing |

## Components
### Buttons
### Cards
### Inputs
### Navigation

## Layout & Spacing
## Shadows & Elevation
## Responsive (브레이크포인트)
## Motion & Animation
## Icons & Images
## Raw Data
```

## 요약 보고서 작성

모든 소스 분석이 끝나면 `.create-design-md/summary.md`에 전체 요약을 작성합니다:
- 각 소스의 핵심 특징
- 소스 간 공통점
- 소스 간 차이점/충돌점
- 카테고리별 소스 매핑 추천

## State 업데이트

```json
{ "phase1": "completed", "currentPhase": 2 }
```

`.create-design-md/state.json`을 업데이트합니다.
```

- [ ] **Step 2: 커밋**

```bash
git add phases/phase1-analyze.md
git commit -m "feat: add phase1-analyze.md with Chrome DevTools MCP extraction guide"
```

---

## Task 7: Phase 2 — phase2-interview.md

**Files:**
- Create: `phases/phase2-interview.md`

- [ ] **Step 1: 프롬프트 작성**

```markdown
# Phase 2: Goal Setting (Dynamic Interview)

Phase 1 분석 결과를 기반으로 사용자에게 디자인 목표를 확인합니다.

## 사전 준비

1. `.create-design-md/summary.md`를 Read로 읽습니다
2. 각 소스 분석 파일도 필요하면 참조합니다

## 기본 질문 (필수 4개 — 항상 진행)

감지 여부와 무관하게 항상 질문합니다.
감지된 값이 있으면 기본값으로 제시 + 최소 3개 대안을 보여줍니다.
한 질문씩 순서대로 진행합니다.

### Q1: 반응형

감지된 브레이크포인트가 있으면:
```
반응형 브레이크포인트를 선택해주세요:
 A) 감지된 값 그대로 [{detected}]px
 B) Tailwind 기본 [640, 768, 1024, 1280, 1536]px
 C) Bootstrap 기본 [576, 768, 992, 1200, 1400]px
 D) 모바일 퍼스트 심플 [768, 1024]px
 E) 직접 입력
```

감지 안 된 경우:
```
반응형을 지원할까요? 지원한다면 브레이크포인트는:
 A) Tailwind 기본 [640, 768, 1024, 1280, 1536]px
 B) Bootstrap 기본 [576, 768, 992, 1200, 1400]px
 C) 모바일 퍼스트 심플 [768, 1024]px
 D) 반응형 미지원
 E) 직접 입력
```

### Q2: 다크모드

```
다크모드 전략을 선택해주세요:
 A) 시스템 설정 연동 (prefers-color-scheme)
 B) 사용자 토글 (localStorage 저장)
 C) 시스템 연동 + 수동 오버라이드
 D) 다크모드 미지원
 E) 기타
```

다크모드 CSS가 감지됐으면 감지 사실을 언급하고 A를 기본 추천합니다.

### Q3: 타겟 플랫폼

```
타겟 플랫폼을 선택해주세요:
 A) 웹 전용
 B) 웹 + iOS (SwiftUI)
 C) 웹 + Android (Compose)
 D) 웹 + iOS + Android
 E) 기타
```

코드베이스 분석에서 iOS/Android가 감지됐으면 해당 옵션을 기본 추천합니다.

### Q4: 주요 컴포넌트

```
DESIGN.md에 포함할 컴포넌트를 선택해주세요 (복수 선택):
 A) 기본 세트 (버튼, 카드, 인풋, 네비게이션) — 감지 기반
 B) A + 데이터 (테이블, 차트, 배지)
 C) A + 오버레이 (모달, 토스트, 드롭다운)
 D) A + B + C 전체
 E) 직접 입력
```

## 동적 질문

summary.md에서 불확실한 항목이 있으면 추가 질문을 생성합니다.
각 질문은:
- 최소 3개 선택지 + 직접 입력 옵션
- Phase 1에서 감지된 값 기반 추천

예시 트리거:
- 소스 간 색상 팔레트 톤이 크게 다름 → "전체 톤은 어느 쪽이 좋을까요?"
- 폰트가 3개 이상 감지됨 → "주 폰트를 하나 선택해주세요"
- 그라디언트 사용 여부가 모호 → "그라디언트를 사용할까요?"

## 결과 저장

인터뷰 결과를 `.create-design-md/interview.md`에 저장합니다:

```yaml
responsive: true
breakpoints: [480, 768, 1024, 1280]
darkMode: true
darkModeStrategy: system-toggle
platform: web
components: [button, card, input, navigation, table, modal]
additionalNotes: "사용자 추가 요구사항"
```

## State 업데이트

```json
{ "phase2": "completed", "currentPhase": 3 }
```
```

- [ ] **Step 2: 커밋**

```bash
git add phases/phase2-interview.md
git commit -m "feat: add phase2-interview.md with dynamic interview prompts"
```

---

## Task 8: Phase 3 — phase3-mixing.md

**Files:**
- Create: `phases/phase3-mixing.md`

- [ ] **Step 1: 프롬프트 작성**

```markdown
# Phase 3: Mixing Playground

소스가 2개 이상일 때 웹 플레이그라운드에서 카테고리별 디자인 요소를 선택합니다.

## 서버 시작

```bash
bash ~/.claude/skills/create-design-md/scripts/start.sh {project-root}
```

출력에서 `url`, `contentDir`, `stateDir`를 저장합니다.
사용자에게 URL을 안내합니다: "브라우저에서 {url}을 열어주세요."

## 믹싱 흐름

### Step 1: 카테고리별 소스 선택 페이지 생성

각 카테고리(colors, typography, components, layout, elevation, responsive, mood)에 대해
소스별 옵션을 보여주는 HTML을 Write로 `{contentDir}/`에 생성합니다.

파일명 규칙: `01-colors.html`, `02-typography.html` 등

HTML 구조:
```html
<h2>Colors 소스 선택</h2>
<p class="subtitle">각 소스의 컬러 팔레트를 비교하고 선택해주세요</p>

<div class="options" data-category="colors">
  <div class="option" data-choice="source-a" onclick="toggleSelect(this)">
    <div class="letter">A</div>
    <div class="content">
      <h3>{Source A Name}</h3>
      <p>{색상 개수}개 색상 — {핵심 특징 요약}</p>
      <div class="preview-box">
        <!-- 실제 색상 스워치를 렌더링 -->
        <div style="display:flex;gap:4px;flex-wrap:wrap;">
          <div style="width:32px;height:32px;border-radius:6px;background:{hex1}"></div>
          <div style="width:32px;height:32px;border-radius:6px;background:{hex2}"></div>
          <!-- ... -->
        </div>
      </div>
    </div>
  </div>

  <div class="option" data-choice="source-b" onclick="toggleSelect(this)">
    <div class="letter">B</div>
    <div class="content">
      <h3>{Source B Name}</h3>
      <p>{색상 개수}개 색상 — {핵심 특징 요약}</p>
      <div class="preview-box">
        <!-- 색상 스워치 -->
      </div>
    </div>
  </div>
</div>
```

### Step 2: 사용자에게 안내

각 카테고리 HTML을 Write한 후:
```
"브라우저에서 {카테고리} 소스를 확인하고 선택해주세요. ({url})"
```

### Step 3: 선택 결과 읽기

사용자가 응답하면 `{stateDir}/events.jsonl`을 Read로 읽어 선택 결과를 확인합니다.

```bash
cat {stateDir}/events.jsonl
```

### Step 4: 통합 미리보기 생성

모든 카테고리 선택 후, 선택된 조합으로 대표 컴포넌트를 렌더링하는 HTML을 생성합니다.

파일명: `integrated-preview.html`

포함 컴포넌트:
- 버튼 (primary, secondary, ghost)
- 카드 (텍스트 + 이미지)
- 인풋 + 라벨
- 네비게이션 바

선택된 소스의 실제 hex, font-family, border-radius, shadow 값을 CSS 변수로 주입합니다.

**커스텀 폰트 처리:**
- Google Fonts에 있는 폰트 → `<link>` 태그로 로드
- 없는 폰트 → fallback 사용 + `/* Actual: {font-name} */` 주석
- 코드베이스 로컬 폰트 → `@font-face`로 로컬 경로 시도

### Step 5: 반응형 미리보기

반응형이 선택됐으면, 모바일/태블릿/데스크탑 토글 버튼을 미리보기에 추가합니다:

```html
<div class="responsive-toggle">
  <button onclick="setViewport(393)" class="active">Mobile</button>
  <button onclick="setViewport(768)">Tablet</button>
  <button onclick="setViewport(1200)">Desktop</button>
</div>
<iframe id="preview-frame" style="width:393px;..." srcdoc="..."></iframe>
```

### Step 6: 선택 완료

사용자가 "선택 완료" 버튼을 클릭하거나 터미널에서 완료를 알리면:

1. `events.jsonl`에서 `type: "complete"` 이벤트를 확인
2. 최종 선택을 `.create-design-md/mixing/selections.json`에 저장:

```json
{
  "colors": { "source": "{source-id}", "overrides": {} },
  "typography": { "source": "{source-id}", "overrides": {} },
  "components": { "source": "{source-id}" },
  "elevation": { "source": "{source-id}" },
  "layout": { "source": "{source-id}" },
  "responsive": { "source": "{source-id}" },
  "mood": { "source": "{source-id}" }
}
```

### 속성 믹싱 프리셋

입력에 `font from stripe` 등 속성 믹싱 지시가 있었으면:
- 해당 카테고리의 기본 선택을 프리셋합니다
- HTML에서 해당 옵션을 `.selected` 클래스로 표시합니다
- 사용자는 확인만 하거나 변경할 수 있습니다

## 서버 종료

```bash
bash ~/.claude/skills/create-design-md/scripts/stop.sh {stateDir}
```

## State 업데이트

```json
{ "phase3": "completed", "currentPhase": 4 }
```
```

- [ ] **Step 2: 커밋**

```bash
git add phases/phase3-mixing.md
git commit -m "feat: add phase3-mixing.md with playground interaction guide"
```

---

## Task 9: Phase 4 — phase4-generate.md

**Files:**
- Create: `phases/phase4-generate.md`

- [ ] **Step 1: 프롬프트 작성**

```markdown
# Phase 4: DESIGN.md Generation

분석 결과와 인터뷰/믹싱 선택을 종합해 최종 DESIGN.md를 생성합니다.

## 데이터 수집

1. `.create-design-md/analyze/*.md` — 모든 소스 분석 파일을 Read
2. `.create-design-md/interview.md` — 인터뷰 결과 Read
3. `.create-design-md/mixing/selections.json` — 믹싱 선택 Read (Phase 3 거친 경우)

## 소스 결정

**Phase 3을 거친 경우:**
selections.json의 카테고리별 source를 따름.

**Phase 3을 안 거친 경우 (소스 1개):**
단일 소스의 전체 데이터를 모든 섹션에 사용.

## DESIGN.md 생성

프로젝트 루트에 `DESIGN.md`를 Write합니다.
아래 9개 섹션을 순서대로 작성합니다.

### Section 1: Visual Theme & Atmosphere

**소스:** 전체 분석 종합 (mood 카테고리 우선)
**형식:** 산문 (prose) — 2~4 문단

포함:
- 전체 디자인의 무드/톤/철학을 생생한 형용사로 서술
- "왜 이런 모양인지" 맥락 설명
- Key Characteristics 불릿 리스트 (6~8항목)
  - 각 항목에 hex 코드 + 시맨틱 이름 포함

참고: awesome-design-md의 Claude/Stripe DESIGN.md를 톤 레퍼런스로 삼음.
산문 품질이 핵심 — LLM이 응용할 수 있도록 "왜"를 설명해야 함.

### Section 2: Color Palette & Roles

**소스:** colors 카테고리
**형식:** 카테고리별 컬러 리스트

카테고리: Primary, Secondary & Accent, Surface & Background, Neutrals & Text, Semantic & Accent, Gradient System

각 색상:
```
- **{Semantic Name}** (`{hex}`): {역할 설명 — 어디에, 왜 사용하는지}
```

### Section 3: Typography Rules

**소스:** typography 카테고리
**형식:** Font Family + Hierarchy Table

Font Family:
- Headline: `{font}`, fallback: `{fallback}`
- Body/UI: `{font}`, fallback: `{fallback}`
- Code: `{font}`, fallback: `{fallback}`

Hierarchy Table:
| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |

Principles (3~5개):
- 타이포그래피 사용의 핵심 원칙 설명

### Section 4: Component Stylings

**소스:** components 카테고리
**형식:** 컴포넌트별 상세 스타일

각 컴포넌트 (Buttons, Cards, Inputs, Navigation, + interview에서 선택된 추가 컴포넌트):
- Background, Text, Padding, Radius, Shadow, Hover 등 구체적 CSS 값
- transition/animation 포함

### Section 5: Layout Principles

**소스:** layout 카테고리
**형식:** Spacing System + Grid + Whitespace Philosophy

- Base unit
- Spacing scale
- Grid & Container (max-width, column 수)
- Whitespace Philosophy (산문)
- Border Radius Scale

### Section 6: Depth & Elevation

**소스:** elevation 카테고리
**형식:** Level 테이블 + Shadow Philosophy

| Level | Treatment | Use |

Shadow Philosophy (산문):
- 그림자 시스템의 철학과 특징 설명

### Section 7: Do's and Don'ts

**소스:** 전체 분석
**형식:** Do 리스트 + Don't 리스트

분석에서 발견된 패턴과 안티패턴을 정리.
각 항목에 구체적 값 포함 (hex, px 등).

### Section 8: Responsive Behavior

**소스:** responsive 카테고리 + interview 결과
**형식:** Breakpoints Table + Touch Targets + Collapsing Strategy

| Name | Width | Key Changes |

### Section 9: Agent Prompt Guide

**소스:** 위 전체
**형식:** Quick Color Reference + Example Component Prompts + Iteration Guide

Quick Color Reference: 주요 색상 8~10개를 한 줄씩
Example Component Prompts: 5개+ 즉시 복붙 가능한 프롬프트
Iteration Guide: 7~10개 팁

## preview.html 생성

DESIGN.md 생성 후 generate-preview.ts를 실행합니다:

```bash
bun run ~/.claude/skills/create-design-md/scripts/generate-preview.ts {project-root}/DESIGN.md
```

interview.md에서 darkMode가 true면 `--dark` 플래그를 추가합니다:

```bash
bun run ~/.claude/skills/create-design-md/scripts/generate-preview.ts {project-root}/DESIGN.md --dark
```

## .gitignore 업데이트

프로젝트 `.gitignore`에 `.create-design-md/`가 없으면 추가합니다.

## State 업데이트

```json
{ "phase4": "completed", "currentPhase": null }
```

## 완료 메시지

```
DESIGN.md 생성 완료!

산출물:
- DESIGN.md (9개 섹션, 색상 {N}개, 타이포 {N}단계, 컴포넌트 {N}개)
- preview.html
- preview-dark.html (다크모드 선택 시)

preview.html을 브라우저에서 열어 결과를 확인해주세요.
수정이 필요하면:
- `create-design-md update {카테고리}` — 특정 섹션 수정
- `create-design-md update {카테고리} from {소스}` — 새 소스로 교체
- `create-design-md regenerate` — 전체 재생성
```
```

- [ ] **Step 2: 커밋**

```bash
git add phases/phase4-generate.md
git commit -m "feat: add phase4-generate.md with 9-section DESIGN.md generation guide"
```

---

## Task 10: SKILL.md (Main Orchestrator)

**Files:**
- Create: `SKILL.md`

- [ ] **Step 1: SKILL.md 작성**

```markdown
---
name: create-design-md
description: "Use when user wants to create, update, or regenerate a DESIGN.md file from websites, codebases, or service names. Triggers: \"create-design-md\", \"DESIGN.md 만들어\", \"디자인 시스템 추출\", \"design-md 생성\", \"/create-design-md\"."
---

# create-design-md

웹사이트 URL, 코드베이스, 서비스명에서 디자인 요소를 추출해 9-section DESIGN.md를 자동 생성합니다.

## 입력 파싱

사용자 입력을 아래 규칙으로 파싱합니다:

| 토큰 | 해석 |
|------|------|
| `https://...` 또는 `http://...` | URL 소스 |
| `from codebase` | 현재 프로젝트 코드베이스 소스 |
| `update {카테고리}` | 기존 DESIGN.md 특정 섹션 재생성 |
| `update {카테고리} from {소스}` | 특정 섹션을 새 소스로 교체 |
| `regenerate` | 기존 중간 산출물로 Phase 4만 재실행 |
| `--quick` | Phase 2 인터뷰 스킵 |
| `{attr} from {source}` | 속성 믹싱 지시 (font, color, shadow, layout 등) |
| 기타 단어 | 서비스명 → resolve-service.ts로 URL 해석 |
| (인자 없음) | `from codebase`로 자동 진행 |

속성 카테고리 매칭은 AI가 자연어 의미로 판단합니다:
- colors/palette/색상 → Section 2
- font/typography/글꼴 → Section 3
- component/button/컴포넌트 → Section 4
- layout/spacing/레이아웃 → Section 5
- shadow/elevation/그림자 → Section 6
- responsive/breakpoint/반응형 → Section 8
- mood/theme/분위기 → Section 1

## 기존 DESIGN.md 감지

프로젝트 루트에 `DESIGN.md`가 이미 존재하면:
- 자동으로 소스에 추가합니다
- 소스 수가 2개 이상이 되므로 Phase 3 믹싱을 진행합니다

## 중단/재개

`.create-design-md/state.json`이 존재하면:
```
"Phase {N}에서 중단됐습니다. 이어서 할까요? (Y/N)"
```
- Y → 해당 Phase부터 재개
- N → state.json 삭제 후 처음부터

## Phase 라우팅

```
update/regenerate 명령 → 부분 재생성 (아래 참조)
--quick 플래그 → Phase 1 → Phase 4 (Phase 2, 3 스킵)
기존 DESIGN.md 없음 + 소스 1개 → Phase 1 → Phase 2 → Phase 4
기존 DESIGN.md 없음 + 소스 2개+ → Phase 1 → Phase 2 → Phase 3 → Phase 4
기존 DESIGN.md 있음 + 소스 1개+ → Phase 1 → Phase 2 → Phase 3 → Phase 4
```

각 Phase는 별도 프롬프트 파일에 정의되어 있습니다:
- Phase 1: `phases/phase1-analyze.md`를 Read하고 따릅니다
- Phase 2: `phases/phase2-interview.md`를 Read하고 따릅니다
- Phase 3: `phases/phase3-mixing.md`를 Read하고 따릅니다
- Phase 4: `phases/phase4-generate.md`를 Read하고 따릅니다

## Update 모드

### update {카테고리} from {소스}

1. state.json 확인 → 기존 중간 산출물 존재 확인
2. 새 소스 분석 (Phase 1 절차)
3. selections.json에서 해당 카테고리만 교체
4. Phase 4 재실행

### update {카테고리}

1. 기존 소스에서 해당 카테고리 데이터 재확인
2. 해당 카테고리에 대해 인터뷰 1회
3. Phase 4 재실행

### regenerate

1. 기존 analyze/, interview.md, selections.json 그대로 사용
2. Phase 4만 재실행

## 서비스명 해석

서비스명이 입력되면 resolve-service.ts를 실행합니다:
```bash
bun run ~/.claude/skills/create-design-md/scripts/resolve-service.ts {service-name}
```

실패 시: "'{name}'에 해당하는 사이트를 찾지 못했습니다. URL을 직접 입력해주세요."

## 에러 처리

| 상황 | 처리 |
|------|------|
| URL 접근 불가 | 경고 + 해당 소스 스킵 |
| Chrome DevTools MCP 미연결 | WebFetch fallback (raw HTML만 분석, 제한 안내) |
| 코드베이스에 디자인 파일 없음 | 경고 + 빈 분석 결과로 진행 |
| 서비스명 해석 실패 | URL 직접 입력 요청 |
| Phase 중단 | state.json에 저장 |
```

- [ ] **Step 2: 커밋**

```bash
git add SKILL.md
git commit -m "feat: add SKILL.md orchestrator with input parsing and phase routing"
```

---

## Task 11: Integration Test

**Files:** none (manual verification)

- [ ] **Step 1: 전체 파일 구조 확인**

```bash
find ~/.claude/skills/create-design-md -type f | sort
```

Expected:
```
SKILL.md
bunfig.toml
package.json
phases/phase1-analyze.md
phases/phase2-interview.md
phases/phase3-mixing.md
phases/phase4-generate.md
scripts/analyze-codebase.ts
scripts/generate-preview.ts
scripts/playground/public/styles.css
scripts/playground/server.ts
scripts/playground/templates/frame.html
scripts/playground/templates/helpers.js
scripts/resolve-service.ts
scripts/start.sh
scripts/stop.sh
```

- [ ] **Step 2: 각 스크립트 독립 실행 테스트**

```bash
cd ~/.claude/skills/create-design-md

# resolve-service.ts
bun run scripts/resolve-service.ts stripe
# Expected: JSON with url

# analyze-codebase.ts
bun run scripts/analyze-codebase.ts ~/.claude/skills/create-design-md
# Expected: JSON with stack info

# generate-preview.ts (with test DESIGN.md)
bun run scripts/generate-preview.ts /tmp/test-DESIGN.md
# Expected: preview.html created

# playground server
bash scripts/start.sh /tmp/test-project
# Expected: server-started JSON
# Then stop:
bash scripts/stop.sh /tmp/test-project/.create-design-md/playground/*/state
```

- [ ] **Step 3: 최종 커밋 (필요 시)**

```bash
git add -A
git commit -m "chore: final integration verification"
```

---

## Task Summary

| Task | 내용 | 의존성 |
|------|------|--------|
| 1 | Project Scaffold | — |
| 2 | resolve-service.ts | Task 1 |
| 3 | analyze-codebase.ts | Task 1 |
| 4 | Playground Server + Shell Scripts | Task 1 |
| 5 | generate-preview.ts | Task 1 |
| 6 | phase1-analyze.md | Task 2, 3 |
| 7 | phase2-interview.md | Task 6 |
| 8 | phase3-mixing.md | Task 4 |
| 9 | phase4-generate.md | Task 5 |
| 10 | SKILL.md | Task 6, 7, 8, 9 |
| 11 | Integration Test | Task 10 |

**병렬 가능:**
- Task 2, 3, 4, 5 (모두 Task 1 완료 후 동시 진행 가능)
- Task 6, 7 (순서 무관하지만 6이 먼저가 자연스러움)
- Task 8, 9 (독립)
