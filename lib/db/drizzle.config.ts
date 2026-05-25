import { defineConfig } from "drizzle-kit";
import path from "path";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: [
    path.join(__dirname, "./src/schema/fleet.ts"),
    path.join(__dirname, "./src/schema/reservas.ts"),
    path.join(__dirname, "./src/schema/alertas.ts"),
    path.join(__dirname, "./src/schema/config.ts"),
  ],
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
