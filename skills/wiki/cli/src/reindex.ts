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

interface NoteRecord extends IndexEntry {
  vector: number[];
}

function parseNote(filePath: string, vaultPath: string): IndexEntry | null {
  try {
    const raw = readFileSync(filePath, "utf-8");
    const { data, content } = matter(raw);
    const relPath = relative(vaultPath, filePath);
    const stat = statSync(filePath);
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch?.[1] ?? relPath.split("/").pop()?.replace(".md", "") ?? relPath;
    let project = data.project ?? "";
    if (!project && relPath.startsWith("프로젝트/")) {
      project = relPath.split("/")[1] ?? "";
    }
    return {
      path: relPath,
      title,
      content: content.trim().slice(0, 2000),
      project,
      type: data.type ?? "",
      tags: Array.isArray(data.tags) && data.tags.length > 0 ? data.tags : [""],
      created: String(data.created ?? ""),
      updated: String(data.updated ?? ""),
      mtime: stat.mtimeMs,
    };
  } catch { return null; }
}

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
  } catch { return null; }
}

async function isOllamaRunning(): Promise<boolean> {
  try {
    const res = await fetch("http://localhost:11434/api/tags");
    return res.ok;
  } catch { return false; }
}

export async function reindex(embeddingsOnly: boolean = false) {
  const config = loadConfig();
  const startTime = Date.now();
  mkdirSync(config.dataDir, { recursive: true });

  const glob = new Glob("**/*.md");
  const files: string[] = [];
  for await (const file of glob.scan({ cwd: config.vaultPath, absolute: true })) {
    const rel = relative(config.vaultPath, file);
    if (rel.startsWith("_소스/") || rel.startsWith(".")) continue;
    files.push(file);
  }

  const indexPath = join(config.dataDir, "index.json");
  let existingIndex: Record<string, IndexEntry> = {};
  if (existsSync(indexPath)) {
    try { existingIndex = JSON.parse(readFileSync(indexPath, "utf-8")); } catch { existingIndex = {}; }
  }

  const entries: IndexEntry[] = [];
  const changed: IndexEntry[] = [];
  for (const file of files) {
    const entry = parseNote(file, config.vaultPath);
    if (!entry) continue;
    entries.push(entry);
    const existing = existingIndex[entry.path];
    if (!existing || existing.mtime < entry.mtime) changed.push(entry);
  }

  if (!embeddingsOnly) {
    const indexMap: Record<string, IndexEntry> = {};
    for (const e of entries) indexMap[e.path] = e;
    writeFileSync(indexPath, JSON.stringify(indexMap, null, 2));
  }

  console.log(`총 ${entries.length}개 노트, ${changed.length}개 변경 감지`);

  const ollamaUp = await isOllamaRunning();
  if (!ollamaUp) {
    console.log("⚠️ ollama가 실행되지 않았습니다. 프론트매터 인덱스만 생성합니다.");
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n완료: ${entries.length}개 인덱싱, 임베딩 스킵 (${elapsed}s)`);
    return;
  }

  if (changed.length === 0) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`변경된 노트 없음, 임베딩 갱신 스킵 (${elapsed}s)`);
    return;
  }

  const lancedb = await import("@lancedb/lancedb");
  const db = await lancedb.connect(join(config.dataDir, "embeddings.lance"));
  const records: NoteRecord[] = [];
  let embedCount = 0;

  for (const entry of changed) {
    const textToEmbed = `${entry.title}\n\n${entry.content}`;
    const vector = await embed(textToEmbed, config.embedModel);
    if (!vector) { console.log(`  ⚠️ 임베딩 실패: ${entry.path}`); continue; }
    records.push({ ...entry, vector });
    embedCount++;
    if (embedCount % 10 === 0) console.log(`  ${embedCount}/${changed.length} 임베딩 완료...`);
  }

  const tableName = "notes";
  try {
    const table = await db.openTable(tableName);
    const changedPaths = changed.map((e) => e.path);
    for (const path of changedPaths) {
      await table.delete(`path = '${path.replace(/'/g, "''")}'`);
    }
    if (records.length > 0) await table.add(records);
  } catch {
    if (records.length > 0) await db.createTable(tableName, records);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n완료: ${entries.length}개 인덱싱, ${embedCount}개 임베딩 갱신 (${elapsed}s)`);
}
