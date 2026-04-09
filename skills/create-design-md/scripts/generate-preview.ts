#!/usr/bin/env bun
/**
 * generate-preview.ts
 * Parses a DESIGN.md file and generates a self-contained preview.html
 * Usage: bun run scripts/generate-preview.ts <design-md-path> [--dark]
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";

// ── Types ──────────────────────────────────────────────────────────────────

interface ColorToken {
  name: string;
  hex: string;
  role: string;
}

interface TypographyRow {
  level: string;
  size: string;
  weight: string;
  lineHeight: string;
  usage: string;
}

interface ShadowRow {
  level: string;
  value: string;
  usage: string;
}

interface DesignTokens {
  title: string;
  colors: ColorToken[];
  typography: TypographyRow[];
  shadows: ShadowRow[];
}

// ── Parsers ────────────────────────────────────────────────────────────────

function parseColors(md: string): ColorToken[] {
  const colors: ColorToken[] = [];

  // Pattern 1: **Name** (`#hex`): description
  const pattern1 =
    /\*\*([^*]+)\*\*\s*\(`(#[0-9a-fA-F]{3,8})`\)\s*[:\-–]?\s*([^\n]*)/g;
  let m: RegExpExecArray | null;
  while ((m = pattern1.exec(md)) !== null) {
    colors.push({
      name: m[1].trim(),
      hex: m[2].trim(),
      role: m[3].trim(),
    });
  }

  // Pattern 2: - **Name**: `#hex` — description  (fallback)
  if (colors.length === 0) {
    const pattern2 =
      /[-*]\s+\*\*([^*]+)\*\*[:\s]+`(#[0-9a-fA-F]{3,8})`[^\n]*/g;
    while ((m = pattern2.exec(md)) !== null) {
      colors.push({
        name: m[1].trim(),
        hex: m[2].trim(),
        role: "",
      });
    }
  }

  // Pattern 3: bare hex in table cells | Name | #hex | role |
  if (colors.length === 0) {
    const pattern3 =
      /\|\s*([^|]+?)\s*\|\s*(#[0-9a-fA-F]{3,8})\s*\|\s*([^|]*)\s*\|/g;
    while ((m = pattern3.exec(md)) !== null) {
      const name = m[1].replace(/\*\*/g, "").trim();
      if (name && name !== "Name" && name !== "Color" && !name.startsWith("-")) {
        colors.push({ name, hex: m[2].trim(), role: m[3].trim() });
      }
    }
  }

  return colors;
}

function parseMarkdownTable(section: string): string[][] {
  const rows: string[][] = [];
  for (const line of section.split("\n")) {
    if (!line.includes("|")) continue;
    const trimmed = line.trim();
    if (trimmed.startsWith("|") || trimmed.includes("|")) {
      // skip separator rows
      if (/^\|[\s\-|:]+\|$/.test(trimmed)) continue;
      const cells = trimmed
        .split("|")
        .map((c) => c.trim())
        .filter((c) => c !== "");
      if (cells.length > 1) rows.push(cells);
    }
  }
  return rows;
}

function parseTypography(md: string): TypographyRow[] {
  // Find typography section
  const typoMatch = md.match(
    /##[#]?\s*Typography[\s\S]*?(?=\n##[^#]|\n###|\Z)/i
  );
  const section = typoMatch ? typoMatch[0] : md;

  const rows = parseMarkdownTable(section);
  if (rows.length < 2) return [];

  const header = rows[0].map((h) => h.toLowerCase());
  const levelIdx = header.findIndex((h) => h.includes("level") || h.includes("style") || h.includes("element"));
  const sizeIdx = header.findIndex((h) => h.includes("size") || h.includes("font"));
  const weightIdx = header.findIndex((h) => h.includes("weight"));
  const lineIdx = header.findIndex((h) => h.includes("line") || h.includes("height"));
  const usageIdx = header.findIndex((h) => h.includes("usage") || h.includes("use") || h.includes("desc"));

  return rows.slice(1).map((row) => ({
    level: row[levelIdx >= 0 ? levelIdx : 0] ?? "",
    size: row[sizeIdx >= 0 ? sizeIdx : 1] ?? "",
    weight: row[weightIdx >= 0 ? weightIdx : 2] ?? "",
    lineHeight: row[lineIdx >= 0 ? lineIdx : 3] ?? "",
    usage: row[usageIdx >= 0 ? usageIdx : row.length - 1] ?? "",
  }));
}

