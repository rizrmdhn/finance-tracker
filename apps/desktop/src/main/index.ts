import crypto from "node:crypto";
import fs from "node:fs";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { appRouter, createTRPCContext } from "@finance-tracker/api";
import { APP_SETTINGS_DEFAULTS, CRDT_TABLES } from "@finance-tracker/constants";
import * as schema from "@finance-tracker/db";
import { migrateWithCrr } from "@finance-tracker/db";
import {
	addTrustedPeer,
	processRecurrences,
	updateSyncPeerHost,
} from "@finance-tracker/queries";
import {
	base64ToPubKey,
	computeSasCode,
	createSyncClientSession,
	createSyncServerSession,
	deriveSharedSecret,
	generateEphemeralKeypair,
	isSyncMessage,
	type PairAcceptMsg,
	type PairChallengeMsg,
	type PairRejectMsg,
	type PairRequestMsg,
	pubKeyToBase64,
	type SyncChannel,
	SyncError,
	type SyncErrorCode,
	type SyncResult,
	secretToHex,
} from "@finance-tracker/sync";
import { extensionPath } from "@vlcn.io/crsqlite/nodejs-helper";
import Database from "better-sqlite3";
import { Bonjour } from "bonjour-service";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { autoUpdater } from "electron-updater";
import { createIPCHandler } from "trpc-electron/main";
import { WebSocket, WebSocketServer } from "ws";
import { createSqliteSyncStore } from "./sync-store";

const isDev = process.env.NODE_ENV_ELECTRON_VITE === "development";

let win: BrowserWindow;

const SYNC_PORT = 47821;
const MDNS_SERVICE_TYPE = "financetracker";
/** Incoming sync sessions that have not completed by then are dropped. */
const SYNC_SERVER_TIMEOUT_MS = 60_000;

type SyncWithPeerResult =
	| ({ ok: true } & SyncResult)
	| { ok: false; code: SyncErrorCode };

