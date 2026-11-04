import { browserAdapter } from "./browser";
import { electronAdapter } from "./electron";
import type { PlatformAdapter } from "./types";

export type {
	AppCapability,
	DataManagerCapability,
	DiscoveredPeer,
	DownloadProgress,
	FileOpResult,
	ImportResult,
	PlatformAdapter,
	PlatformType,
	SyncCapability,
	SyncErrorCode,
	SyncWithPeerResult,
	UpdateInfo,
	UpdaterCapability,
} from "./types";

function isElectron(): boolean {
	return typeof window !== "undefined" && !!window.electronApp;
}

export const platform: PlatformAdapter = isElectron()
	? electronAdapter
	: browserAdapter;
