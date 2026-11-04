import type { SyncErrorCode } from "@/platform";

const SYNC_ERROR_KEYS = {
	untrusted: "sync.errors.untrusted",
	"repair-required": "sync.errors.repairRequired",
	"auth-failed": "sync.errors.authFailed",
	"schema-mismatch": "sync.errors.schemaMismatch",
	"protocol-mismatch": "sync.errors.protocolMismatch",
	"apply-failed": "sync.errors.applyFailed",
	"protocol-error": "sync.errors.protocolError",
	"connection-closed": "sync.errors.connectionClosed",
	timeout: "sync.errors.timeout",
	internal: "sync.errors.internal",
} as const satisfies Record<SyncErrorCode, `sync.errors.${string}`>;

/** Sync errors carry guidance the user needs time to read. */
export const SYNC_ERROR_TOAST_DURATION = 8000;

/** Translation key with user guidance for a sync failure. */
export function syncErrorKey(code: SyncErrorCode) {
	return SYNC_ERROR_KEYS[code] ?? SYNC_ERROR_KEYS.internal;
}
