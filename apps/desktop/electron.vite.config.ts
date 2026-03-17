import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";

export default defineConfig({
	main: {
		build: {
			externalizeDeps: { exclude: ["@finance/api", "@finance/db"] },
		},
	},
	preload: {},
	renderer: {
		plugins: [
			tanstackRouter({
				routesDirectory: "./src/routes",
				generatedRouteTree: "./src/routeTree.gen.ts",
			}),
			react(),
		],
	},
});
