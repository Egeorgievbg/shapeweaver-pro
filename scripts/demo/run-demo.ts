import { existsSync } from "node:fs";
import { resolve } from "node:path";

const databasePath = resolve(
  process.env.GPTSBOXES_DEMO_DB ?? "data/demo/gptsboxes_demo.sqlite",
);
const apiPort = process.env.GPTSBOXES_DEMO_API_PORT ?? "4174";
const appPort = process.env.GPTSBOXES_DEMO_APP_PORT ?? "5173";

if (!existsSync(databasePath)) {
  console.error(`\nDemo database is missing: ${databasePath}`);
  console.error("Copy gptsboxes_demo.sqlite to data/demo/ or set GPTSBOXES_DEMO_DB.\n");
  process.exit(1);
}

const environment = {
  ...process.env,
  GPTSBOXES_DEMO_DB: databasePath,
  GPTSBOXES_DEMO_API_PORT: apiPort,
  BOXCRAFT_UPSTREAM_URL: `http://127.0.0.1:${apiPort}`,
  GPTSBOXES_ADMIN_ACCESS_KEY:
    process.env.GPTSBOXES_ADMIN_ACCESS_KEY ?? "shapeweaver-demo-admin",
  GPTSBOXES_ADMIN_SESSION_SECRET:
    process.env.GPTSBOXES_ADMIN_SESSION_SECRET ??
    "shapeweaver-demo-session-secret-32-chars",
  GPTSBOXES_ADMIN_UPSTREAM_URL: `http://127.0.0.1:${apiPort}`,
  GPTSBOXES_ADMIN_UPSTREAM_TOKEN:
    process.env.GPTSBOXES_ADMIN_UPSTREAM_TOKEN ?? "shapeweaver-demo-token",
};

const api = Bun.spawn(["bun", "scripts/demo/demo-database-server.ts"], {
  env: environment,
  stdout: "inherit",
  stderr: "inherit",
});
const app = Bun.spawn(["bun", "run", "dev", "--", "--host", "0.0.0.0", "--port", appPort], {
  env: environment,
  stdout: "inherit",
  stderr: "inherit",
});

console.log(`\nShapeWeaver demo: http://localhost:${appPort}`);
console.log(`SQLite API:      http://127.0.0.1:${apiPort}/api/health`);
console.log(`Admin demo key:  ${environment.GPTSBOXES_ADMIN_ACCESS_KEY}\n`);

let stopping = false;
const stop = () => {
  if (stopping) return;
  stopping = true;
  api.kill("SIGTERM");
  app.kill("SIGTERM");
};

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

const result = await Promise.race([
  api.exited.then((code) => ({ service: "database API", code })),
  app.exited.then((code) => ({ service: "application", code })),
]);
stop();
await Promise.allSettled([api.exited, app.exited]);
if (!stopping && result.code !== 0) {
  console.error(`${result.service} stopped with exit code ${result.code}`);
}
process.exit(result.code ?? 0);
