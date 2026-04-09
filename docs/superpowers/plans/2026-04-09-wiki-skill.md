# Wiki Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Obsidian vault 기반 LLM Wiki에 키워드 + 시맨틱 검색 CLI를 구축하고, 기존 8개 커스텀 스킬을 이 레포로 통합한다.

**Architecture:** Bun CLI가 ripgrep(키워드) + LanceDB/ollama(시맨틱) 검색을 제공. 스킬(SKILL.md)이 LLM에게 CLI 호출을 지시. 환경변수(`~/.claude/wiki.env`)로 개인 경로 분리.

**Tech Stack:** Bun, TypeScript, LanceDB (`@lancedb/lancedb`), gray-matter, ollama HTTP API, ripgrep

**Spec:** `docs/superpowers/specs/2026-04-09-wiki-skill-design.md`

---

## File Map

### 새로 생성

| 파일 | 역할 |
|------|------|
| `skills/wiki/cli/package.json` | Bun 프로젝트 매니페스트 |
| `skills/wiki/cli/tsconfig.json` | TypeScript 설정 |
| `skills/wiki/cli/src/config.ts` | 환경변수 로드 + WikiConfig |
| `skills/wiki/cli/src/search.ts` | ripgrep 래핑 키워드 검색 |
| `skills/wiki/cli/src/reindex.ts` | 프론트매터 인덱스 + 임베딩 생성 |
| `skills/wiki/cli/src/semantic.ts` | LanceDB 벡터 검색 |
| `skills/wiki/cli/src/recent.ts` | 최근 노트 조회 |
| `skills/wiki/cli/src/summary.ts` | 프로젝트 요약 |
| `skills/wiki/cli/src/read.ts` | 단일 노트 읽기 |
| `skills/wiki/cli/src/index.ts` | CLI 엔트리 (서브커맨드 파싱) |
| `skills/wiki/SKILL.md` | 스킬 진입점 |
| `setup/install.sh` | 원커맨드 설치 스크립트 |

### 기존 스킬 이관 (5개 — 수정 없이 복사)

| 소스 | 목적지 |
|------|--------|
| `~/.claude/skills/generate-context/` | `skills/generate-context/` |
| `~/.claude/skills/create-design-md/` | `skills/create-design-md/` |
| `~/.claude/skills/go/` | `skills/go/` |
| `~/.claude/skills/web-capture/` | `skills/web-capture/` |
| `~/.claude/skills/atomic-commits/` | `skills/atomic-commits/` |

### 기존 스킬 이관 + 수정 (3개 — vault 하드코딩 제거)

| 소스 | 목적지 | 변경 |
|------|--------|------|
| `~/.claude/skills/open/` | `skills/open/` | vault 경로 → `wiki summary` 호출 |
| `~/.claude/skills/stop/` | `skills/stop/` | vault 경로 → `source wiki.env` |
| `~/.claude/skills/read-project/` | `skills/read-project/` | vault 경로 → `wiki summary` 호출 |

### 수정

| 파일 | 변경 |
|------|------|
| `.gitignore` | wiki.env, wiki-data/, node_modules/ 추가 |

---

## Task 1: 프로젝트 스캐폴딩

**Files:**
- Create: `skills/wiki/cli/package.json`
- Create: `skills/wiki/cli/tsconfig.json`
- Modify: `.gitignore`

- [ ] **Step 1: package.json 생성**

```json
{
  "name": "wiki-cli",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "wiki": "bun run src/index.ts",
    "test": "bun test"
  },
  "dependencies": {
    "@lancedb/lancedb": "^0.15.0",
    "gray-matter": "^4.0.3"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 2: tsconfig.json 생성**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["bun-types"],
    "strict": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: .gitignore에 추가**

`.gitignore` 파일에 다음 추가:

```
# Wiki personal data
wiki.env
wiki-data/
node_modules/
*.lance/
```

- [ ] **Step 4: bun install**

Run: `cd skills/wiki/cli && bun install`
Expected: `node_modules/` 생성, lockfile 생성

- [ ] **Step 5: Commit**

```bash
git add skills/wiki/cli/package.json skills/wiki/cli/tsconfig.json skills/wiki/cli/bun.lock .gitignore
git commit -m "chore: scaffold wiki CLI project with bun"
```

---

## Task 2: config.ts — 환경변수 로드

**Files:**
- Create: `skills/wiki/cli/src/config.ts`

- [ ] **Step 1: config.ts 작성**

```typescript
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export interface WikiConfig {
  vaultPath: string;
  embedModel: string;
  topK: number;
  dataDir: string;
}

function parseEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const content = readFileSync(path, "utf-8");
  const vars: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    // ~ 확장
    if (value.startsWith("~/")) {
      value = join(homedir(), value.slice(2));
    }
    vars[key] = value;
  }
  return vars;
}

