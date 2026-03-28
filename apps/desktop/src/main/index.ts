import crypto from "node:crypto";
import fs from "node:fs";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { appRouter, createTRPCContext } from "@finance-tracker/api";
import { APP_SETTINGS_DEFAULTS, CRDT_TABLES } from "@finance-tracker/constants";
import * as schema from "@finance-tracker/db";
import { addTrustedPeer, processRecurrences } from "@finance-tracker/queries";
import type {
	PairAcceptMsg,
	PairChallengeMsg,
	PairRejectMsg,
	PairRequestMsg,
} from "@finance-tracker/sync";
import {
	base64ToPubKey,
	computeSasCode,
	deriveSharedSecret,
	generateEphemeralKeypair,
	pubKeyToBase64,
} from "@finance-tracker/sync";
import { extensionPath } from "@vlcn.io/crsqlite/nodejs-helper";
import Database from "better-sqlite3";
import { Bonjour } from "bonjour-service";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { autoUpdater } from "electron-updater";
import { createIPCHandler } from "trpc-electron/main";
import { WebSocket, WebSocketServer } from "ws";

const isDev = process.env.NODE_ENV_ELECTRON_VITE === "development";

let win: BrowserWindow;

const SYNC_PORT = 47821;
const MDNS_SERVICE_TYPE = "financetracker";

interface PendingPairing {
	ws: WebSocket;
	theirDeviceId: string;
	theirDeviceName: string;
	theirPlatform: "desktop" | "mobile";
	theirPublicKey: string; // hex
	sasCode: string;
	sharedSecret: Uint8Array;
	ourPrivateKey: string; // ephemeral hex
}

function getDeviceIdentityPath(userData: string) {
	return path.join(userData, "sync-identity.json");
}

function loadOrCreateDeviceIdentity(userData: string): {
	deviceId: string;
	deviceName: string;
} {
	const identityPath = getDeviceIdentityPath(userData);
	try {
		const raw = fs.readFileSync(identityPath, "utf-8");
		return JSON.parse(raw) as { deviceId: string; deviceName: string };
	} catch {
		const deviceId = crypto.randomUUID();
		const deviceName = os.hostname() || "Desktop";
		const identity = { deviceId, deviceName };
		fs.writeFileSync(identityPath, JSON.stringify(identity), "utf-8");
		return identity;
	}
}

