import http from "node:http";
import { spawn } from "node:child_process";

const defaultPorts = Array.from({ length: 18 }, (_, i) => 5173 + i);

function probe(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 800 }, (res) => {
      const ok = res.statusCode && res.statusCode < 500;
      res.resume();
      resolve(ok);
    });

    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function findBaseUrl() {
  if (process.env.PLAYWRIGHT_BASE_URL) {
    return process.env.PLAYWRIGHT_BASE_URL;
  }

  for (const port of defaultPorts) {
    const url = `http://localhost:${port}`;
    const ok = await probe(url);
    if (ok) return url;
  }

  return "http://localhost:5173";
}

const baseUrl = await findBaseUrl();
const env = { ...process.env, PLAYWRIGHT_BASE_URL: baseUrl };
console.log(`[e2e] Using base URL: ${baseUrl}`);

const child = spawn("npx", ["playwright", "test"], {
  stdio: "inherit",
  env,
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