export function loadConfig(): WikiConfig {
  const envPath = join(homedir(), ".claude", "wiki.env");
  const fileVars = parseEnvFile(envPath);

  // 환경변수 > 파일 > 기본값
  const vaultPath =
    process.env.CLAUDE_WIKI_VAULT ??
    fileVars.CLAUDE_WIKI_VAULT;

  if (!vaultPath) {
    console.error(
      "Error: CLAUDE_WIKI_VAULT is not set.\n" +
      "Run setup/install.sh or create ~/.claude/wiki.env with:\n" +
      "  CLAUDE_WIKI_VAULT=/path/to/your/obsidian/vault"
    );
    process.exit(1);
  }

  // ~ 확장 (환경변수에서 온 경우)
  const resolvedVault = vaultPath.startsWith("~/")
    ? join(homedir(), vaultPath.slice(2))
    : vaultPath;

  return {
    vaultPath: resolvedVault,
    embedModel:
      process.env.OLLAMA_EMBED_MODEL ??
      fileVars.OLLAMA_EMBED_MODEL ??
      "nomic-embed-text",
    topK: parseInt(
      process.env.WIKI_TOP_K ??
      fileVars.WIKI_TOP_K ??
      "5",
      10
    ),
    dataDir: join(homedir(), ".claude", "wiki-data"),
  };
}
```

- [ ] **Step 2: 빌드 확인**

Run: `cd skills/wiki/cli && bun build src/config.ts --outdir /dev/null 2>&1`
Expected: 에러 없이 빌드 성공

- [ ] **Step 3: Commit**

```bash
git add skills/wiki/cli/src/config.ts
git commit -m "feat: add wiki config loader with env file support"
```

---

## Task 3: search.ts — 키워드 검색

**Files:**
- Create: `skills/wiki/cli/src/search.ts`

- [ ] **Step 1: search.ts 작성**

```typescript
import { loadConfig } from "./config";
import { join } from "path";

interface SearchOptions {
  project?: string;
  type?: string; // learning | decision | knowhow
}

