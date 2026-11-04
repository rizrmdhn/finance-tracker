import { browserAdapter } from "./browser";
import { electronAdapter } from "./electron";
import type { PlatformAdapter } from "./types";

export type {
	AppCapability,
	DataManagerCapability,
	DiscoveredPeer,
	FileOpResult,
	ImportResult,
	PlatformAdapter,
	PlatformType,
	SyncCapability,
	SyncErrorCode,
	SyncWithPeerResult,
	UpdaterCapability,
	UpdateStatus,
} from "./types";

function isElectron(): boolean {
	return typeof window !== "undefined" && !!window.electronApp;
}

export const platform: PlatformAdapter = isElectron()
	? electronAdapter
	: browserAdapter;
