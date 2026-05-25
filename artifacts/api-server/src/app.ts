import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import { existsSync } from "node:fs";
import router from "./routes";
import { logger } from "./lib/logger";

const dashboardDist = path.resolve(
  process.cwd(),
  "artifacts/rentacar-dashboard/dist/public",
);
const serveDashboard =
  process.env.SERVE_DASHBOARD !== "false" && existsSync(path.join(dashboardDist, "index.html"));

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

if (serveDashboard) {
  app.use(express.static(dashboardDist));
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(dashboardDist, "index.html"));
  });
  logger.info({ dashboardDist }, "Serving rentacar dashboard");
}

export default app;