export async function search(query: string, opts: SearchOptions = {}) {
  const config = loadConfig();
  let searchPath = config.vaultPath;

  if (opts.project) {
    searchPath = join(config.vaultPath, "프로젝트", opts.project);
  }

  // ripgrep으로 검색
  const args = [
    "rg",
    "--type", "md",
    "--ignore-case",
    "--max-count", "3",       // 파일당 최대 3 매치
    "--context", "1",
    "--heading",
    "--color", "never",
    query,
    searchPath,
  ];

  const proc = Bun.spawn(args, {
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  await proc.exited;

  if (!stdout.trim()) {
    console.log(`"${query}"에 대한 검색 결과가 없습니다.`);
    return;
  }

  // type 필터가 있으면 프론트매터 기반으로 필터링
  if (opts.type) {
    const filtered = await filterByType(stdout, opts.type, config.vaultPath);
    console.log(filtered || `"${query}" (type: ${opts.type}) 검색 결과 없음`);
    return;
  }

  // 경로를 vault 상대 경로로 변환
  const output = stdout.replaceAll(config.vaultPath + "/", "");
  console.log(`## 검색 결과: "${query}"\n\n${output}`);
}

async function filterByType(
  rgOutput: string,
  type: string,
  vaultPath: string
): string {
  // ripgrep 출력에서 파일 경로 추출
  const files = new Set<string>();
  for (const line of rgOutput.split("\n")) {
    // heading 모드에서 파일 경로는 콜론 없는 줄
    if (line && !line.startsWith("-") && !line.includes(":")) {
      files.add(line.trim());
    }
  }

  const typeMap: Record<string, string> = {
    learning: "learning",
    decision: "decision",
    knowhow: "knowhow",
  };
  const targetType = typeMap[type];
  if (!targetType) return rgOutput;

  // 각 파일의 프론트매터에서 type 확인
  const matching: string[] = [];
  for (const file of files) {
    try {
      const content = await Bun.file(file).text();
      if (content.includes(`type: ${targetType}`)) {
        // 해당 파일의 ripgrep 결과만 추출
        const fileSection = extractFileSection(rgOutput, file);
        if (fileSection) {
          matching.push(fileSection.replaceAll(vaultPath + "/", ""));
        }
      }
    } catch {
      // 파일 읽기 실패 시 스킵
    }
  }

  return matching.length > 0
    ? `## 검색 결과: type=${type}\n\n${matching.join("\n\n")}`
    : "";
}

function extractFileSection(rgOutput: string, filePath: string): string {
  const lines = rgOutput.split("\n");
  const sections: string[] = [];
  let capturing = false;

  for (const line of lines) {
    if (line.trim() === filePath) {
      capturing = true;
      sections.push(line);
    } else if (capturing) {
      if (line === "" && sections.length > 1) {
        // 빈 줄 = 다음 파일 시작 가능
        break;
      }
      sections.push(line);
    }
  }

  return sections.join("\n");
}
```

- [ ] **Step 2: 빌드 확인**

Run: `cd skills/wiki/cli && bun build src/search.ts --outdir /dev/null 2>&1`
Expected: 에러 없이 빌드 성공

- [ ] **Step 3: Commit**

```bash
git add skills/wiki/cli/src/search.ts
git commit -m "feat: add keyword search with ripgrep"
```

---

## Task 4: reindex.ts — 인덱스 + 임베딩 생성

**Files:**
- Create: `skills/wiki/cli/src/reindex.ts`

- [ ] **Step 1: reindex.ts 작성**

```typescript
import { loadConfig, type WikiConfig } from "./config";
import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync } from "fs";
import { join, relative } from "path";
import { Glob } from "bun";
import matter from "gray-matter";

interface IndexEntry {
  path: string;
  title: string;
  content: string;
  project: string;
  type: string;
  tags: string[];
  created: string;
  updated: string;
  mtime: number;
}

interface NoteRecord {
  path: string;
  title: string;
  content: string;
  vector: number[];
  project: string;
  type: string;
  tags: string[];
  created: string;
  updated: string;
  mtime: number;
}

// 프론트매터 파싱 + 인덱스 엔트리 생성
function parseNote(filePath: string, vaultPath: string): IndexEntry | null {
  try {
    const raw = readFileSync(filePath, "utf-8");
    const { data, content } = matter(raw);
    const relPath = relative(vaultPath, filePath);
    const stat = statSync(filePath);

    // 제목: 첫 번째 # 헤딩 또는 파일명
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch?.[1] ?? relPath.split("/").pop()?.replace(".md", "") ?? relPath;

    // 프로젝트: 프론트매터 > 경로에서 추론
    let project = data.project ?? "";
    if (!project && relPath.startsWith("프로젝트/")) {
      project = relPath.split("/")[1] ?? "";
    }

    return {
      path: relPath,
      title,
      content: content.trim().slice(0, 2000), // 스니펫용 최대 2000자
      project,
      type: data.type ?? "",
      tags: Array.isArray(data.tags) ? data.tags : [],
      created: data.created ?? "",
      updated: data.updated ?? "",
      mtime: stat.mtimeMs,
    };
  } catch {
    return null;
  }
}

// ollama 임베딩 생성
async function embed(text: string, model: string): Promise<number[] | null> {
  try {
    const res = await fetch("http://localhost:11434/api/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt: text }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.embedding;
  } catch {
    return null;
  }
}

// ollama 사용 가능 여부 확인
async function isOllamaRunning(): Promise<boolean> {
  try {
    const res = await fetch("http://localhost:11434/api/tags");
    return res.ok;
  } catch {
    return false;
  }
}

export async function reindex(embeddingsOnly: boolean = false) {
  const config = loadConfig();
  const startTime = Date.now();

  // 데이터 디렉토리 생성
  mkdirSync(config.dataDir, { recursive: true });

  // vault 내 모든 .md 파일 수집
  const glob = new Glob("**/*.md");
  const files: string[] = [];
  for await (const file of glob.scan({ cwd: config.vaultPath, absolute: true })) {
    // _소스/ 폴더, .obsidian/ 등 제외
    const rel = relative(config.vaultPath, file);
    if (rel.startsWith("_소스/") || rel.startsWith(".")) continue;
    files.push(file);
  }

  // 기존 인덱스 로드 (증분 갱신용)
  const indexPath = join(config.dataDir, "index.json");
  let existingIndex: Record<string, IndexEntry> = {};
  if (existsSync(indexPath) && !embeddingsOnly) {
    try {
      existingIndex = JSON.parse(readFileSync(indexPath, "utf-8"));
    } catch {
      existingIndex = {};
    }
  }

  // 파싱 + 변경 감지
  const entries: IndexEntry[] = [];
  const changed: IndexEntry[] = [];

  for (const file of files) {
    const entry = parseNote(file, config.vaultPath);
    if (!entry) continue;
    entries.push(entry);

    const existing = existingIndex[entry.path];
    if (!existing || existing.mtime < entry.mtime) {
      changed.push(entry);
    }
  }

  // 프론트매터 인덱스 저장
  if (!embeddingsOnly) {
    const indexMap: Record<string, IndexEntry> = {};
    for (const e of entries) {
      indexMap[e.path] = e;
    }
    writeFileSync(indexPath, JSON.stringify(indexMap, null, 2));
  }

  console.log(`총 ${entries.length}개 노트, ${changed.length}개 변경 감지`);

  // 임베딩 생성
  const ollamaUp = await isOllamaRunning();
  if (!ollamaUp) {
    console.log("⚠️ ollama가 실행되지 않았습니다. 프론트매터 인덱스만 생성합니다.");
    console.log("   시맨틱 검색을 사용하려면 ollama를 실행하고 다시 reindex하세요.");
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n완료: ${entries.length}개 인덱싱, 임베딩 스킵 (${elapsed}s)`);
    return;
  }

  if (changed.length === 0) {
    console.log("변경된 노트 없음, 임베딩 갱신 스킵");
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n완료: ${entries.length}개 인덱싱 (${elapsed}s)`);
    return;
  }

  // LanceDB 연결
  const lancedb = await import("@lancedb/lancedb");
  const db = await lancedb.connect(join(config.dataDir, "embeddings.lance"));

  // 변경된 노트 임베딩
  const records: NoteRecord[] = [];
  let embedCount = 0;

  for (const entry of changed) {
    const textToEmbed = `${entry.title}\n\n${entry.content}`;
    const vector = await embed(textToEmbed, config.embedModel);
    if (!vector) {
      console.log(`  ⚠️ 임베딩 실패: ${entry.path}`);
      continue;
    }

    records.push({ ...entry, vector });
    embedCount++;

    if (embedCount % 10 === 0) {
      console.log(`  ${embedCount}/${changed.length} 임베딩 완료...`);
    }
  }

  // 기존 테이블에서 변경된 파일 삭제 후 재삽입
  const tableName = "notes";
  let table: any;

  try {
    table = await db.openTable(tableName);
    // 변경된 파일의 기존 레코드 삭제
    const changedPaths = changed.map((e) => e.path);
    for (const path of changedPaths) {
      await table.delete(`path = '${path.replace(/'/g, "''")}'`);
    }
    if (records.length > 0) {
      await table.add(records);
    }
  } catch {
    // 테이블이 없으면 새로 생성
    if (records.length > 0) {
      table = await db.createTable(tableName, records);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `\n완료: ${entries.length}개 인덱싱, ${embedCount}개 임베딩 갱신 (${elapsed}s)`
  );
}
```

- [ ] **Step 2: 빌드 확인**

Run: `cd skills/wiki/cli && bun build src/reindex.ts --outdir /dev/null 2>&1`
Expected: 에러 없이 빌드 성공

- [ ] **Step 3: Commit**

```bash
git add skills/wiki/cli/src/reindex.ts
git commit -m "feat: add reindex with frontmatter parsing and ollama embeddings"
```

---

## Task 5: semantic.ts — 벡터 검색

**Files:**
- Create: `skills/wiki/cli/src/semantic.ts`

- [ ] **Step 1: semantic.ts 작성**

```typescript
import { loadConfig } from "./config";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { search } from "./search";

interface SemanticOptions {
  top?: number;
  project?: string;
}

async function embedQuery(text: string, model: string): Promise<number[] | null> {
  try {
    const res = await fetch("http://localhost:11434/api/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt: text }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.embedding;
  } catch {
    return null;
  }
}

export async function semantic(query: string, opts: SemanticOptions = {}) {
  const config = loadConfig();
  const topK = opts.top ?? config.topK;
  const lancePath = join(config.dataDir, "embeddings.lance");

  // 인덱스 존재 확인
  if (!existsSync(lancePath)) {
    console.log("임베딩 인덱스가 없습니다. reindex를 먼저 실행합니다...\n");
    const { reindex } = await import("./reindex");
    await reindex();
    console.log("");
  }

  // 쿼리 임베딩
  const queryVec = await embedQuery(query, config.embedModel);
  if (!queryVec) {
    console.log("⚠️ ollama가 실행되지 않았습니다. 키워드 검색으로 전환합니다.\n");
    await search(query, { project: opts.project });
    return;
  }

  // LanceDB 검색
  const lancedb = await import("@lancedb/lancedb");
  const db = await lancedb.connect(lancePath);
  let table;

  try {
    table = await db.openTable("notes");
  } catch {
    console.log("임베딩 테이블이 없습니다. wiki reindex를 실행하세요.");
    return;
  }

  let results = await table.search(queryVec).limit(topK * 2).toArray();

  // 프로젝트 필터
  if (opts.project) {
    results = results.filter(
      (r: any) => r.project === opts.project
    );
  }

  results = results.slice(0, topK);

  if (results.length === 0) {
    console.log(`"${query}"에 대한 시맨틱 검색 결과가 없습니다.`);
    return;
  }

  // 결과 포맷팅
  console.log(`## 시맨틱 검색: "${query}"\n`);
  for (const r of results) {
    const score = (1 - (r._distance ?? 0)).toFixed(3);
    const snippet = (r.content as string).slice(0, 200).replace(/\n/g, " ");
    const meta = [r.type, r.project].filter(Boolean).join(" · ");
    console.log(`### ${r.title} (${score})`);
    if (meta) console.log(`> ${meta}`);
    console.log(`${snippet}...`);
    console.log(`📄 ${r.path}\n`);
  }
}
```

- [ ] **Step 2: 빌드 확인**

Run: `cd skills/wiki/cli && bun build src/semantic.ts --outdir /dev/null 2>&1`
Expected: 에러 없이 빌드 성공

- [ ] **Step 3: Commit**

```bash
git add skills/wiki/cli/src/semantic.ts
git commit -m "feat: add semantic search with LanceDB and ollama fallback"
```

---

## Task 6: recent.ts — 최근 노트 조회

**Files:**
- Create: `skills/wiki/cli/src/recent.ts`

- [ ] **Step 1: recent.ts 작성**

```typescript
import { loadConfig } from "./config";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

interface RecentOptions {
  project?: string;
  days?: number;
}

interface IndexEntry {
  path: string;
  title: string;
  project: string;
  type: string;
  created: string;
  updated: string;
  mtime: number;
}

export async function recent(opts: RecentOptions = {}) {
  const config = loadConfig();
  const days = opts.days ?? 30;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  const indexPath = join(config.dataDir, "index.json");
  if (!existsSync(indexPath)) {
    console.log("인덱스가 없습니다. wiki reindex를 먼저 실행하세요.");
    return;
  }

  const index: Record<string, IndexEntry> = JSON.parse(
    readFileSync(indexPath, "utf-8")
  );

  let entries = Object.values(index)
    .filter((e) => e.mtime >= cutoff)
    .filter((e) => !opts.project || e.project === opts.project);

  // 최신순 정렬: created 날짜 > mtime
  entries.sort((a, b) => {
    const dateA = a.created ? new Date(a.created).getTime() : a.mtime;
    const dateB = b.created ? new Date(b.created).getTime() : b.mtime;
    return dateB - dateA;
  });

  entries = entries.slice(0, 10);

  if (entries.length === 0) {
    const scope = opts.project ? ` (${opts.project})` : "";
    console.log(`최근 ${days}일 내 노트가 없습니다${scope}.`);
    return;
  }

  const scope = opts.project ? ` — ${opts.project}` : "";
  console.log(`## 최근 노트 (${days}일)${scope}\n`);

  for (const e of entries) {
    const date = e.created || new Date(e.mtime).toISOString().slice(0, 10);
    const type = e.type ? `[${e.type}]` : "";
    const proj = e.project && !opts.project ? `(${e.project})` : "";
    console.log(`- ${date} ${type} **${e.title}** ${proj}`);
    console.log(`  📄 ${e.path}`);
  }
}
```

- [ ] **Step 2: 빌드 확인**

Run: `cd skills/wiki/cli && bun build src/recent.ts --outdir /dev/null 2>&1`
Expected: 에러 없이 빌드 성공

- [ ] **Step 3: Commit**

```bash
git add skills/wiki/cli/src/recent.ts
git commit -m "feat: add recent notes listing"
```

---

## Task 7: summary.ts — 프로젝트 요약

**Files:**
- Create: `skills/wiki/cli/src/summary.ts`

- [ ] **Step 1: summary.ts 작성**

```typescript
import { loadConfig } from "./config";
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

export async function summary(projectOrFlag: string) {
  const config = loadConfig();

  if (projectOrFlag === "--all") {
    return summaryAll(config.vaultPath);
  }

  return summaryProject(projectOrFlag, config.vaultPath);
}

function summaryAll(vaultPath: string) {
  const projectsDir = join(vaultPath, "프로젝트");
  if (!existsSync(projectsDir)) {
    console.log("프로젝트 폴더가 없습니다.");
    return;
  }

  const projects = readdirSync(projectsDir).filter((f) => {
    const p = join(projectsDir, f);
    return statSync(p).isDirectory() && !f.startsWith(".");
  });

  if (projects.length === 0) {
    console.log("등록된 프로젝트가 없습니다.");
    return;
  }

  console.log("## 전체 프로젝트\n");
  for (const name of projects) {
    const overviewPath = join(projectsDir, name, "개요.md");
    let desc = "";
    if (existsSync(overviewPath)) {
      const content = readFileSync(overviewPath, "utf-8");
      // 첫 번째 단락 추출
      const lines = content.split("\n").filter((l) => l.trim() && !l.startsWith("#") && !l.startsWith("---"));
      desc = lines[0]?.trim().slice(0, 80) ?? "";
    }
    console.log(`- **${name}** — ${desc || "(개요 없음)"}`);
  }
}

function summaryProject(project: string, vaultPath: string) {
  const projectDir = join(vaultPath, "프로젝트", project);
  if (!existsSync(projectDir)) {
    console.log(`프로젝트 "${project}"의 위키 노트가 없습니다.`);
    return;
  }

  console.log(`## ${project}\n`);

  // 개요
  const overviewPath = join(projectDir, "개요.md");
  if (existsSync(overviewPath)) {
    const content = readFileSync(overviewPath, "utf-8");
    // 프론트매터 제거 후 본문
    const body = content.replace(/^---[\s\S]*?---\n*/, "").trim();
    console.log(body.slice(0, 500));
    console.log("");
  }

  // 최근 결정 3개
  const decisionsDir = join(projectDir, "결정");
  if (existsSync(decisionsDir)) {
    const files = readdirSync(decisionsDir)
      .filter((f) => f.endsWith(".md"))
      .sort()
      .reverse()
      .slice(0, 3);

    if (files.length > 0) {
      console.log("### 최근 결정\n");
      for (const f of files) {
        const content = readFileSync(join(decisionsDir, f), "utf-8");
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const title = titleMatch?.[1] ?? f.replace(".md", "");
        console.log(`- ${title}`);
      }
      console.log("");
    }
  }

  // 최근 배운점 3개
  const learningsDir = join(projectDir, "배운점");
  if (existsSync(learningsDir)) {
    const files = readdirSync(learningsDir)
      .filter((f) => f.endsWith(".md"))
      .sort()
      .reverse()
      .slice(0, 3);

    if (files.length > 0) {
      console.log("### 최근 배운점\n");
      for (const f of files) {
        const content = readFileSync(join(learningsDir, f), "utf-8");
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const title = titleMatch?.[1] ?? f.replace(".md", "");
        console.log(`- ${title}`);
      }
      console.log("");
    }
  }
}
```

- [ ] **Step 2: 빌드 확인**

Run: `cd skills/wiki/cli && bun build src/summary.ts --outdir /dev/null 2>&1`
Expected: 에러 없이 빌드 성공

- [ ] **Step 3: Commit**

```bash
git add skills/wiki/cli/src/summary.ts
git commit -m "feat: add project summary command"
```

---

## Task 8: read.ts — 단일 노트 읽기

**Files:**
- Create: `skills/wiki/cli/src/read.ts`

- [ ] **Step 1: read.ts 작성**

```typescript
import { loadConfig } from "./config";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

export async function read(relativePath: string) {
  const config = loadConfig();
  const fullPath = join(config.vaultPath, relativePath);

  if (!existsSync(fullPath)) {
    console.error(`파일을 찾을 수 없습니다: ${relativePath}`);
    process.exit(1);
  }

  const content = readFileSync(fullPath, "utf-8");
  console.log(content);
}
```

- [ ] **Step 2: Commit**

```bash
git add skills/wiki/cli/src/read.ts
git commit -m "feat: add single note read command"
```

---

## Task 9: index.ts — CLI 엔트리

**Files:**
- Create: `skills/wiki/cli/src/index.ts`

- [ ] **Step 1: index.ts 작성**

```typescript
import { search } from "./search";
import { semantic } from "./semantic";
import { reindex } from "./reindex";
import { recent } from "./recent";
import { summary } from "./summary";
import { read } from "./read";

const HELP = `
wiki — Obsidian vault 검색 CLI

Usage:
  wiki search <query> [--project <name>] [--type <type>]
  wiki semantic <query> [--top <n>] [--project <name>]
  wiki recent [--project <name>] [--days <n>]
  wiki summary <project|--all>
  wiki reindex [--embeddings-only]
  wiki read <path>

Examples:
  wiki search "인증 삽질"
  wiki semantic "Keycloak 세션 관리 주의점" --top 3
  wiki recent --project baegopax --days 7
  wiki summary baegopax
  wiki reindex
`.trim();

function parseArgs(args: string[]): { flags: Record<string, string>; positional: string[] } {
  const flags: Record<string, string> = {};
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = "true";
      }
    } else {
      positional.push(arg);
    }
  }

  return { flags, positional };
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "help" || args[0] === "--help") {
    console.log(HELP);
    return;
  }

  const command = args[0];
  const rest = args.slice(1);
  const { flags, positional } = parseArgs(rest);

  switch (command) {
    case "search": {
      const query = positional.join(" ");
      if (!query) {
        console.error("Usage: wiki search <query>");
        process.exit(1);
      }
      await search(query, {
        project: flags.project,
        type: flags.type,
      });
      break;
    }

    case "semantic": {
      const query = positional.join(" ");
      if (!query) {
        console.error("Usage: wiki semantic <query>");
        process.exit(1);
      }
      await semantic(query, {
        top: flags.top ? parseInt(flags.top, 10) : undefined,
        project: flags.project,
      });
      break;
    }

    case "recent": {
      await recent({
        project: flags.project,
        days: flags.days ? parseInt(flags.days, 10) : undefined,
      });
      break;
    }

    case "summary": {
      const target = positional[0] ?? flags.all ? "--all" : positional[0];
      if (!target) {
        console.error("Usage: wiki summary <project|--all>");
        process.exit(1);
      }
      await summary(target);
      break;
    }

    case "reindex": {
      await reindex(flags["embeddings-only"] === "true");
      break;
    }

    case "read": {
      const path = positional.join(" ");
      if (!path) {
        console.error("Usage: wiki read <path>");
        process.exit(1);
      }
      await read(path);
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      console.log(HELP);
      process.exit(1);
  }
}