interface PendingPairing {
	ws: WebSocket;
	theirDeviceId: string;
	theirDeviceName: string;
	theirPlatform: "desktop" | "mobile";
	theirPublicKey: string; // hex
	sasCode: string;
	sharedSecret: Uint8Array;
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
	sqlite: InstanceType<typeof Database>,
) {
	const identity = loadOrCreateDeviceIdentity(userData);
	const store = createSqliteSyncStore(sqlite, db);
	const bonjour = new Bonjour();
	let browser: ReturnType<typeof bonjour.find> | null = null;

	// Pending pairings indexed by their deviceId
	const pendingPairings = new Map<string, PendingPairing>();
	// Pending outgoing pairings (we initiated)
	const outgoingPairings = new Map<string, PendingPairing>();

	const channelFor = (ws: WebSocket): SyncChannel => ({
		send: (msg) => ws.send(JSON.stringify(msg)),
		close: () => ws.close(),
	});

	// Start WebSocket server
	const httpServer = createServer();
	const wss = new WebSocketServer({ server: httpServer });

	wss.on("connection", (ws) => {
		let clientDeviceId: string | undefined;
		let idleTimer: ReturnType<typeof setTimeout> | undefined;
		const session = createSyncServerSession({
			deviceId: identity.deviceId,
			store,
			channel: channelFor(ws),
			onComplete: ({ peerDeviceId }) => {
				clearTimeout(idleTimer);
				mainWin.webContents.send("sync:sync-complete", {
					deviceId: peerDeviceId,
				});
			},
			onError: (err) => {
				clearTimeout(idleTimer);
				console.error("[sync] incoming session failed:", err.code, err.message);
				mainWin.webContents.send("sync:sync-error", {
					deviceId: clientDeviceId,
					code: err.code,
				});
			},
		});

		ws.on("close", () => clearTimeout(idleTimer));
		ws.on("error", (err) => {
			console.error("[sync] incoming connection error:", err.message);
		});

		ws.on("message", async (raw) => {
			let msg: unknown;
			try {
				msg = JSON.parse(raw.toString());
			} catch {
				return; // ignore malformed messages
			}

			if (isSyncMessage(msg)) {
				if (msg.type === "sync-hello") clientDeviceId = msg.deviceId;
				// The engine has no server-side timeout; drop sessions that stall
				idleTimer ??= setTimeout(() => ws.close(), SYNC_SERVER_TIMEOUT_MS);
				await session.handle(msg);
				return;
			}

			const { type } = msg as { type?: unknown };

			// The initiator of an incoming pairing declined the SAS code
			if (type === "pair-reject") {
				const pairReject = msg as PairRejectMsg;
				if (!pendingPairings.delete(pairReject.deviceId)) return;
				mainWin.webContents.send("sync:pair-rejected", {
					deviceId: pairReject.deviceId,
					reason: pairReject.reason,
				});
				return;
			}

			if (type !== "pair-request") return;
			const pairReq = msg as PairRequestMsg;
			try {
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

				pendingPairings.set(pairReq.deviceId, {
					ws,
					theirDeviceId: pairReq.deviceId,
					theirDeviceName: pairReq.deviceName,
					theirPlatform: pairReq.platform,
					theirPublicKey: base64ToPubKey(pairReq.publicKey),
					sasCode,
					sharedSecret,
				});

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
			} catch (err) {
				console.error("[sync] invalid pair-request:", err);
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

			ws.on("error", (err) => {
				console.error("[sync] pairing connection failed:", err.message);
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

						outgoingPairings.set(challenge.deviceId, {
							ws,
							theirDeviceId: challenge.deviceId,
							theirDeviceName: challenge.deviceName,
							theirPlatform: challenge.platform,
							theirPublicKey: base64ToPubKey(challenge.publicKey),
							sasCode,
							sharedSecret,
						});

						// Show SAS code to user
						mainWin.webContents.send("sync:pair-challenge", {
							deviceId: challenge.deviceId,
							deviceName: challenge.deviceName,
							sasCode,
						});
					}

					// The peer answers on the connection we opened
					if (msg.type === "pair-accept") {
						const pairAccept = msg as PairAcceptMsg;
						const pending = outgoingPairings.get(pairAccept.deviceId);
						if (!pending) return;
						outgoingPairings.delete(pairAccept.deviceId);

						await addTrustedPeer(db, {
							deviceId: pending.theirDeviceId,
							deviceName: pending.theirDeviceName,
							platform: pending.theirPlatform,
							publicKey: pending.theirPublicKey,
							sharedSecret: secretToHex(pending.sharedSecret),
						});
						await updateSyncPeerHost(
							db,
							pending.theirDeviceId,
							`${host}:${port}`,
						);
						ws.close();

						mainWin.webContents.send("sync:pair-confirmed", {
							deviceId: pending.theirDeviceId,
							deviceName: pending.theirDeviceName,
							platform: pending.theirPlatform,
						});
					}

					if (msg.type === "pair-reject") {
						const pairReject = msg as PairRejectMsg;
						outgoingPairings.delete(pairReject.deviceId);
						ws.close();
						mainWin.webContents.send("sync:pair-rejected", {
							deviceId: pairReject.deviceId,
							reason: pairReject.reason,
						});
					}
				} catch (err) {
					console.error("[sync] pairing failed:", err);
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
				sharedSecret: secretToHex(pending.sharedSecret),
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

	// IPC: sync with a peer (desktop-initiated, acts as client).
	// Resolves with a result instead of rejecting: Electron rewrites the message of
	// errors thrown from handlers, which would hide the SyncErrorCode from the renderer.
	ipcMain.handle(
		"sync:sync-with-peer",
		async (
			_event,
			{
				host,
				port,
				deviceId,
			}: { host: string; port: number; deviceId?: string },
		): Promise<SyncWithPeerResult> => {
			const ws = new WebSocket(`ws://${host}:${port}`, {
				handshakeTimeout: 10_000,
			});
			const session = createSyncClientSession({
				deviceId: identity.deviceId,
				store,
				channel: channelFor(ws),
				expectedPeerDeviceId: deviceId,
			});

			ws.on("open", () => session.start());
			ws.on("message", (raw) => {
				let msg: unknown;
				try {
					msg = JSON.parse(raw.toString());
				} catch {
					return; // ignore malformed messages
				}
				if (isSyncMessage(msg)) void session.handle(msg);
			});
			ws.on("close", () => session.handleClose());
			ws.on("error", () => session.handleClose());

			try {
				const result = await session.result;
				await updateSyncPeerHost(db, result.peerDeviceId, `${host}:${port}`);
				mainWin.webContents.send("sync:sync-complete", {
					deviceId: result.peerDeviceId,
				});
				return { ok: true, ...result };
			} catch (err) {
				const code = err instanceof SyncError ? err.code : "internal";
				console.error("[sync] sync with peer failed:", code, err);
				return { ok: false, code };
			}
		},
	);

	return () => {
		bonjour.unpublishAll();
		bonjour.destroy();
		wss.close();
		httpServer.close();
	};
}

function setupAutoUpdater(sqlite: InstanceType<typeof Database>) {
	if (isDev) {
		ipcMain.on("check-for-updates", () => {
			win.webContents.send("update-not-available");
		});
		return;
	}

	// Auto-download updates without user interaction
	autoUpdater.autoDownload = true;
	autoUpdater.autoInstallOnAppQuit = true;

	// Read and apply pre_release setting from DB
	try {
		const setting = sqlite
			.prepare(`SELECT value FROM app_settings WHERE key = 'pre_release'`)
			.get() as { value: string } | undefined;
		if (setting?.value === "true") {
			autoUpdater.allowPrerelease = true;
		}
	} catch {
		// ignore
	}

	ipcMain.handle(
		"updater:set-prerelease",
		(_event, { allow }: { allow: boolean }) => {
			autoUpdater.allowPrerelease = allow;
		},
	);

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

	const WEB_DEV_URL = process.env.WEB_DEV_URL ?? "http://localhost:3000";

	if (isDev) {
		win.loadURL(WEB_DEV_URL);
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

	// cr-sqlite must be loaded before migrating: CRR tables are altered through crsql_begin_alter/commit_alter
	sqlite.loadExtension(extensionPath);

	// PRAGMA foreign_keys is a no-op inside a transaction, so we must disable
	// FK enforcement on the connection BEFORE the migration transaction starts.
	sqlite.pragma("foreign_keys = OFF");
	migrateWithCrr(
		{
			exec: (sql) => sqlite.exec(sql),
			all: (sql) => sqlite.prepare(sql).all() as Record<string, unknown>[],
		},
		readMigrationFiles({ migrationsFolder }),
	);
	sqlite.pragma("foreign_keys = ON");

	// Register all user data tables as CRDTs (no-op for tables that already are).
	try {
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
	setupAutoUpdater(sqlite);
	setupSyncServer(win, db, app.getPath("userData"), sqlite);

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
