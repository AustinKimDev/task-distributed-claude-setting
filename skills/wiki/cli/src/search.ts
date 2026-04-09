import { loadConfig } from "./config";
import { join } from "path";

interface SearchOptions {
  project?: string;
  type?: string;
}

export async function search(query: string, opts: SearchOptions = {}) {
  const config = loadConfig();
  let searchPath = config.vaultPath;

  if (opts.project) {
    searchPath = join(config.vaultPath, "프로젝트", opts.project);
  }

  const args = [
    "rg",
    "--type", "md",
    "--ignore-case",
    "--max-count", "3",
    "--context", "1",
    "--heading",
    "--color", "never",
    query,
    searchPath,
  ];

  const proc = Bun.spawn(args, { stdout: "pipe", stderr: "pipe" });
  const stdout = await new Response(proc.stdout).text();
  await proc.exited;

  if (!stdout.trim()) {
    console.log(`"${query}"에 대한 검색 결과가 없습니다.`);
    return;
  }

  if (opts.type) {
    const filtered = await filterByType(stdout, opts.type, config.vaultPath);
    console.log(filtered || `"${query}" (type: ${opts.type}) 검색 결과 없음`);
    return;
  }

  const output = stdout.replaceAll(config.vaultPath + "/", "");
  console.log(`## 검색 결과: "${query}"\n\n${output}`);
}

async function filterByType(rgOutput: string, type: string, vaultPath: string): Promise<string> {
  const files = new Set<string>();
  for (const line of rgOutput.split("\n")) {
    if (line && !line.startsWith("-") && !line.startsWith(" ") && !line.includes(":") && line.trim()) {
      files.add(line.trim());
    }
  }

  const typeMap: Record<string, string> = {
    learning: "learning",
    decision: "decision",
    knowhow: "knowhow",
  };
  const targetType = typeMap[type];
  if (!targetType) {
    return rgOutput.replaceAll(vaultPath + "/", "");
  }

  const matching: string[] = [];
  for (const file of files) {
    try {
      const content = await Bun.file(file).text();
      if (content.includes(`type: ${targetType}`)) {
        const section = extractFileSection(rgOutput, file);
        if (section) matching.push(section.replaceAll(vaultPath + "/", ""));
      }
    } catch { /* skip */ }
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
      if (line === "" && sections.length > 1) break;
      sections.push(line);
    }
  }
  return sections.join("\n");
}