main();
```

- [ ] **Step 2: 수동 테스트**

Run: `cd skills/wiki/cli && bun run src/index.ts --help`
Expected: help 텍스트 출력

Run: `cd skills/wiki/cli && bun run src/index.ts search "테스트"`
Expected: 검색 결과 또는 "검색 결과가 없습니다" (wiki.env 설정 필요)

- [ ] **Step 3: Commit**

```bash
git add skills/wiki/cli/src/index.ts
git commit -m "feat: add CLI entry point with subcommand routing"
```

---

## Task 10: SKILL.md — 스킬 파일

**Files:**
- Create: `skills/wiki/SKILL.md`

- [ ] **Step 1: SKILL.md 작성**

```markdown
---
name: wiki
description: |
  Obsidian vault에서 프로젝트 지식을 검색하고 조회하는 스킬.
  키워드 검색, 시맨틱 검색, 최근 기록, 프로젝트 요약을 제공한다.
  Use when: "위키", "기록 찾아", "전에 뭐했지", "배운점", "결정", "노하우", "wiki"
allowed-tools:
  - Bash
  - Read
---

# /wiki — Obsidian Wiki 검색

사용자의 요청에 따라 적절한 wiki CLI 커맨드를 실행한다.

## CLI 경로

```bash
bun run ~/.claude/skills/wiki/cli/src/index.ts <command> [args]
```

