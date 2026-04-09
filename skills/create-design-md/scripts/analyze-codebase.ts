// analyze-codebase.ts
// Usage: bun run scripts/analyze-codebase.ts [project-root]
// Scans project for design-related files and outputs structured JSON report.

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

const FRAMEWORK_DEPS: Record<string, string> = {
  next: "Next.js",
  react: "React",
  vue: "Vue",
  svelte: "Svelte",
  "@angular/core": "Angular",
  tailwindcss: "Tailwind CSS",
  "styled-components": "styled-components",
  "@emotion/react": "Emotion",
  sass: "SCSS",
};

const DESIGN_PATTERNS: { category: string; patterns: string[]; type: string }[] = [
  { category: "CSS Variables", patterns: ["**/*.css"], type: "css" },
  { category: "SCSS Variables", patterns: ["**/*.scss", "**/*.sass"], type: "scss" },
  { category: "Tailwind Config", patterns: ["tailwind.config.*"], type: "tailwind" },
  { category: "Design Tokens", patterns: ["**/tokens.json", "**/tokens.yaml", "**/tokens.yml", "**/design-tokens.*"], type: "tokens" },
  { category: "Theme Files", patterns: ["**/theme.ts", "**/theme.js", "**/theme.tsx", "**/colors.swift", "**/Colors.kt", "**/Theme.kt"], type: "theme" },
  { category: "Design Docs", patterns: ["DESIGN.md", "**/style-guide.*", "**/design-system.*"], type: "docs" },
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

  const pkgPath = join(PROJECT_ROOT, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = await Bun.file(pkgPath).json();
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      for (const [dep, framework] of Object.entries(FRAMEWORK_DEPS)) {
        if (dep in allDeps) frameworks.push(framework);
      }
      if (existsSync(join(PROJECT_ROOT, "bun.lockb"))) packageManager = "bun";
      else if (existsSync(join(PROJECT_ROOT, "pnpm-lock.yaml"))) packageManager = "pnpm";
      else if (existsSync(join(PROJECT_ROOT, "yarn.lock"))) packageManager = "yarn";
      else if (existsSync(join(PROJECT_ROOT, "package-lock.json"))) packageManager = "npm";
    } catch { /* ignore */ }
  }

  return { detected: [...new Set(detected)], packageManager, frameworks };
}

async function findDesignFiles(): Promise<{ groups: DesignFileGroup[]; docs: string[] }> {
  const groups: DesignFileGroup[] = [];
  const docs: string[] = [];

  for (const pattern of DESIGN_PATTERNS) {
    const files: DesignFileGroup["files"] = [];

    for (const globPattern of pattern.patterns) {
      const g = new Bun.Glob(globPattern);
      for await (const filePath of g.scan({ cwd: PROJECT_ROOT, dot: false })) {
        // Skip node_modules, .git, etc.
        if (filePath.includes("node_modules/") || filePath.includes(".git/") || filePath.includes("dist/") || filePath.includes("build/")) continue;

        const fullPath = join(PROJECT_ROOT, filePath);
        try {
          const content = await Bun.file(fullPath).text();

          // For CSS/SCSS, only include files with variables
          if ((pattern.type === "css" || pattern.type === "scss") && !content.match(/--[\w-]+\s*:|^\$[\w-]+\s*:/m)) continue;

          const preview = content.split("\n").slice(0, 20).join("\n");

          if (pattern.type === "docs") docs.push(filePath);

          files.push({
            path: filePath,
            type: pattern.type,
            preview: preview.length > 500 ? preview.slice(0, 500) + "..." : preview,
          });
        } catch { /* skip unreadable */ }

        if (files.length >= 10) break; // Cap per category
      }
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
    existingDesignDocs: docs,
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
