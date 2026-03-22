import fs from "node:fs";
import path from "node:path";
import { appRouter, createTRPCContext } from "@finance-tracker/api";
import { APP_SETTINGS_DEFAULTS } from "@finance-tracker/constants";
import * as schema from "@finance-tracker/db";
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
		autoUpdater.quitAndInstall();
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

	// Seeding default categories (stable IDs → safe to re-run; no-op after wipe+restart)
	db.insert(schema.categories)
		.values([
			// ── Income ──────────────────────────────────────────────────────────
			{ id: "seed_income_salary",     name: "Salary",         icon: "Briefcase",  color: "#22c55e", type: "income" },
			{ id: "seed_income_freelance",  name: "Freelance",      icon: "Laptop",     color: "#3b82f6", type: "income" },
			{ id: "seed_income_invest",     name: "Investment",     icon: "TrendingUp", color: "#10b981", type: "income" },
			// ── Expense ─────────────────────────────────────────────────────────
			{ id: "seed_exp_food",          name: "Food & Dining",  icon: "Utensils",   color: "#f97316", type: "expense" },
			{ id: "seed_exp_transport",     name: "Transportation", icon: "Car",        color: "#0ea5e9", type: "expense" },
			{ id: "seed_exp_shopping",      name: "Shopping",       icon: "ShoppingBag",color: "#a855f7", type: "expense" },
			{ id: "seed_exp_entertainment", name: "Entertainment",  icon: "Film",       color: "#ec4899", type: "expense" },
			{ id: "seed_exp_health",        name: "Health",         icon: "Heart",      color: "#ef4444", type: "expense" },
			{ id: "seed_exp_bills",         name: "Bills & Utilities", icon: "Zap",     color: "#eab308", type: "expense" },
			{ id: "seed_exp_housing",       name: "Housing",        icon: "Home",       color: "#6366f1", type: "expense" },
			{ id: "seed_exp_education",     name: "Education",      icon: "Book",       color: "#06b6d4", type: "expense" },
			// ── Savings ─────────────────────────────────────────────────────────
			{ id: "seed_sav_emergency",     name: "Emergency Fund", icon: "PiggyBank",  color: "#22c55e", type: "savings" },
			{ id: "seed_sav_vacation",      name: "Vacation",       icon: "Plane",      color: "#f59e0b", type: "savings" },
			// ── Transfer ────────────────────────────────────────────────────────
			{ id: "seed_transfer",          name: "Transfer",       icon: "Wallet",     color: "#64748b", type: "transfer" },
		])
		.onConflictDoNothing()
		.run();

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