## 사용법

### 키워드 검색

사용자가 특정 키워드로 검색하고 싶을 때:

```bash
bun run ~/.claude/skills/wiki/cli/src/index.ts search "<검색어>"
bun run ~/.claude/skills/wiki/cli/src/index.ts search "<검색어>" --project <프로젝트명>
bun run ~/.claude/skills/wiki/cli/src/index.ts search "<검색어>" --type learning
```

### 시맨틱 검색

사용자가 자연어로 관련 노트를 찾고 싶을 때:

```bash
bun run ~/.claude/skills/wiki/cli/src/index.ts semantic "<자연어 쿼리>"
bun run ~/.claude/skills/wiki/cli/src/index.ts semantic "<쿼리>" --top 3 --project <프로젝트명>
```

### 최근 기록

사용자가 최근 작성한 노트를 보고 싶을 때:

```bash
bun run ~/.claude/skills/wiki/cli/src/index.ts recent
bun run ~/.claude/skills/wiki/cli/src/index.ts recent --project <프로젝트명> --days 7
```

### 프로젝트 요약

사용자가 특정 프로젝트 컨텍스트를 빠르게 파악하고 싶을 때:

```bash
bun run ~/.claude/skills/wiki/cli/src/index.ts summary <프로젝트명>
bun run ~/.claude/skills/wiki/cli/src/index.ts summary --all
```

