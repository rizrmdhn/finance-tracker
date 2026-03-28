export type PlatformType = "desktop" | "mobile";

export interface DeviceInfo {
	deviceId: string;
	deviceName: string;
	platform: PlatformType;
	version: string;
}

// ---- Pairing messages ----

export interface PairRequestMsg {
	type: "pair-request";
	deviceId: string;
	deviceName: string;
	platform: PlatformType;
	publicKey: string; // base64 P-256 public key
}

export interface PairChallengeMsg {
	type: "pair-challenge";
	deviceId: string;
	deviceName: string;
	platform: PlatformType;
	publicKey: string; // base64 P-256 public key
}

export interface PairAcceptMsg {
	type: "pair-accept";
	deviceId: string;
}

export interface PairRejectMsg {
	type: "pair-reject";
	deviceId: string;
	reason?: string;
}

// ---- Auth messages (after pairing) ----
export interface HelloMsg {
	type: "hello";
	deviceId: string;
	challenge: string; // base64 random bytes
}

export interface HelloAckMsg {
	type: "hello-ack";
	deviceId: string;
	signature: string; // base64 signature of challenge
}

// ---- Union ----
export type SyncMessage =
	| PairRequestMsg
	| PairChallengeMsg
	| PairAcceptMsg
	| PairRejectMsg
	| HelloMsg
	| HelloAckMsg;