function parseShadows(md: string): ShadowRow[] {
  // Find shadow/elevation section — handles "## 6. Depth & Elevation" style headings
  const shadowMatch = md.match(
    /##[#]?\s*(?:\d+\.\s*)?(Shadow|Elevation|Depth)[^\n]*\n[\s\S]*?(?=\n##[^#]|\Z)/i
  );
  const section = shadowMatch ? shadowMatch[0] : "";
  if (!section) return [];

  const rows = parseMarkdownTable(section);
  if (rows.length < 2) return [];

  const header = rows[0].map((h) => h.toLowerCase());
  const levelIdx = header.findIndex((h) => h.includes("level") || h.includes("name") || h.includes("elevation"));
  const valueIdx = header.findIndex((h) => h.includes("value") || h.includes("css") || h.includes("shadow"));
  const usageIdx = header.findIndex((h) => h.includes("usage") || h.includes("use") || h.includes("desc"));

  return rows.slice(1).map((row) => ({
    level: row[levelIdx >= 0 ? levelIdx : 0] ?? "",
    value: row[valueIdx >= 0 ? valueIdx : 1] ?? "",
    usage: row[usageIdx >= 0 ? usageIdx : row.length - 1] ?? "",
  }));
}

function extractTitle(md: string): string {
  const m = md.match(/^#\s+(.+)/m);
  return m ? m[1].trim() : "Design System";
}

function parseDesignMd(mdContent: string): DesignTokens {
  return {
    title: extractTitle(mdContent),
    colors: parseColors(mdContent),
    typography: parseTypography(mdContent),
    shadows: parseShadows(mdContent),
  };
}

// ── HTML Generation ────────────────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.replace("#", "");
  if (cleaned.length === 3) {
    return {
      r: parseInt(cleaned[0] + cleaned[0], 16),
      g: parseInt(cleaned[1] + cleaned[1], 16),
      b: parseInt(cleaned[2] + cleaned[2], 16),
    };
  }
  if (cleaned.length === 6 || cleaned.length === 8) {
    return {
      r: parseInt(cleaned.slice(0, 2), 16),
      g: parseInt(cleaned.slice(2, 4), 16),
      b: parseInt(cleaned.slice(4, 6), 16),
    };
  }
  return null;
}

function contrastColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#000000";
  const luminance = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
  return luminance > 140 ? "#1a1a1a" : "#ffffff";
}

function parseFontSize(size: string): string {
  // Try to extract a usable CSS font-size
  const m = size.match(/(\d+(?:\.\d+)?)\s*(px|rem|em|pt)?/i);
  if (!m) return "1rem";
  const val = parseFloat(m[1]);
  const unit = (m[2] || "px").toLowerCase();
  if (unit === "px") return `${val}px`;
  if (unit === "rem" || unit === "em") return `${val}rem`;
  return `${val}px`;
}

function parseFontWeight(weight: string): string {
  const map: Record<string, string> = {
    thin: "100",
    extralight: "200",
    light: "300",
    regular: "400",
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    extrabold: "800",
    black: "900",
  };
  const lower = weight.toLowerCase().replace(/[\s-]/g, "");
  return map[lower] ?? weight;
}

function generateColorSection(colors: ColorToken[]): string {
  if (colors.length === 0) return "<p class='empty'>No color tokens found.</p>";

  const swatches = colors
    .map((c) => {
      const textColor = contrastColor(c.hex);
      return `
      <div class="swatch">
        <div class="swatch-color" style="background:${c.hex};color:${textColor}">
          <span class="swatch-hex">${c.hex}</span>
        </div>
        <div class="swatch-info">
          <span class="swatch-name">${escHtml(c.name)}</span>
          ${c.role ? `<span class="swatch-role">${escHtml(c.role)}</span>` : ""}
        </div>
      </div>`;
    })
    .join("\n");

  return `<div class="swatch-grid">${swatches}</div>`;
}