### 인덱스 갱신

사용자가 검색 인덱스를 갱신하고 싶을 때:

```bash
bun run ~/.claude/skills/wiki/cli/src/index.ts reindex
bun run ~/.claude/skills/wiki/cli/src/index.ts reindex --embeddings-only
```

### 노트 읽기

특정 노트의 전체 내용이 필요할 때:

```bash
bun run ~/.claude/skills/wiki/cli/src/index.ts read "프로젝트/baegopax/배운점/2025-03-15-slug.md"
```

## 인자 없이 호출 시

사용자가 `/wiki`만 입력하면:
"무엇을 찾으시나요? 키워드, 자연어 질문, 또는 프로젝트명을 알려주세요." 라고 물어본 뒤 적절한 커맨드로 라우팅한다.

## 라우팅 가이드

| 사용자 의도 | 커맨드 |
|------------|--------|
| 정확한 키워드로 찾기 | `search` |
| "~관련 뭐 있었지" 식 질문 | `semantic` |
| "최근에 뭐 기록했지" | `recent` |
| "이 프로젝트 상태가 뭐지" | `summary` |
| 특정 노트 전문 보기 | `read` |
```

- [ ] **Step 2: Commit**

```bash
git add skills/wiki/SKILL.md
git commit -m "feat: add wiki SKILL.md for Claude Code integration"
```

---

## Task 11: 기존 스킬 이관 — 수정 없이 복사 (5개)

**Files:**
- Create: `skills/generate-context/SKILL.md` (from `~/.claude/skills/generate-context/SKILL.md`)
- Create: `skills/create-design-md/` (from `~/.claude/skills/create-design-md/` — 전체 복사)
- Create: `skills/go/SKILL.md` (from `~/.claude/skills/go/SKILL.md`)
- Create: `skills/web-capture/` (from `~/.claude/skills/web-capture/` — 전체 복사)
- Create: `skills/atomic-commits/SKILL.md` (from `~/.claude/skills/atomic-commits/SKILL.md`)

- [ ] **Step 1: 디렉토리 생성 + 복사**

```bash
# 단일 파일 스킬
mkdir -p skills/generate-context skills/go skills/atomic-commits

