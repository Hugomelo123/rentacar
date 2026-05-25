import app from "./app";
import { bootstrapDatabase } from "./bootstrap-db";
import { logger } from "./lib/logger";

async function main() {
  const rawPort = process.env["PORT"];

  if (!rawPort) {
    throw new Error(
      "PORT environment variable is required but was not provided.",
    );
  }

  const port = Number(rawPort);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  await bootstrapDatabase();

  app.listen(port, "0.0.0.0", () => {
    logger.info({ port }, "Server listening on 0.0.0.0");
  });
}

main().catch((err) => {
  logger.error({ err }, "Failed to start");
  process.exit(1);
});
