import fs from "node:fs";
import path from "node:path";
import { appRouter, createTRPCContext } from "@finance-tracker/api";
import { APP_SETTINGS_DEFAULTS } from "@finance-tracker/constants";
import * as schema from "@finance-tracker/db";
import { processRecurrences } from "@finance-tracker/queries";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { autoUpdater } from "electron-updater";
import { createIPCHandler } from "trpc-electron/main";

const isDev = process.env.NODE_ENV_ELECTRON_VITE === "development";

let win: BrowserWindow;

function setupAutoUpdater() {
	if (isDev) {
		ipcMain.on("check-for-updates", () => {
			win.webContents.send("update-not-available");
		});
		return;
	}

	// Auto-download updates without user interaction
	autoUpdater.autoDownload = true;
	autoUpdater.autoInstallOnAppQuit = true;

	autoUpdater.on("update-available", (info) => {
		win.webContents.send("update-available", {
			version: info.version,
			releaseNotes: info.releaseNotes ?? null,
		});
	});

	autoUpdater.on("update-not-available", () => {
		win.webContents.send("update-not-available");
	});

	autoUpdater.on("download-progress", (progress) => {
		win.webContents.send("download-progress", {
			percent: Math.round(progress.percent),
			transferred: progress.transferred,
			total: progress.total,
		});
	});

	autoUpdater.on("update-downloaded", () => {
		win.webContents.send("update-downloaded");
	});

	autoUpdater.on("error", (error) => {
		win.webContents.send("update-error", error.message);
	});

	ipcMain.on("check-for-updates", () => {
		autoUpdater.checkForUpdates().catch((error) => {
			win.webContents.send("update-error", (error as Error).message);
		});
	});

	ipcMain.on("install-update", () => {
		// isSilent = true: no installer UI shown
		// isForceRunAfter = true: relaunch the app after install completes
		autoUpdater.quitAndInstall(true, true);
	});
}

function createWindow() {
	win = new BrowserWindow({
		width: 1200,
		height: 800,
		show: false, // hide until ready-to-show to avoid white flash
		backgroundColor: "#09090b", // match app background so no flash on show
		icon: path.join(__dirname, "../../src/resources/icon.ico"),
		webPreferences: {
			preload: path.join(__dirname, "../preload/index.js"),
			sandbox: false,
		},
		autoHideMenuBar: !isDev,
	});

	win.once("ready-to-show", () => {
		win.show();
	});

	if (isDev && process.env.ELECTRON_RENDERER_URL) {
		win.loadURL(process.env.ELECTRON_RENDERER_URL);
		win.webContents.openDevTools();
	} else {
		win.removeMenu();
		win.loadFile(path.join(__dirname, "../renderer/index.html"));
	}
}

app.setName("Finance Tracker");
if (process.platform === "win32") {
	app.setAppUserModelId("Finance Tracker");
}

app.whenReady().then(() => {
	const dbPath = isDev
		? path.join(app.getPath("userData"), "finance-dev.db")
		: path.join(app.getPath("userData"), "finance.db");
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

	// Seeding default app settings
	db.insert(schema.appSettings)
		.values(
			Object.entries(APP_SETTINGS_DEFAULTS).map(([key, value]) => ({
				key,
				value,
			})),
		)
		.onConflictDoNothing()
		.run();

	// Process any recurring transactions that came due since the app was last open
	processRecurrences(db).catch((err: unknown) => {
		console.error("[recurrence] startup pass failed:", err);
	});

	// Re-check every hour for same-day recurring transactions (e.g. daily frequency)
	setInterval(() => {
		processRecurrences(db).catch((err: unknown) => {
			console.error("[recurrence] interval pass failed:", err);
		});
	}, 60 * 60 * 1000);

	createWindow();
	setupAutoUpdater();

	// Auto-check for updates shortly after launch (production only)
	if (!isDev) {
		setTimeout(() => {
			autoUpdater.checkForUpdates().catch(() => {
				// silently ignore startup check failures
			});
		}, 3000);
	}

	createIPCHandler({
		router: appRouter,
		windows: [win],
		createContext: async () => await createTRPCContext({ db }),
	});

	ipcMain.handle("get-app-version", () => app.getVersion());

	ipcMain.handle("backup-database", async () => {
		const result = await dialog.showSaveDialog(win, {
			title: "Backup Database",
			defaultPath: "finance-backup.db",
			filters: [{ name: "SQLite Database", extensions: ["db"] }],
		});
		if (result.canceled || !result.filePath) return { success: false, cancelled: true };
		try {
			await fs.promises.copyFile(dbPath, result.filePath);
			return { success: true };
		} catch (error) {
			return { success: false, error: (error as Error).message };
		}
	});

	ipcMain.handle("restore-database", async () => {
		const result = await dialog.showOpenDialog(win, {
			title: "Restore Database",
			filters: [{ name: "SQLite Database", extensions: ["db"] }],
			properties: ["openFile"],
		});
		if (result.canceled || !result.filePaths[0]) return { success: false, cancelled: true };
		try {
			sqlite.close();
			await fs.promises.copyFile(result.filePaths[0], dbPath);
			app.relaunch();
			app.exit(0);
			return { success: true };
		} catch (error) {
			return { success: false, error: (error as Error).message };
		}
	});

	ipcMain.handle(
		"export-file",
		async (
			_,
			payload: {
				content: string;
				format: "csv" | "json";
				defaultName: string;
			},
		) => {
			const result = await dialog.showSaveDialog(win, {
				title: "Export Transactions",
				defaultPath: payload.defaultName,
				filters: [
					payload.format === "csv"
						? { name: "CSV", extensions: ["csv"] }
						: { name: "JSON", extensions: ["json"] },
				],
			});
			if (result.canceled || !result.filePath)
				return { success: false, cancelled: true };
			try {
				await fs.promises.writeFile(result.filePath, payload.content, "utf-8");
				return { success: true };
			} catch (error) {
				return { success: false, error: (error as Error).message };
			}
		},
	);

	ipcMain.handle("import-file", async () => {
		const result = await dialog.showOpenDialog(win, {
			title: "Import Transactions",
			filters: [{ name: "CSV / JSON", extensions: ["csv", "json"] }],
			properties: ["openFile"],
		});
		if (result.canceled || !result.filePaths[0])
			return { success: false, cancelled: true };
		try {
			const content = await fs.promises.readFile(
				result.filePaths[0],
				"utf-8",
			);
			return {
				success: true,
				content,
				filename: path.basename(result.filePaths[0]),
			};
		} catch (error) {
			return { success: false, error: (error as Error).message };
		}
	});

	ipcMain.handle("wipe-database", async () => {
		try {
			db.delete(schema.transactions).run();
			db.delete(schema.categories).run();
			db.delete(schema.accounts).run();
			db.update(schema.appSettings)
				.set({ value: "pending" })
				.where(eq(schema.appSettings.key, "onboarding"))
				.run();
			return { success: true };
		} catch (error) {
			return { success: false, error: (error as Error).message };
		}
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});