cp ~/.claude/skills/generate-context/SKILL.md skills/generate-context/SKILL.md
cp ~/.claude/skills/go/SKILL.md skills/go/SKILL.md
cp ~/.claude/skills/atomic-commits/SKILL.md skills/atomic-commits/SKILL.md

# 서브파일 포함 스킬 (git 제외)
rsync -av --exclude='.git' --exclude='node_modules' ~/.claude/skills/create-design-md/ skills/create-design-md/
rsync -av --exclude='node_modules' --exclude='package-lock.json' ~/.claude/skills/web-capture/ skills/web-capture/
```

- [ ] **Step 2: 복사 확인**

```bash
find skills/ -name "SKILL.md" | sort
```

Expected: 7개 SKILL.md (wiki + 5개 이관 + 나중에 추가할 3개)

- [ ] **Step 3: Commit**

```bash
git add skills/generate-context/ skills/create-design-md/ skills/go/ skills/web-capture/ skills/atomic-commits/
git commit -m "chore: migrate 5 custom skills from ~/.claude/skills"
```

---

## Task 12: 기존 스킬 이관 + 수정 (3개 — vault 하드코딩 제거)

**Files:**
- Create: `skills/open/SKILL.md` (from `~/.claude/skills/open/SKILL.md`, 수정)
- Create: `skills/stop/SKILL.md` (from `~/.claude/skills/stop/SKILL.md`, 수정)
- Create: `skills/read-project/SKILL.md` (from `~/.claude/skills/read-project/SKILL.md`, 수정)

- [ ] **Step 1: open/SKILL.md 복사 후 수정**

`~/.claude/skills/open/SKILL.md`를 `skills/open/SKILL.md`로 복사.

변경 사항 — Step 3의 vault 하드코딩을 환경변수로 교체:

Before:
```
VAULT=~/Library/Mobile Documents/com~apple~CloudDocs/obsidian/hack-the-dongdong/hack-the-dongdong
```

After:
```bash
# wiki.env에서 vault 경로 로드
source ~/.claude/wiki.env 2>/dev/null
VAULT="$CLAUDE_WIKI_VAULT"

