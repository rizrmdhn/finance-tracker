import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	resolve: {
		alias: {
			"@": resolve(__dirname, "src"),
		},
	},
	plugins: [
		tailwindcss(),
		tanstackRouter({
			routesDirectory: "./src/routes",
			generatedRouteTree: "./src/routeTree.gen.ts",
			target: "react",
			autoCodeSplitting: true,
		}),
		react(),
	],
});
