import type {
	AppCapability,
	DataManagerCapability,
	PlatformAdapter,
	SyncCapability,
	UpdaterCapability,
} from "./types";

const app: AppCapability = {
	getVersion: () => window.electronApp.getVersion(),
};

const updater: UpdaterCapability = {
	get isSupported() {
		return !!window.electronUpdater;
	},
	checkForUpdates: () => window.electronUpdater.checkForUpdates(),
	onUpdateAvailable: (cb) => window.electronUpdater.onUpdateAvailable(cb),
	onUpdateNotAvailable: (cb) =>
		window.electronUpdater.onUpdateNotAvailable(cb),
	onUpdateError: (cb) => window.electronUpdater.onUpdateError(cb),
	onDownloadProgress: (cb) => window.electronUpdater.onDownloadProgress(cb),
	onUpdateDownloaded: (cb) => window.electronUpdater.onUpdateDownloaded(cb),
	installUpdate: () => window.electronUpdater.installUpdate(),
	setAllowPrerelease: (allow) =>
		window.electronUpdater.setAllowPrerelease(allow),
	removeAllListeners: (channel) =>
		window.electronUpdater.removeAllListeners(channel),
};

const dataManager: DataManagerCapability = {
	supportsNativeDialogs: true,
	backup: () => window.electronDataManager.backup(),
	restore: () => window.electronDataManager.restore(),
	wipe: () => window.electronDataManager.wipe(),
	exportFile: (payload) => window.electronDataManager.exportFile(payload),
	importFile: () => window.electronDataManager.importFile(),
};

const sync: SyncCapability = {
	get isSupported() {
		return !!window.electronSync;
	},
	getDeviceInfo: () => window.electronSync.getDeviceInfo(),
	startDiscovery: () => window.electronSync.startDiscovery(),
	stopDiscovery: () => window.electronSync.stopDiscovery(),
	initiatePair: (peer) => window.electronSync.initiatePair(peer),
	confirmPair: (deviceId) => window.electronSync.confirmPair(deviceId),
	rejectPair: (deviceId, reason) =>
		window.electronSync.rejectPair(deviceId, reason),
	syncWithPeer: (peer) => window.electronSync.syncWithPeer(peer),
	onSyncComplete: (cb) => window.electronSync.onSyncComplete(cb),
	onPeerDiscovered: (cb) => window.electronSync.onPeerDiscovered(cb),
	onPeerLost: (cb) => window.electronSync.onPeerLost(cb),
	onPairRequestReceived: (cb) =>
		window.electronSync.onPairRequestReceived(cb),
	onPairChallenge: (cb) => window.electronSync.onPairChallenge(cb),
	onPairConfirmed: (cb) => window.electronSync.onPairConfirmed(cb),
	onPairRejected: (cb) => window.electronSync.onPairRejected(cb),
	removeAllListeners: (channel) =>
		window.electronSync.removeAllListeners(channel),
};

export const electronAdapter: PlatformAdapter = {
	app,
	updater,
	dataManager,
	sync,
};
