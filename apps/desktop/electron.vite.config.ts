import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";

export default defineConfig({
	main: {
		build: {
			externalizeDeps: {
				exclude: ["@finance-tracker/api", "@finance-tracker/db"],
			},
		},
	},
	preload: {},
	renderer: {
		resolve: {
			alias: {
				"@": resolve("src/renderer/src"),
			},
		},
		plugins: [
			tailwindcss(),
			tanstackRouter({
				routesDirectory: "./src/routes",
				generatedRouteTree: "./src/routeTree.gen.ts",
			}),
			react(),
		],
	},
});
