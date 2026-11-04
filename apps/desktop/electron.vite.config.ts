import { defineConfig } from "electron-vite";

export default defineConfig({
	main: {
		build: {
			outDir: "out/main",
			externalizeDeps: {
				exclude: [
					"@finance-tracker/api",
					"@finance-tracker/db",
					"@finance-tracker/schema",
					"@finance-tracker/queries",
					"@finance-tracker/sync",
				],
			},
		},
	},
	preload: {
		build: {
			outDir: "out/preload",
		},
	},
});
