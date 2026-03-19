import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: "../../packages/db/src/schema/*",
	out: "./drizzle",
	dialect: "sqlite",
	driver: "expo",
});
