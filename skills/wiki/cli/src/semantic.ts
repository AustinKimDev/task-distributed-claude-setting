import { loadConfig } from "./config";
import { existsSync } from "fs";
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
  } catch { return null; }
}

export async function semantic(query: string, opts: SemanticOptions = {}) {
  const config = loadConfig();
  const topK = opts.top ?? config.topK;
  const lancePath = join(config.dataDir, "embeddings.lance");

  if (!existsSync(lancePath)) {
    console.log("임베딩 인덱스가 없습니다. reindex를 먼저 실행합니다...\n");
    const { reindex } = await import("./reindex");
    await reindex();
    console.log("");
  }

  const queryVec = await embedQuery(query, config.embedModel);
  if (!queryVec) {
    console.log("⚠️ ollama가 실행되지 않았습니다. 키워드 검색으로 전환합니다.\n");
    await search(query, { project: opts.project });
    return;
  }

  const lancedb = await import("@lancedb/lancedb");
  const db = await lancedb.connect(lancePath);
  let table;
  try { table = await db.openTable("notes"); }
  catch { console.log("임베딩 테이블이 없습니다. wiki reindex를 실행하세요."); return; }

  let results = await table.search(queryVec).limit(topK * 2).toArray();
  if (opts.project) results = results.filter((r: any) => r.project === opts.project);
  results = results.slice(0, topK);

  if (results.length === 0) {
    console.log(`"${query}"에 대한 시맨틱 검색 결과가 없습니다.`);
    return;
  }

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
