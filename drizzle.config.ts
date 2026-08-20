import { defineConfig } from "drizzle-kit";

// Load local env for local migrations without adding a dotenv dependency.
try {
  process.loadEnvFile(".env.local");
} catch {
  // Running in an environment without .env.local (e.g. CI) — vars expected from process.env.
}

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});