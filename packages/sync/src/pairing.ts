import { p256 } from "@noble/curves/nist";
import { bytesToHex, hexToBytes } from "@noble/curves/utils";
import { sha256 } from "@noble/hashes/sha2";

export interface EcdhKeypair {
	privateKey: string; // hex
	publicKey: string; // hex (uncompressed)
}

/** Generate an ephemeral P-256 keypair for one pairing session */
export function generateEphemeralKeypair(): EcdhKeypair {
	const privateKey = p256.utils.randomSecretKey();
	const publicKey = p256.getPublicKey(privateKey, false); // uncompressed
	return {
		privateKey: bytesToHex(privateKey),
		publicKey: bytesToHex(publicKey),
	};
}

/** Derive shared secret from our private key + their public key */
export function deriveSharedSecret(
	ourPrivateKeyHex: string,
	theirPublicKeyHex: string,
): Uint8Array {
	const privKey = hexToBytes(ourPrivateKeyHex);
	const pubKey = hexToBytes(theirPublicKeyHex);
	const point = p256.getSharedSecret(privKey, pubKey);
	// point is uncompressed; hash it to get a clean symmetric secret
	return sha256(point);
}

/**
 * Compute the 6-digit SAS verification code.
 * Both sides compute SHA-256(sharedSecret | sortedDeviceIdA | sortedDeviceIdB)
 * then take the first 24 bits as a number 0-999999.
 */
export function computeSasCode(
	sharedSecret: Uint8Array,
	deviceIdA: string,
	deviceIdB: string,
): string {
	// Sort deterministically so both sides produce the same code
	const [first, second] = [deviceIdA, deviceIdB].sort();
	const encoder = new TextEncoder();
	const combined = new Uint8Array([
		...sharedSecret,
		...encoder.encode(first),
		...encoder.encode(second),
	]);
	const hash = sha256(combined);
	// Take first 3 bytes (24 bits) → number 0–16777215, mod 1000000 → 6 digits
	// biome-ignore lint/style/noNonNullAssertion: sha256 always returns 32 bytes
	const num = ((hash[0]! << 16) | (hash[1]! << 8) | hash[2]!) % 1_000_000;
	return num.toString().padStart(6, "0");
}

/** Convert hex public key to base64 for transmission */
export function pubKeyToBase64(hex: string): string {
	const bytes = hexToBytes(hex);
	return btoa(String.fromCharCode(...bytes));
}

/** Convert base64 public key back to hex */
export function base64ToPubKey(b64: string): string {
	const bin = atob(b64);
	const bytes = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
	return bytesToHex(bytes);
}
