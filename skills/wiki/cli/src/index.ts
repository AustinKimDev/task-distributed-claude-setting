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
  wiki semantic <query> [--top <n>] [--project <name>] [--type <type>]
  wiki recent [--project <name>] [--days <n>]
  wiki summary <project|--all>
  wiki reindex [--embeddings-only] [--force]
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
      if (next && !next.startsWith("--")) { flags[key] = next; i++; }
      else flags[key] = "true";
    } else positional.push(arg);
  }
  return { flags, positional };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === "help" || args[0] === "--help") { console.log(HELP); return; }

  const command = args[0];
  const rest = args.slice(1);
  const { flags, positional } = parseArgs(rest);

  switch (command) {
    case "search": {
      const query = positional.join(" ");
      if (!query) { console.error("Usage: wiki search <query>"); process.exit(1); }
      await search(query, { project: flags.project, type: flags.type });
      break;
    }
    case "semantic": {
      const query = positional.join(" ");
      if (!query) { console.error("Usage: wiki semantic <query>"); process.exit(1); }
      await semantic(query, { top: flags.top ? parseInt(flags.top, 10) : undefined, project: flags.project, type: flags.type });
      break;
    }
    case "recent": {
      await recent({ project: flags.project, days: flags.days ? parseInt(flags.days, 10) : undefined });
      break;
    }
    case "summary": {
      const target = flags.all === "true" ? "--all" : positional[0];
      if (!target) { console.error("Usage: wiki summary <project|--all>"); process.exit(1); }
      await summary(target);
      break;
    }
    case "reindex": {
      await reindex(flags["embeddings-only"] === "true", flags.force === "true");
      break;
    }
    case "read": {
      const path = positional.join(" ");
      if (!path) { console.error("Usage: wiki read <path>"); process.exit(1); }
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
