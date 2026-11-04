import type {
	AppCapability,
	DataManagerCapability,
	ImportResult,
	PlatformAdapter,
	SyncCapability,
	UpdaterCapability,
} from "./types";

const app: AppCapability = {
	getVersion: () => Promise.resolve(null),
};

const updater: UpdaterCapability = {
	isSupported: false,
	checkForUpdates: () => {},
	onUpdateAvailable: () => {},
	onUpdateNotAvailable: () => {},
	onUpdateError: () => {},
	onDownloadProgress: () => {},
	onUpdateDownloaded: () => {},
	installUpdate: () => {},
	setAllowPrerelease: () => Promise.resolve(),
	removeAllListeners: () => {},
};

const dataManager: DataManagerCapability = {
	supportsNativeDialogs: false,

	backup: () =>
		Promise.resolve({ success: false, error: "Not available in browser" }),

	restore: () =>
		Promise.resolve({ success: false, error: "Not available in browser" }),

	wipe: () =>
		Promise.resolve({ success: false, error: "Not available in browser" }),

	exportFile: async ({ content, format, defaultName }) => {
		const mime =
			format === "csv"
				? "text/csv;charset=utf-8;"
				: "application/json";
		const blob = new Blob([content], { type: mime });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = defaultName;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		return { success: true };
	},

	importFile: () =>
		new Promise<ImportResult>((resolve) => {
			const input = document.createElement("input");
			input.type = "file";
			input.accept = ".csv,.json";
			input.onchange = async (e) => {
				const file = (e.target as HTMLInputElement).files?.[0];
				if (!file) {
					resolve({ success: false, cancelled: true });
					return;
				}
				const content = await file.text();
				resolve({ success: true, content, filename: file.name });
			};
			// Some browsers fire cancel; others just never fire onchange
			input.oncancel = () => resolve({ success: false, cancelled: true });
			input.click();
		}),
};

const sync: SyncCapability = {
	isSupported: false,
	getDeviceInfo: () => Promise.reject(new Error("Sync not available in browser")),
	startDiscovery: () => Promise.resolve(),
	stopDiscovery: () => Promise.resolve(),
	initiatePair: () => Promise.resolve(),
	confirmPair: () => Promise.resolve(),
	rejectPair: () => Promise.resolve(),
	syncWithPeer: () => Promise.resolve(),
	onSyncComplete: () => {},
	onPeerDiscovered: () => {},
	onPeerLost: () => {},
	onPairRequestReceived: () => {},
	onPairChallenge: () => {},
	onPairConfirmed: () => {},
	onPairRejected: () => {},
	removeAllListeners: () => {},
};

export const browserAdapter: PlatformAdapter = {
	app,
	updater,
	dataManager,
	sync,
};
