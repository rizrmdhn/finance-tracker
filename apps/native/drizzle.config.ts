import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "../../packages/db/src/schema/transactions.ts",
  out: "./drizzle",
  dialect: "sqlite",
  driver: "expo",
});