if [ -z "$VAULT" ]; then
  echo "⚠️ CLAUDE_WIKI_VAULT가 설정되지 않았습니다. setup/install.sh를 실행하세요."
  # vault 없이 git 상태만 표시하고 계속 진행
fi
```

나머지 로직은 그대로 유지.

- [ ] **Step 2: stop/SKILL.md 복사 후 수정**

`~/.claude/skills/stop/SKILL.md`를 `skills/stop/SKILL.md`로 복사.

변경 사항 — Part B의 B2 섹션:

Before:
```
VAULT=~/Library/Mobile Documents/com~apple~CloudDocs/obsidian/hack-the-dongdong/hack-the-dongdong
```

After:
```bash
# wiki.env에서 vault 경로 로드
source ~/.claude/wiki.env 2>/dev/null
VAULT="$CLAUDE_WIKI_VAULT"

if [ -z "$VAULT" ]; then
  echo "⚠️ CLAUDE_WIKI_VAULT가 설정되지 않았습니다. 위키 기록을 건너뜁니다."
  # Part C로 바로 이동
fi
```

나머지 로직은 그대로 유지.

- [ ] **Step 3: read-project/SKILL.md 복사 후 수정**

`~/.claude/skills/read-project/SKILL.md`를 `skills/read-project/SKILL.md`로 복사.

변경 사항 — Step 2의 vault 경로:

Before:
```
VAULT=~/Library/Mobile Documents/com~apple~CloudDocs/obsidian/hack-the-dongdong/hack-the-dongdong
```

After:
```bash
# wiki.env에서 vault 경로 로드
source ~/.claude/wiki.env 2>/dev/null
VAULT="$CLAUDE_WIKI_VAULT"

if [ -z "$VAULT" ]; then
  echo "프로젝트: $PROJECT — vault 경로 미설정. setup/install.sh를 실행하세요."
  # 여기서 종료
fi
```

나머지 로직은 그대로 유지.

- [ ] **Step 4: 확인**

각 파일에서 하드코딩된 vault 경로가 남아있지 않은지 확인:

```bash
grep -r "hack-the-dongdong" skills/
```

Expected: 결과 없음

- [ ] **Step 5: Commit**

```bash
git add skills/open/ skills/stop/ skills/read-project/
git commit -m "chore: migrate open/stop/read-project skills with env var support"
```

---

## Task 13: setup/install.sh

**Files:**
- Create: `setup/install.sh`

- [ ] **Step 1: install.sh 작성**

```bash
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
```

- [ ] **Step 2: 실행 권한 부여**

```bash
chmod +x setup/install.sh
```

- [ ] **Step 3: Commit**

```bash
git add setup/install.sh
git commit -m "feat: add install.sh for one-command setup"
```

---

## Task 14: 통합 테스트 + 최종 확인

- [ ] **Step 1: wiki.env 설정 확인**

```bash
cat ~/.claude/wiki.env
```

Expected: `CLAUDE_WIKI_VAULT` 경로가 올바른 vault를 가리킴

- [ ] **Step 2: CLI 전체 커맨드 테스트**

```bash
cd skills/wiki/cli

# help
bun run src/index.ts --help

# search
bun run src/index.ts search "인증"

# recent
bun run src/index.ts recent --days 30

# summary
bun run src/index.ts summary --all

# summary (specific)
bun run src/index.ts summary baegopax

# reindex
bun run src/index.ts reindex

# semantic (ollama 실행 중일 때)
bun run src/index.ts semantic "배포 전 확인할 것"
```

- [ ] **Step 3: 하드코딩 잔재 확인**

```bash
grep -r "hack-the-dongdong" skills/
grep -r "/Users/jidong" skills/
```

Expected: 두 명령 모두 결과 없음

- [ ] **Step 4: 스킬 목록 확인**

```bash
ls -d skills/*/
```

Expected:
```
skills/atomic-commits/
skills/create-design-md/
skills/generate-context/
skills/go/
skills/open/
skills/read-project/
skills/stop/
skills/web-capture/
skills/wiki/
```

- [ ] **Step 5: 최종 Commit (필요 시)**

남은 변경 사항이 있으면 커밋:

```bash
git add -A
git commit -m "chore: final cleanup and verification"
```
