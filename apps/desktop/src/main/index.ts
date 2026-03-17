import path from "node:path";
import * as schema from "@finance/db";
import { appRouter } from "@finance/api";
import { createContext } from "@finance/api/context";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { app, BrowserWindow } from "electron";
import { createIPCHandler } from "electron-trpc/main";

const isDev = process.env.NODE_ENV_ELECTRON_VITE === "development";

let win: BrowserWindow;

function createWindow() {
	win = new BrowserWindow({
		width: 1200,
		height: 800,
		webPreferences: {
			preload: path.join(__dirname, "../preload/index.js"),
			sandbox: false,
		},
	});

	if (isDev && process.env.ELECTRON_RENDERER_URL) {
		win.loadURL(process.env.ELECTRON_RENDERER_URL);
		win.webContents.openDevTools();
	} else {
		win.loadFile(path.join(__dirname, "../renderer/index.html"));
	}
}

app.whenReady().then(() => {
	const dbPath = path.join(app.getPath("userData"), "finance.db");
	const sqlite = new Database(dbPath);
	sqlite.pragma("journal_mode = WAL");

	const db = drizzle(sqlite, { schema });

	migrate(db, {
		migrationsFolder: path.join(
			__dirname,
			"../../../../packages/db/migrations",
		),
	});

	createWindow();

	createIPCHandler({
		router: appRouter,
		windows: [win],
		createContext: async () => createContext({ db }),
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});
