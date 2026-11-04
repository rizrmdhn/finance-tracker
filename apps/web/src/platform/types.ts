export type PlatformType = "desktop" | "mobile";

// ── App ───────────────────────────────────────────────────────────────────────

export interface AppCapability {
	/** Returns the app version string, or null if not available (browser). */
	getVersion(): Promise<string | null>;
}

// ── Updater ───────────────────────────────────────────────────────────────────

export interface UpdateInfo {
	version: string;
	releaseNotes: string | null;
}

export interface DownloadProgress {
	percent: number;
	transferred: number;
	total: number;
}

export interface UpdaterCapability {
	/** True only in the Electron runtime where the updater is available. */
	readonly isSupported: boolean;
	checkForUpdates(): void;
	onUpdateAvailable(cb: (info: UpdateInfo) => void): void;
	onUpdateNotAvailable(cb: () => void): void;
	onUpdateError(cb: (message: string) => void): void;
	onDownloadProgress(cb: (progress: DownloadProgress) => void): void;
	onUpdateDownloaded(cb: () => void): void;
	installUpdate(): void;
	setAllowPrerelease(allow: boolean): Promise<void>;
	removeAllListeners(channel: string): void;
}

// ── Data manager ──────────────────────────────────────────────────────────────

export interface FileOpResult {
	success: boolean;
	cancelled?: boolean;
	error?: string;
}

export interface ImportResult extends FileOpResult {
	content?: string;
	filename?: string;
}

export interface DataManagerCapability {
	/**
	 * True only in Electron where native file-save/open dialogs are available.
	 * Export and import still work in the browser via browser file APIs.
	 * Backup, restore and wipe are only supported when this is true.
	 */
	readonly supportsNativeDialogs: boolean;
	backup(): Promise<FileOpResult>;
	restore(): Promise<FileOpResult>;
	wipe(): Promise<{ success: boolean; error?: string }>;
	exportFile(payload: {
		content: string;
		format: "csv" | "json";
		defaultName: string;
	}): Promise<FileOpResult>;
	importFile(): Promise<ImportResult>;
}

// ── Sync ──────────────────────────────────────────────────────────────────────

export interface DiscoveredPeer {
	deviceId: string;
	deviceName: string;
	platform: PlatformType;
	host: string;
	port: number;
}

export interface SyncCapability {
	/** True only in the Electron runtime where mDNS sync is available. */
	readonly isSupported: boolean;
	getDeviceInfo(): Promise<{
		deviceId: string;
		deviceName: string;
		platform: PlatformType;
	}>;
	startDiscovery(): Promise<void>;
	stopDiscovery(): Promise<void>;
	initiatePair(peer: { host: string; port: number }): Promise<void>;
	confirmPair(deviceId: string): Promise<void>;
	rejectPair(deviceId: string, reason?: string): Promise<void>;
	syncWithPeer(peer: { host: string; port: number }): Promise<void>;
	onSyncComplete(cb: (info: { deviceId: string }) => void): void;
	onPeerDiscovered(cb: (peer: DiscoveredPeer) => void): void;
	onPeerLost(cb: (info: { deviceId: string }) => void): void;
	onPairRequestReceived(
		cb: (info: {
			deviceId: string;
			deviceName: string;
			platform: PlatformType;
			sasCode: string;
		}) => void,
	): void;
	onPairChallenge(
		cb: (info: {
			deviceId: string;
			deviceName: string;
			sasCode: string;
		}) => void,
	): void;
	onPairConfirmed(
		cb: (info: {
			deviceId: string;
			deviceName: string;
			platform: PlatformType;
		}) => void,
	): void;
	onPairRejected(
		cb: (info: { deviceId: string; reason?: string }) => void,
	): void;
	removeAllListeners(channel: string): void;
}

// ── Platform adapter ──────────────────────────────────────────────────────────

export interface PlatformAdapter {
	app: AppCapability;
	updater: UpdaterCapability;
	dataManager: DataManagerCapability;
	sync: SyncCapability;
}
