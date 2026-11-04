type PlatformType = "desktop" | "mobile";

declare global {
	interface Window {
		electronApp: {
			getVersion: () => Promise<string>;
		};
		electronSync: {
			getDeviceInfo: () => Promise<{
				deviceId: string;
				deviceName: string;
				platform: PlatformType;
			}>;
			startDiscovery: () => Promise<void>;
			stopDiscovery: () => Promise<void>;
			initiatePair: (peer: { host: string; port: number }) => Promise<void>;
			confirmPair: (deviceId: string) => Promise<void>;
			rejectPair: (deviceId: string, reason?: string) => Promise<void>;
			syncWithPeer: (peer: { host: string; port: number }) => Promise<void>;
			onSyncComplete: (callback: (info: { deviceId: string }) => void) => void;
			onPeerDiscovered: (
				callback: (peer: {
					deviceId: string;
					deviceName: string;
					platform: PlatformType;
					host: string;
					port: number;
				}) => void,
			) => void;
			onPeerLost: (callback: (info: { deviceId: string }) => void) => void;
			onPairRequestReceived: (
				callback: (info: {
					deviceId: string;
					deviceName: string;
					platform: PlatformType;
					sasCode: string;
				}) => void,
			) => void;
			onPairChallenge: (
				callback: (info: {
					deviceId: string;
					deviceName: string;
					sasCode: string;
				}) => void,
			) => void;
			onPairConfirmed: (
				callback: (info: {
					deviceId: string;
					deviceName: string;
					platform: PlatformType;
				}) => void,
			) => void;
			onPairRejected: (
				callback: (info: { deviceId: string; reason?: string }) => void,
			) => void;
			removeAllListeners: (channel: string) => void;
		};
		electronDataManager: {
			backup: () => Promise<{
				success: boolean;
				cancelled?: boolean;
				error?: string;
			}>;
			restore: () => Promise<{
				success: boolean;
				cancelled?: boolean;
				error?: string;
			}>;
			wipe: () => Promise<{ success: boolean; error?: string }>;
			exportFile: (payload: {
				content: string;
				format: "csv" | "json";
				defaultName: string;
			}) => Promise<{ success: boolean; cancelled?: boolean; error?: string }>;
			importFile: () => Promise<{
				success: boolean;
				cancelled?: boolean;
				content?: string;
				filename?: string;
				error?: string;
			}>;
		};
		electronUpdater: {
			checkForUpdates: () => void;
			onUpdateAvailable: (
				callback: (info: {
					version: string;
					releaseNotes: string | null;
				}) => void,
			) => void;
			onUpdateNotAvailable: (callback: () => void) => void;
			onDownloadProgress: (
				callback: (progress: {
					percent: number;
					transferred: number;
					total: number;
				}) => void,
			) => void;
			onUpdateDownloaded: (callback: () => void) => void;
			onUpdateError: (callback: (message: string) => void) => void;
			installUpdate: () => void;
			setAllowPrerelease: (allow: boolean) => Promise<void>;
			removeAllListeners: (channel: string) => void;
		};
	}
}

export {};
