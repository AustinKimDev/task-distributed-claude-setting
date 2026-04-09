// resolve-service.ts
// Usage: bun run scripts/resolve-service.ts <service-name>
//
// Examples:
//   bun run scripts/resolve-service.ts stripe
//   → { "name": "stripe", "url": "https://stripe.com", "brandPages": ["/customers", "/about"] }
//
//   bun run scripts/resolve-service.ts nonexistent
//   → { "name": "nonexistent", "url": null, "error": "No reachable URL found" }

const SERVICE_NAME = process.argv[2];

if (!SERVICE_NAME) {
  console.error(JSON.stringify({ error: "Usage: bun run resolve-service.ts <service-name>" }));
  process.exit(1);
}

const TLD_CANDIDATES = [".com", ".io", ".dev", ".app", ".co", ".org", ".net"];
const BRAND_PATHS = ["/ci", "/brand", "/design", "/style-guide", "/design-system", "/about"];

interface ResolveResult {
  name: string;
  url: string | null;
  brandPages: string[];
  error?: string;
}

async function checkUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function findBaseUrl(name: string): Promise<string | null> {
  for (const tld of TLD_CANDIDATES) {
    const url = `https://${name}${tld}`;
    if (await checkUrl(url)) return url;
  }
  return null;
}

async function findBrandPages(baseUrl: string): Promise<string[]> {
  const found: string[] = [];
  const checks = BRAND_PATHS.map(async (path) => {
    const url = `${baseUrl}${path}`;
    if (await checkUrl(url)) found.push(path);
  });
  await Promise.all(checks);
  return found;
}

async function main(): Promise<void> {
  const baseUrl = await findBaseUrl(SERVICE_NAME);

  if (!baseUrl) {
    const result: ResolveResult = {
      name: SERVICE_NAME,
      url: null,
      brandPages: [],
      error: `No reachable URL found for "${SERVICE_NAME}". Tried: ${TLD_CANDIDATES.map(t => `${SERVICE_NAME}${t}`).join(", ")}`,
    };
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  const brandPages = await findBrandPages(baseUrl);

  const result: ResolveResult = {
    name: SERVICE_NAME,
    url: baseUrl,
    brandPages,
  };
  console.log(JSON.stringify(result, null, 2));
}

main();
