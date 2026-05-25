import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import net from "node:net";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");
let databaseUrl = "postgresql://autocunha:autocunha@127.0.0.1:5432/rentacar";

if (existsSync(envPath)) {
  const line = readFileSync(envPath, "utf8")
    .split("\n")
    .find((l) => l.startsWith("DATABASE_URL="));
  if (line) databaseUrl = line.replace("DATABASE_URL=", "").trim();
}

const hostPort = databaseUrl.match(/@([^/]+)\//)?.[1] ?? "127.0.0.1:5432";
const [host, portStr] = hostPort.includes(":") ? hostPort.split(":") : [hostPort, "5432"];
const port = Number(portStr);

function tryConnect() {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port }, () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, 2000);
  });
}

console.log(`A aguardar PostgreSQL em ${host}:${port}...`);

for (let i = 1; i <= 40; i++) {
  if (await tryConnect()) {
    console.log("✓ Base de dados acessível");
    process.exit(0);
  }
  await new Promise((r) => setTimeout(r, 1500));
}

console.error("✗ PostgreSQL não respondeu a tempo. Corra: docker compose up -d");
process.exit(1);
