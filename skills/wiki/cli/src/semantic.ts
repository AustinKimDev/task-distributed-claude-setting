import { loadConfig } from "./config";
import { existsSync } from "fs";
import { join } from "path";
import { search } from "./search";

interface SemanticOptions {
  top?: number;
  project?: string;
  type?: string;
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

/** Simple BM25-like keyword score */
function keywordScore(query: string, title: string, content: string, tags: string[]): number {
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
  if (terms.length === 0) return 0;

  const text = `${title} ${tags.join(" ")} ${content}`.toLowerCase();
  let matched = 0;
  let totalFreq = 0;

  for (const term of terms) {
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const matches = text.match(regex);
    if (matches) {
      matched++;
      // Log-scaled term frequency (BM25-like saturation)
      totalFreq += Math.log(1 + matches.length);
    }
  }

  // Term coverage (what % of query terms found) + frequency bonus
  const coverage = matched / terms.length;
  const freqBonus = totalFreq / (totalFreq + 1); // saturates at 1
  return coverage * 0.7 + freqBonus * 0.3;
}

/** Reciprocal Rank Fusion */
function rrfFuse(
  semanticResults: { path: string; score: number }[],
  keywordResults: { path: string; score: number }[],
  k: number = 60
): Map<string, number> {
  const scores = new Map<string, number>();

  for (let i = 0; i < semanticResults.length; i++) {
    const { path } = semanticResults[i];
    scores.set(path, (scores.get(path) ?? 0) + 1 / (k + i + 1));
  }

  for (let i = 0; i < keywordResults.length; i++) {
    const { path } = keywordResults[i];
    scores.set(path, (scores.get(path) ?? 0) + 1 / (k + i + 1));
  }

  return scores;
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
    await search(query, { project: opts.project, type: opts.type });
    return;
  }

  const lancedb = await import("@lancedb/lancedb");
  const db = await lancedb.connect(lancePath);
  let table;
  try { table = await db.openTable("notes"); }
  catch { console.log("임베딩 테이블이 없습니다. wiki reindex를 실행하세요."); return; }

  // --- Pre-filtering with WHERE clause ---
  const filters: string[] = [];
  if (opts.project) filters.push(`project = '${opts.project}'`);
  if (opts.type) filters.push(`type = '${opts.type}'`);

  const fetchLimit = topK * 5; // fetch more for RRF fusion
  let searchQuery = table.search(queryVec).distanceType("cosine").limit(fetchLimit);
  if (filters.length > 0) {
    searchQuery = searchQuery.where(filters.join(" AND "));
  }
  let vectorResults = await searchQuery.toArray();

  // --- Keyword scoring on vector results for hybrid fusion ---
  const semanticRanked = vectorResults.map((r: any) => ({
    path: r.path as string,
    score: 1 - (r._distance ?? 0),
    data: r,
  }));

  const keywordRanked = vectorResults
    .map((r: any) => ({
      path: r.path as string,
      score: keywordScore(query, r.title ?? "", r.content ?? "", Array.isArray(r.tags) ? r.tags : []),
      data: r,
    }))
    .sort((a, b) => b.score - a.score);

  // --- RRF Fusion ---
  const rrfScores = rrfFuse(semanticRanked, keywordRanked);

  // Build final results sorted by RRF score
  const dataMap = new Map<string, any>();
  for (const r of vectorResults) {
    dataMap.set(r.path, r);
  }

  const finalResults = Array.from(rrfScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK)
    .map(([path, rrfScore]) => {
      const r = dataMap.get(path)!;
      const semScore = 1 - (r._distance ?? 0);
      const kwScore = keywordScore(query, r.title ?? "", r.content ?? "", Array.isArray(r.tags) ? r.tags : []);
      return { ...r, rrfScore, semScore, kwScore };
    });

  if (finalResults.length === 0) {
    console.log(`"${query}"에 대한 시맨틱 검색 결과가 없습니다.`);
    return;
  }

  console.log(`## 시맨틱 검색: "${query}"\n`);
  for (const r of finalResults) {
    const snippet = (r.content as string).slice(0, 200).replace(/\n/g, " ");
    const meta = [r.type, r.project].filter(Boolean).join(" · ");
    const scores = `sem=${r.semScore.toFixed(3)} kw=${r.kwScore.toFixed(3)} rrf=${r.rrfScore.toFixed(4)}`;
    console.log(`### ${r.title} (${scores})`);
    if (meta) console.log(`> ${meta}`);
    console.log(`${snippet}...`);
    console.log(`📄 ${r.path}\n`);
  }
}
