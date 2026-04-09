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

  const index: Record<string, IndexEntry> = JSON.parse(readFileSync(indexPath, "utf-8"));
  let entries = Object.values(index)
    .filter((e) => e.mtime >= cutoff)
    .filter((e) => !opts.project || e.project === opts.project);

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
