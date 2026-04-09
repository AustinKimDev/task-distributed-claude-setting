#!/usr/bin/env bun
/**
 * Mixing Playground Server
 * Watches content-dir for HTML files, serves newest wrapped in frame,
 * pushes SSE reload events, and records user click events.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from "fs";
import { join, resolve } from "path";

// --- Parse args ---
const args = process.argv.slice(2);
function getArg(name: string): string | undefined {
  const idx = args.indexOf(name);
  return idx !== -1 ? args[idx + 1] : undefined;
}

const contentDir = resolve(getArg("--content-dir") ?? "./content");
const stateDir   = resolve(getArg("--state-dir")   ?? "./state");
const port       = parseInt(getArg("--port") ?? "0", 10);

mkdirSync(contentDir, { recursive: true });
mkdirSync(stateDir,   { recursive: true });

const eventsFile  = join(stateDir, "events.jsonl");
const serverInfo  = join(stateDir, "server-info.json");

// --- SSE clients ---
const sseClients = new Set<ReadableStreamDefaultController>();

function notifySseClients(event: string, data: string) {
  const msg = `event: ${event}\ndata: ${data}\n\n`;
  for (const ctrl of sseClients) {
    try { ctrl.enqueue(msg); } catch { sseClients.delete(ctrl); }
  }
}

// --- Helpers & templates ---
const HELPERS_PATH  = join(import.meta.dir, "templates", "helpers.js");
const FRAME_PATH    = join(import.meta.dir, "templates", "frame.html");
const STYLES_PATH   = join(import.meta.dir, "public",    "styles.css");

function loadText(path: string, fallback = ""): string {
  try { return readFileSync(path, "utf8"); } catch { return fallback; }
}

function getNewestHtmlFile(): string | null {
  if (!existsSync(contentDir)) return null;
  const files = readdirSync(contentDir)
    .filter(f => f.endsWith(".html"))
    .map(f => ({ name: f, mtime: statSync(join(contentDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return files.length > 0 ? join(contentDir, files[0].name) : null;
}

function buildResponse(): string {
  const file = getNewestHtmlFile();
  if (!file) {
    return `<!DOCTYPE html><html><body><p style="color:#888;font-family:sans-serif;padding:2rem;">Waiting for content...</p></body></html>`;
  }

  const content  = readFileSync(file, "utf8");
  const helpers  = loadText(HELPERS_PATH);
  const styles   = loadText(STYLES_PATH);

  // Full HTML document: just inject helpers before </body>
  if (/^\s*<!DOCTYPE|^\s*<html/i.test(content)) {
    return content.replace(/<\/body>/i, `<script>${helpers}</script>\n</body>`);
  }

  // Partial fragment: wrap in frame template
  const frame = loadText(FRAME_PATH);
  return frame
    .replace("{{STYLES}}",  styles)
    .replace("{{CONTENT}}", content)
    .replace("{{HELPERS}}", helpers);
}

// --- File watcher ---
let lastSeen: string | null = null;

async function watchContentDir() {
  const watcher = Bun.FileSystemRouter
    ? null  // fallback to polling if FSRouter not available
    : null;

  // Use Bun's native fs watch
  try {
    const { watch } = await import("fs");
    watch(contentDir, { persistent: true }, (_event, filename) => {
      if (!filename?.endsWith(".html")) return;
      const newest = getNewestHtmlFile();
      if (newest && newest !== lastSeen) {
        lastSeen = newest;
        // Clear events log for fresh session
        try { writeFileSync(eventsFile, ""); } catch { /* ignore */ }
        notifySseClients("reload", JSON.stringify({ file: filename, ts: Date.now() }));
      }
    });
  } catch (err) {
    console.error("File watch error:", err);
  }
}

// --- Server ---
const server = Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);

    // SSE stream
    if (url.pathname === "/events") {
      const stream = new ReadableStream({
        start(ctrl) {
          sseClients.add(ctrl);
          // Send initial ping
          ctrl.enqueue(": ping\n\n");
          req.signal.addEventListener("abort", () => {
            sseClients.delete(ctrl);
            try { ctrl.close(); } catch { /* already closed */ }
          });
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type":  "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection":    "keep-alive",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Record events
    if (url.pathname === "/record" && req.method === "POST") {
      try {
        const body = await req.json();
        const line = JSON.stringify({ ...body, ts: Date.now() }) + "\n";
        const existing = existsSync(eventsFile) ? readFileSync(eventsFile, "utf8") : "";
        writeFileSync(eventsFile, existing + line);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ ok: false }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
    }

    // Styles
    if (url.pathname === "/styles.css") {
      const css = loadText(STYLES_PATH, "/* no styles */");
      return new Response(css, { headers: { "Content-Type": "text/css" } });
    }

    // Root — serve newest HTML wrapped in frame
    if (url.pathname === "/") {
      const html = buildResponse();
      return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    return new Response("Not found", { status: 404 });
  },
});

// Write server info
const info = {
  pid:  process.pid,
  port: server.port,
  url:  `http://localhost:${server.port}`,
  contentDir,
  stateDir,
  startedAt: new Date().toISOString(),
};
writeFileSync(serverInfo, JSON.stringify(info, null, 2));

console.log(JSON.stringify(info));

// Start watching
await watchContentDir();
