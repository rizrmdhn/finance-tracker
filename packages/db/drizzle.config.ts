import { env } from "@finance-tracker/env/db";
import type { Config } from "drizzle-kit";

export default {
	schema: "./src/schema/*",
	out: "./migrations",
	dialect: "sqlite",
	dbCredentials: {
		url: env.DATABASE_URL,
	},
} satisfies Config;
