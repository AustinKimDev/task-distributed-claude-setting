#!/usr/bin/env node

/**
 * web-capture/scripts/capture.js
 *
 * Playwright-based parallel screenshot capture tool.
 *
 * Usage:
 *   node capture.js --help
 *   node capture.js \
 *     --url http://localhost:3000 \
 *     --output /path/to/.screenshots \
 *     --pages '/' '/sessions' '/targets' \
 *     --devices desktop,mobile \
 *     --interactive '[{"url":"/targets","action":"click","selector":"button:has-text(\"추가\")","name":"targets-add-modal"}]'
 */

'use strict';

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// ---------------------------------------------------------------------------
// Playwright bootstrap — install locally if missing
// ---------------------------------------------------------------------------
function ensurePlaywright() {
  try {
    require.resolve('playwright');
  } catch {
    console.error('[web-capture] playwright not found. Running npm install...');
    const scriptDir = path.dirname(path.resolve(__filename));
    execSync('npm install', { cwd: scriptDir, stdio: 'inherit' });
    console.error('[web-capture] Installing Chromium browser...');
    execSync('npx playwright install chromium', { cwd: scriptDir, stdio: 'inherit' });
  }
}
ensurePlaywright();

const { chromium } = require('playwright');

// ---------------------------------------------------------------------------
// Device configs
// ---------------------------------------------------------------------------
const DEVICE_CONFIGS = {
  desktop: {
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  },
  mobile: {
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  },
  tablet: {
    viewport: { width: 820, height: 1180 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  },
};

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const result = {
    url: null,
    output: null,
    pages: ['/'],
    devices: ['desktop'],
    interactive: [],
    timeout: 30000,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--url':
        result.url = args[++i];
        break;
      case '--output':
        result.output = args[++i];
        break;
      case '--pages':
        // Collect all non-flag tokens that follow
        result.pages = [];
        while (i + 1 < args.length && !args[i + 1].startsWith('--')) {
          result.pages.push(args[++i]);
        }
        break;
      case '--devices':
        result.devices = args[++i].split(',').map((d) => d.trim());
        break;
      case '--interactive':
        try {
          result.interactive = JSON.parse(args[++i]);
        } catch (e) {
          console.error('[web-capture] ERROR: --interactive must be valid JSON array');
          process.exit(1);
        }
        break;
      case '--timeout':
        result.timeout = parseInt(args[++i], 10);
        break;
      default:
        console.error(`[web-capture] Unknown argument: ${args[i]}`);
        process.exit(1);
    }
  }

  if (!result.url) {
    console.error('[web-capture] ERROR: --url is required');
    printHelp();
    process.exit(1);
  }
  if (!result.output) {
    console.error('[web-capture] ERROR: --output is required');
    printHelp();
    process.exit(1);
  }

  // Validate devices
  for (const d of result.devices) {
    if (!DEVICE_CONFIGS[d]) {
      console.error(
        `[web-capture] ERROR: unknown device "${d}". Valid: ${Object.keys(DEVICE_CONFIGS).join(', ')}`
      );
      process.exit(1);
    }
  }

  return result;
}

