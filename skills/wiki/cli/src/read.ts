import { loadConfig } from "./config";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

export async function read(relativePath: string) {
  const config = loadConfig();
  const fullPath = join(config.vaultPath, relativePath);
  if (!existsSync(fullPath)) {
    console.error(`파일을 찾을 수 없습니다: ${relativePath}`);
    process.exit(1);
  }
  console.log(readFileSync(fullPath, "utf-8"));
}