function setupSyncServer(
	mainWin: BrowserWindow,
	db: schema.AnyDatabase,
	userData: string,
) {
	const identity = loadOrCreateDeviceIdentity(userData);
	const bonjour = new Bonjour();
	let browser: ReturnType<typeof bonjour.find> | null = null;

	// Pending pairings indexed by their deviceId
	const pendingPairings = new Map<string, PendingPairing>();
	// Pending outgoing pairings (we initiated)
	const outgoingPairings = new Map<string, PendingPairing>();

	// Start WebSocket server
	const httpServer = createServer();
	const wss = new WebSocketServer({ server: httpServer });

	wss.on("connection", (ws) => {
		ws.on("message", async (raw) => {
			try {
				const msg = JSON.parse(raw.toString()) as {
					type: string;
					deviceId?: string;
					deviceName?: string;
					platform?: "desktop" | "mobile";
					publicKey?: string;
					reason?: string;
				};

				if (msg.type === "pair-request") {
					const pairReq = msg as PairRequestMsg;
					// Someone wants to pair with us — generate our keypair and respond
					const ourKeypair = generateEphemeralKeypair();
					const sharedSecret = deriveSharedSecret(
						ourKeypair.privateKey,
						base64ToPubKey(pairReq.publicKey),
					);
					const sasCode = computeSasCode(
						sharedSecret,
						identity.deviceId,
						pairReq.deviceId,
					);

					const pending: PendingPairing = {
						ws,
						theirDeviceId: pairReq.deviceId,
						theirDeviceName: pairReq.deviceName,
						theirPlatform: pairReq.platform,
						theirPublicKey: base64ToPubKey(pairReq.publicKey),
						sasCode,
						sharedSecret,
						ourPrivateKey: ourKeypair.privateKey,
					};
					pendingPairings.set(pairReq.deviceId, pending);

					// Send our public key back
					const challenge: PairChallengeMsg = {
						type: "pair-challenge",
						deviceId: identity.deviceId,
						deviceName: identity.deviceName,
						platform: "desktop",
						publicKey: pubKeyToBase64(ourKeypair.publicKey),
					};
					ws.send(JSON.stringify(challenge));

					// Notify renderer to show SAS code confirmation UI
					mainWin.webContents.send("sync:pair-request-received", {
						deviceId: pairReq.deviceId,
						deviceName: pairReq.deviceName,
						platform: pairReq.platform,
						sasCode,
					});
				}

				if (msg.type === "pair-accept") {
					const pairAccept = msg as PairAcceptMsg;
					// The other side confirmed — finalize pairing
					const pending = outgoingPairings.get(pairAccept.deviceId);
					if (!pending) return;
					outgoingPairings.delete(pairAccept.deviceId);

					await addTrustedPeer(db, {
						deviceId: pending.theirDeviceId,
						deviceName: pending.theirDeviceName,
						platform: pending.theirPlatform,
						publicKey: pending.theirPublicKey,
					});

					mainWin.webContents.send("sync:pair-confirmed", {
						deviceId: pending.theirDeviceId,
						deviceName: pending.theirDeviceName,
						platform: pending.theirPlatform,
					});
				}

				if (msg.type === "pair-reject") {
					const pairReject = msg as PairRejectMsg;
					outgoingPairings.delete(pairReject.deviceId);
					mainWin.webContents.send("sync:pair-rejected", {
						deviceId: pairReject.deviceId,
						reason: pairReject.reason,
					});
				}
			} catch {
				// ignore malformed messages
			}
		});
	});

	httpServer.listen(SYNC_PORT);

	// Advertise via mDNS
	bonjour.publish({
		name: `${identity.deviceName}-${identity.deviceId.slice(0, 8)}`,
		type: MDNS_SERVICE_TYPE,
		port: SYNC_PORT,
		txt: {
			deviceId: identity.deviceId,
			deviceName: identity.deviceName,
			platform: "desktop",
			version: app.getVersion(),
		},
	});

	// IPC: get device info
	ipcMain.handle("sync:get-device-info", () => ({
		...identity,
		platform: "desktop" as const,
	}));

	// IPC: start discovery
	ipcMain.handle("sync:start-discovery", () => {
		browser = bonjour.find({ type: MDNS_SERVICE_TYPE });
		browser.on("up", (service) => {
			const txt = service.txt as Record<string, string>;
			if (txt.deviceId === identity.deviceId) return; // ignore self
			mainWin.webContents.send("sync:peer-discovered", {
				deviceId: txt.deviceId,
				deviceName: txt.deviceName,
				platform: txt.platform,
				host: service.addresses?.[0] ?? service.host,
				port: service.port,
			});
		});
		browser.on("down", (service) => {
			const txt = service.txt as Record<string, string>;
			if (txt.deviceId) {
				mainWin.webContents.send("sync:peer-lost", { deviceId: txt.deviceId });
			}
		});
	});

	// IPC: stop discovery
	ipcMain.handle("sync:stop-discovery", () => {
		browser?.stop();
		browser = null;
	});

	// IPC: initiate pairing with a discovered peer
	ipcMain.handle(
		"sync:initiate-pair",
		(_event, { host, port }: { host: string; port: number }) => {
			const ws = new WebSocket(`ws://${host}:${port}`);
			const ourKeypair = generateEphemeralKeypair();

			ws.on("open", () => {
				const msg: PairRequestMsg = {
					type: "pair-request",
					deviceId: identity.deviceId,
					deviceName: identity.deviceName,
					platform: "desktop",
					publicKey: pubKeyToBase64(ourKeypair.publicKey),
				};
				ws.send(JSON.stringify(msg));
			});

			ws.on("message", async (raw) => {
				try {
					const msg = JSON.parse(raw.toString()) as { type: string };
					if (msg.type === "pair-challenge") {
						const challenge = msg as PairChallengeMsg;
						const sharedSecret = deriveSharedSecret(
							ourKeypair.privateKey,
							base64ToPubKey(challenge.publicKey),
						);
						const sasCode = computeSasCode(
							sharedSecret,
							identity.deviceId,
							challenge.deviceId,
						);

						const pending: PendingPairing = {
							ws,
							theirDeviceId: challenge.deviceId,
							theirDeviceName: challenge.deviceName,
							theirPlatform: challenge.platform,
							theirPublicKey: base64ToPubKey(challenge.publicKey),
							sasCode,
							sharedSecret,
							ourPrivateKey: ourKeypair.privateKey,
						};
						outgoingPairings.set(challenge.deviceId, pending);

						// Show SAS code to user
						mainWin.webContents.send("sync:pair-challenge", {
							deviceId: challenge.deviceId,
							deviceName: challenge.deviceName,
							sasCode,
						});
					}
				} catch {
					// ignore
				}
			});
		},
	);

	// IPC: user confirms the SAS code (incoming pair)
	ipcMain.handle(
		"sync:confirm-pair",
		async (_event, { deviceId }: { deviceId: string }) => {
			const pending = pendingPairings.get(deviceId);
			if (!pending) return;
			pendingPairings.delete(deviceId);

			await addTrustedPeer(db, {
				deviceId: pending.theirDeviceId,
				deviceName: pending.theirDeviceName,
				platform: pending.theirPlatform,
				publicKey: pending.theirPublicKey,
			});

			const accept: PairAcceptMsg = {
				type: "pair-accept",
				deviceId: identity.deviceId,
			};
			pending.ws.send(JSON.stringify(accept));

			mainWin.webContents.send("sync:pair-confirmed", {
				deviceId: pending.theirDeviceId,
				deviceName: pending.theirDeviceName,
				platform: pending.theirPlatform,
			});
		},
	);

	// IPC: user rejects the SAS code (incoming pair)
	ipcMain.handle(
		"sync:reject-pair",
		async (
			_event,
			{ deviceId, reason }: { deviceId: string; reason?: string },
		) => {
			const pending = pendingPairings.get(deviceId);
			if (!pending) return;
			pendingPairings.delete(deviceId);

			const reject: PairRejectMsg = {
				type: "pair-reject",
				deviceId: identity.deviceId,
				reason,
			};
			pending.ws.send(JSON.stringify(reject));
		},
	);

	return () => {
		bonjour.unpublishAll();
		bonjour.destroy();
		wss.close();
		httpServer.close();
	};
}

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

	// Load cr-sqlite extension and register all user data tables as CRDTs
	try {
		sqlite.loadExtension(extensionPath);
		for (const table of CRDT_TABLES) {
			sqlite.prepare("SELECT crsql_as_crr(?)").run(table);
		}
		sqlite.prepare("SELECT crsql_db_version()").get(); // sanity check
		console.log("[cr-sqlite] CRDT tables registered");
	} catch (err) {
		console.error("[cr-sqlite] Failed to initialise:", err);
	}

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
	setInterval(
		() => {
			processRecurrences(db).catch((err: unknown) => {
				console.error("[recurrence] interval pass failed:", err);
			});
		},
		60 * 60 * 1000,
	);

	createWindow();
	setupAutoUpdater();
	setupSyncServer(win, db, app.getPath("userData"));

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
		if (result.canceled || !result.filePath)
			return { success: false, cancelled: true };
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
		if (result.canceled || !result.filePaths[0])
			return { success: false, cancelled: true };
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
			const content = await fs.promises.readFile(result.filePaths[0], "utf-8");
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
