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