function printHelp() {
  console.log(`
web-capture — Playwright parallel screenshot tool

USAGE
  node capture.js [options]

OPTIONS
  --url       <string>   Base URL to capture (required)
  --output    <string>   Output directory for screenshots (required)
  --pages     <paths...> Space-separated URL paths (default: /)
  --devices   <list>     Comma-separated: desktop,mobile,tablet (default: desktop)
  --interactive <json>   JSON array of interactive captures (default: [])
  --timeout   <ms>       Navigation timeout in ms (default: 30000)
  --help                 Show this help

INTERACTIVE ITEM SCHEMA
  { "url": "/path", "action": "click|fill|hover", "selector": "css", "value": "text (for fill)", "name": "output-filename" }

EXAMPLES
  node capture.js --url http://localhost:3000 --output /tmp/shots --pages / /about --devices desktop,mobile

  node capture.js \\
    --url http://10.1.10.90:8000 \\
    --output /project/.screenshots \\
    --pages / /sessions /targets \\
    --devices desktop,mobile \\
    --interactive '[{"url":"/targets","action":"click","selector":"button","name":"targets-modal"}]'
`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function pageNameFromPath(urlPath) {
  const clean = urlPath.replace(/^\/+|\/+$/g, '');
  if (!clean) return 'dashboard';
  return clean.replace(/\//g, '-');
}

function buildFilename(pagePath, device) {
  return `${pageNameFromPath(pagePath)}_${device}.png`;
}

async function captureOne({ browser, baseUrl, pagePath, device, outputDir, timeout }) {
  const deviceConfig = DEVICE_CONFIGS[device];
  const fullUrl = baseUrl.replace(/\/$/, '') + pagePath;
  const filename = buildFilename(pagePath, device);
  const filepath = path.join(outputDir, filename);

  const context = await browser.newContext({
    viewport: deviceConfig.viewport,
    deviceScaleFactor: deviceConfig.deviceScaleFactor,
    isMobile: deviceConfig.isMobile || false,
    hasTouch: deviceConfig.hasTouch || false,
    ...(deviceConfig.userAgent ? { userAgent: deviceConfig.userAgent } : {}),
  });

  let page;
  try {
    page = await context.newPage();
    await page.goto(fullUrl, { waitUntil: 'networkidle', timeout });
    await page.screenshot({ path: filepath, fullPage: true });

    const stat = fs.statSync(filepath);
    return {
      file: filename,
      url: pagePath,
      device,
      size: stat.size,
      status: 'ok',
    };
  } catch (err) {
    console.error(`[web-capture] FAILED ${pagePath} @ ${device}: ${err.message}`);
    return {
      file: filename,
      url: pagePath,
      device,
      size: 0,
      status: 'error',
      error: err.message,
    };
  } finally {
    if (page) await page.close().catch(() => {});
    await context.close().catch(() => {});
  }
}

async function captureInteractive({ browser, baseUrl, item, outputDir, timeout }) {
  const { url: pagePath, action, selector, value, name } = item;
  const fullUrl = baseUrl.replace(/\/$/, '') + pagePath;
  const filename = name ? `${name}.png` : `interactive_${pageNameFromPath(pagePath)}.png`;
  const filepath = path.join(outputDir, filename);

  const context = await browser.newContext({
    viewport: DEVICE_CONFIGS.desktop.viewport,
    deviceScaleFactor: 1,
  });

  let page;
  try {
    page = await context.newPage();
    await page.goto(fullUrl, { waitUntil: 'networkidle', timeout });

    switch (action) {
      case 'click':
        await page.click(selector, { timeout });
        break;
      case 'fill':
        await page.fill(selector, value || '', { timeout });
        break;
      case 'hover':
        await page.hover(selector, { timeout });
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Wait for animations / modals to settle
    await page.waitForTimeout(500);
    await page.screenshot({ path: filepath, fullPage: true });

    const stat = fs.statSync(filepath);
    return {
      file: filename,
      url: pagePath,
      device: 'desktop',
      size: stat.size,
      status: 'ok',
      interactive: true,
      action,
    };
  } catch (err) {
    console.error(`[web-capture] FAILED interactive ${pagePath} [${action}]: ${err.message}`);
    return {
      file: filename,
      url: pagePath,
      device: 'desktop',
      size: 0,
      status: 'error',
      error: err.message,
      interactive: true,
    };
  } finally {
    if (page) await page.close().catch(() => {});
    await context.close().catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const opts = parseArgs(process.argv);

  // Ensure output directory exists
  fs.mkdirSync(opts.output, { recursive: true });

  const startTime = Date.now();

  console.error(`[web-capture] Base URL  : ${opts.url}`);
  console.error(`[web-capture] Output    : ${opts.output}`);
  console.error(`[web-capture] Pages     : ${opts.pages.join(' ')}`);
  console.error(`[web-capture] Devices   : ${opts.devices.join(', ')}`);
  console.error(
    `[web-capture] Captures  : ${opts.pages.length * opts.devices.length} normal + ${opts.interactive.length} interactive`
  );

  const browser = await chromium.launch({ headless: true });

  try {
    // Build all (page × device) combinations
    const normalTasks = [];
    for (const pagePath of opts.pages) {
      for (const device of opts.devices) {
        normalTasks.push({ pagePath, device });
      }
    }

    // Parallel normal captures
    const normalResults = await Promise.all(
      normalTasks.map(({ pagePath, device }) =>
        captureOne({
          browser,
          baseUrl: opts.url,
          pagePath,
          device,
          outputDir: opts.output,
          timeout: opts.timeout,
        })
      )
    );

    // Sequential interactive captures (order matters for UI state)
    const interactiveResults = [];
    for (const item of opts.interactive) {
      const result = await captureInteractive({
        browser,
        baseUrl: opts.url,
        item,
        outputDir: opts.output,
        timeout: opts.timeout,
      });
      interactiveResults.push(result);
    }

    const allResults = [...normalResults, ...interactiveResults];
    const durationMs = Date.now() - startTime;

    const summary = {
      screenshots: allResults,
      duration_ms: durationMs,
      total: allResults.length,
      ok: allResults.filter((r) => r.status === 'ok').length,
      failed: allResults.filter((r) => r.status === 'error').length,
    };

    // Print JSON summary to stdout (for caller to parse)
    console.log(JSON.stringify(summary, null, 2));

    const exitCode = summary.failed > 0 ? 1 : 0;
    process.exitCode = exitCode;
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('[web-capture] FATAL:', err);
  process.exit(1);
});
