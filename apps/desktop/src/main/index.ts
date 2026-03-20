import path from "node:path";
import { appRouter, createTRPCContext } from "@finance-tracker/api";
import * as schema from "@finance-tracker/db";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { app, BrowserWindow, ipcMain } from "electron";
import { autoUpdater } from "electron-updater";
import { createIPCHandler } from "trpc-electron/main";

const isDev = process.env.NODE_ENV_ELECTRON_VITE === "development";

let win: BrowserWindow;

function setupAutoUpdater() {
	if (isDev) return;

	autoUpdater.checkForUpdatesAndNotify();

	autoUpdater.on("update-available", () => {
		win.webContents.send("update-available");
	});

	autoUpdater.on("update-downloaded", () => {
		win.webContents.send("update-downloaded");
	});

	ipcMain.on("install-update", () => {
		autoUpdater.quitAndInstall();
	});
}

function createWindow() {
	win = new BrowserWindow({
		width: 1200,
		height: 800,
		icon: path.join(__dirname, "../../src/resources/icon.ico"),
		webPreferences: {
			preload: path.join(__dirname, "../preload/index.js"),
			sandbox: false,
		},
		autoHideMenuBar: !isDev,
	});

	if (isDev && process.env.ELECTRON_RENDERER_URL) {
		win.loadURL(process.env.ELECTRON_RENDERER_URL);
		win.webContents.openDevTools();
	} else {
		win.removeMenu();
		win.loadFile(path.join(__dirname, "../renderer/index.html"));
	}
}

app.whenReady().then(() => {
	const dbPath = path.join(app.getPath("userData"), "finance.db");
	const sqlite = new Database(dbPath);
	sqlite.pragma("journal_mode = WAL");
	if (isDev) {
		const originalPrepare = sqlite.prepare.bind(sqlite);
		sqlite.prepare = ((query: string) => {
			console.log("[sqlite]", query);
			return originalPrepare(query);
		}) as typeof sqlite.prepare;
	}

	const db = drizzle(sqlite, { schema, logger: isDev });

	const migrationsFolder = isDev
		? path.join(__dirname, "../../../../packages/db/migrations")
		: path.join(process.resourcesPath, "migrations");

	migrate(db, { migrationsFolder });

	createWindow();
	setupAutoUpdater();

	createIPCHandler({
		router: appRouter,
		windows: [win],
		createContext: async () => await createTRPCContext({ db }),
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});
