import fs from "fs";
import path from "path";
import { loadEnvFile } from "process";

const envFiles = [".env.local", ".env"];

for (const file of envFiles) {
  const envPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(envPath)) {
    loadEnvFile(envPath);
  }
}
