/**
 * Platform-agnostic device name resolution.
 * Platform-specific storage (electron-store / MMKV) is handled in each app.
 */
export function generateDeviceId(): string {
	// crypto.randomUUID is available in Node 14.17+, modern browsers, and React Native 0.73+
	return crypto.randomUUID();
}

export function buildDeviceInfo(
	deviceId: string,
	deviceName: string,
	platform: "desktop" | "mobile",
	version: string,
) {
	return { deviceId, deviceName, platform, version };
}