function generateTypographySection(rows: TypographyRow[]): string {
  if (rows.length === 0) return "<p class='empty'>No typography data found.</p>";

  const samples = rows
    .map((row) => {
      const fontSize = parseFontSize(row.size);
      const fontWeight = parseFontWeight(row.weight);
      const lineHeight = row.lineHeight || "1.5";
      const label = row.level || "Text";
      const sampleText = `${label} — The quick brown fox`;
      return `
      <div class="typo-row">
        <div class="typo-sample" style="font-size:${fontSize};font-weight:${fontWeight};line-height:${lineHeight}">${escHtml(sampleText)}</div>
        <div class="typo-meta">
          <span class="typo-tag">${escHtml(row.size)}</span>
          <span class="typo-tag">${escHtml(row.weight)}</span>
          ${row.lineHeight ? `<span class="typo-tag">lh: ${escHtml(row.lineHeight)}</span>` : ""}
          ${row.usage ? `<span class="typo-usage">${escHtml(row.usage)}</span>` : ""}
        </div>
      </div>`;
    })
    .join("\n");

  return `<div class="typo-list">${samples}</div>`;
}

function generateShadowSection(rows: ShadowRow[]): string {
  if (rows.length === 0) return "<p class='empty'>No shadow/elevation data found.</p>";

  const items = rows
    .map((row) => {
      // Clean up the shadow value for direct CSS use
      const shadowCss = row.value.replace(/`/g, "").trim();
      return `
      <div class="shadow-item">
        <div class="shadow-box" style="box-shadow:${escAttr(shadowCss)}">
          <span class="shadow-level">${escHtml(row.level)}</span>
        </div>
        <div class="shadow-meta">
          <code class="shadow-value">${escHtml(row.value)}</code>
          ${row.usage ? `<span class="shadow-usage">${escHtml(row.usage)}</span>` : ""}
        </div>
      </div>`;
    })
    .join("\n");

  return `<div class="shadow-grid">${items}</div>`;
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escAttr(str: string): string {
  return str.replace(/"/g, "&quot;");
}

function generateHtml(tokens: DesignTokens, dark: boolean): string {
  const bg = dark ? "#0f0f0f" : "#f8f8f8";
  const surface = dark ? "#1a1a1a" : "#ffffff";
  const textPrimary = dark ? "#f0f0f0" : "#111111";
  const textSecondary = dark ? "#a0a0a0" : "#666666";
  const border = dark ? "#2a2a2a" : "#e4e4e4";
  const accent = dark ? "#6b9eff" : "#2563eb";
  const tagBg = dark ? "#2a2a2a" : "#f1f5f9";
  const tagColor = dark ? "#c0c0c0" : "#475569";
  const codeBg = dark ? "#252525" : "#f1f5f9";
  const mode = dark ? "Dark" : "Light";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(tokens.title)} — Design Preview (${mode})</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: ${bg};
      color: ${textPrimary};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      padding: 40px 24px 80px;
    }

    .container { max-width: 960px; margin: 0 auto; }

    header {
      margin-bottom: 48px;
      border-bottom: 1px solid ${border};
      padding-bottom: 24px;
    }
    header h1 {
      font-size: 28px;
      font-weight: 700;
      color: ${textPrimary};
    }
    header .badge {
      display: inline-block;
      margin-top: 8px;
      padding: 3px 10px;
      border-radius: 999px;
      background: ${tagBg};
      color: ${tagColor};
      font-size: 12px;
      font-weight: 500;
    }

    section { margin-bottom: 56px; }
    section h2 {
      font-size: 20px;
      font-weight: 600;
      color: ${textPrimary};
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid ${border};
    }

    .empty { color: ${textSecondary}; font-style: italic; }

    /* ── Colors ── */
    .swatch-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 12px;
    }
    .swatch {
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid ${border};
      background: ${surface};
    }
    .swatch-color {
      height: 80px;
      display: flex;
      align-items: flex-end;
      padding: 8px;
    }
    .swatch-hex {
      font-size: 11px;
      font-weight: 600;
      font-family: monospace;
      opacity: 0.85;
    }
    .swatch-info {
      padding: 8px 10px 10px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .swatch-name {
      font-size: 12px;
      font-weight: 600;
      color: ${textPrimary};
    }
    .swatch-role {
      font-size: 11px;
      color: ${textSecondary};
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* ── Typography ── */
    .typo-list { display: flex; flex-direction: column; gap: 0; }
    .typo-row {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      gap: 16px;
      padding: 16px 0;
      border-bottom: 1px solid ${border};
    }
    .typo-row:last-child { border-bottom: none; }
    .typo-sample {
      color: ${textPrimary};
      word-break: break-word;
    }
    .typo-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      justify-content: flex-end;
      flex-shrink: 0;
      max-width: 220px;
    }
    .typo-tag {
      padding: 2px 8px;
      border-radius: 4px;
      background: ${tagBg};
      color: ${tagColor};
      font-size: 11px;
      font-family: monospace;
      white-space: nowrap;
    }
    .typo-usage {
      font-size: 11px;
      color: ${textSecondary};
      width: 100%;
      text-align: right;
    }

    /* ── Shadows ── */
    .shadow-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 20px;
    }
    .shadow-item {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .shadow-box {
      height: 100px;
      border-radius: 8px;
      background: ${surface};
      border: 1px solid ${border};
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .shadow-level {
      font-size: 12px;
      font-weight: 600;
      color: ${textSecondary};
    }
    .shadow-meta {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .shadow-value {
      font-size: 11px;
      padding: 4px 8px;
      border-radius: 4px;
      background: ${codeBg};
      color: ${accent};
      word-break: break-all;
    }
    .shadow-usage {
      font-size: 11px;
      color: ${textSecondary};
    }

    footer {
      margin-top: 60px;
      text-align: center;
      font-size: 12px;
      color: ${textSecondary};
      border-top: 1px solid ${border};
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${escHtml(tokens.title)}</h1>
      <span class="badge">${mode} Mode Preview</span>
    </header>

    <section id="colors">
      <h2>Color Palette (${tokens.colors.length} tokens)</h2>
      ${generateColorSection(tokens.colors)}
    </section>

    <section id="typography">
      <h2>Typography</h2>
      ${generateTypographySection(tokens.typography)}
    </section>

    <section id="shadows">
      <h2>Shadows &amp; Elevation</h2>
      ${generateShadowSection(tokens.shadows)}
    </section>

    <footer>Generated from DESIGN.md — ${new Date().toISOString().slice(0, 10)}</footer>
  </div>
</body>
</html>`;
}

// ── Main ───────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const darkFlag = args.includes("--dark");
  const inputPath = args.find((a) => !a.startsWith("--"));

  if (!inputPath) {
    console.error("Usage: bun run scripts/generate-preview.ts <design-md-path> [--dark]");
    process.exit(1);
  }

  const absInput = resolve(inputPath);
  let mdContent: string;
  try {
    mdContent = readFileSync(absInput, "utf-8");
  } catch (e) {
    console.error(`Error reading file: ${absInput}`);
    process.exit(1);
  }

  const tokens = parseDesignMd(mdContent);

  // Determine output directory — same dir as input file
  const outDir = dirname(absInput);

  // Light mode (always)
  const lightHtml = generateHtml(tokens, false);
  const lightOut = resolve(outDir, "preview.html");
  writeFileSync(lightOut, lightHtml, "utf-8");
  console.log(`preview.html written → ${lightOut}`);
  console.log(`  Colors: ${tokens.colors.length}, Typography rows: ${tokens.typography.length}, Shadow rows: ${tokens.shadows.length}`);

  // Dark mode (optional)
  if (darkFlag) {
    const darkHtml = generateHtml(tokens, true);
    const darkOut = resolve(outDir, "preview-dark.html");
    writeFileSync(darkOut, darkHtml, "utf-8");
    console.log(`preview-dark.html written → ${darkOut}`);
  }
}

main();
