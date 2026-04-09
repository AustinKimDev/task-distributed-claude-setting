import { loadConfig } from "./config";
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

export async function summary(projectOrFlag: string) {
  const config = loadConfig();
  if (projectOrFlag === "--all") return summaryAll(config.vaultPath);
  return summaryProject(projectOrFlag, config.vaultPath);
}

function summaryAll(vaultPath: string) {
  const projectsDir = join(vaultPath, "프로젝트");
  if (!existsSync(projectsDir)) { console.log("프로젝트 폴더가 없습니다."); return; }

  const projects = readdirSync(projectsDir).filter((f) => {
    const p = join(projectsDir, f);
    return statSync(p).isDirectory() && !f.startsWith(".");
  });

  if (projects.length === 0) { console.log("등록된 프로젝트가 없습니다."); return; }

  console.log("## 전체 프로젝트\n");
  for (const name of projects) {
    const overviewPath = join(projectsDir, name, "개요.md");
    let desc = "";
    if (existsSync(overviewPath)) {
      const content = readFileSync(overviewPath, "utf-8");
      const lines = content.split("\n").filter((l) => l.trim() && !l.startsWith("#") && !l.startsWith("---"));
      desc = lines[0]?.trim().slice(0, 80) ?? "";
    }
    console.log(`- **${name}** — ${desc || "(개요 없음)"}`);
  }
}

function summaryProject(project: string, vaultPath: string) {
  const projectDir = join(vaultPath, "프로젝트", project);
  if (!existsSync(projectDir)) { console.log(`프로젝트 "${project}"의 위키 노트가 없습니다.`); return; }

  console.log(`## ${project}\n`);

  const overviewPath = join(projectDir, "개요.md");
  if (existsSync(overviewPath)) {
    const content = readFileSync(overviewPath, "utf-8");
    const body = content.replace(/^---[\s\S]*?---\n*/, "").trim();
    console.log(body.slice(0, 500));
    console.log("");
  }

  const decisionsDir = join(projectDir, "결정");
  if (existsSync(decisionsDir)) {
    const files = readdirSync(decisionsDir).filter((f) => f.endsWith(".md")).sort().reverse().slice(0, 3);
    if (files.length > 0) {
      console.log("### 최근 결정\n");
      for (const f of files) {
        const content = readFileSync(join(decisionsDir, f), "utf-8");
        const titleMatch = content.match(/^#\s+(.+)$/m);
        console.log(`- ${titleMatch?.[1] ?? f.replace(".md", "")}`);
      }
      console.log("");
    }
  }

  const learningsDir = join(projectDir, "배운점");
  if (existsSync(learningsDir)) {
    const files = readdirSync(learningsDir).filter((f) => f.endsWith(".md")).sort().reverse().slice(0, 3);
    if (files.length > 0) {
      console.log("### 최근 배운점\n");
      for (const f of files) {
        const content = readFileSync(join(learningsDir, f), "utf-8");
        const titleMatch = content.match(/^#\s+(.+)$/m);
        console.log(`- ${titleMatch?.[1] ?? f.replace(".md", "")}`);
      }
      console.log("");
    }
  }
}
