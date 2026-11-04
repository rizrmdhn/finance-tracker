import { createId } from "@paralleldrive/cuid2";
import * as SecureStore from "expo-secure-store";

const DEVICE_ID_KEY = "sync_device_id";
const DEVICE_NAME_KEY = "sync_device_name";
const DEFAULT_DEVICE_NAME = "My Phone";

export interface DeviceIdentity {
	deviceId: string;
	deviceName: string;
}

let identity: Promise<DeviceIdentity> | undefined;

async function loadOrCreate(): Promise<DeviceIdentity> {
	let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
	let deviceName = await SecureStore.getItemAsync(DEVICE_NAME_KEY);
	if (!deviceId) {
		deviceId = createId();
		await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
	}
	if (!deviceName) {
		deviceName = DEFAULT_DEVICE_NAME;
		await SecureStore.setItemAsync(DEVICE_NAME_KEY, deviceName);
	}
	return { deviceId, deviceName };
}

/** This device's sync identity, created and persisted in SecureStore on first use. */
export function getDeviceIdentity(): Promise<DeviceIdentity> {
	identity ??= loadOrCreate().catch((err: unknown) => {
		identity = undefined; // let the next call retry
		throw err;
	});
	return identity;
}
