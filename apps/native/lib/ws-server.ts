/**
 * Minimal WebSocket server for React Native.
 * Uses react-native-tcp-socket for the TCP layer.
 * Enables native-hosted sync sessions (mobile → mobile, desktop → mobile).
 */

import { sha1 } from "@noble/hashes/legacy";
import TcpSocket from "react-native-tcp-socket";

const WS_MAGIC = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

function computeAcceptKey(wsKey: string): string {
	const input = wsKey + WS_MAGIC;
	const digest = sha1(new TextEncoder().encode(input));
	let binary = "";
	for (let i = 0; i < digest.length; i++) {
		binary += String.fromCharCode(digest[i]);
	}
	return btoa(binary);
}

function encodeTextFrame(text: string): Buffer {
	const payload = Buffer.from(text, "utf8");
	const len = payload.length;
	if (len < 126) {
		return Buffer.concat([Buffer.from([0x81, len]), payload]);
	}
	if (len < 65536) {
		return Buffer.concat([
			Buffer.from([0x81, 126, (len >> 8) & 0xff, len & 0xff]),
			payload,
		]);
	}
	return Buffer.concat([
		Buffer.from([
			0x81,
			127,
			0,
			0,
			0,
			0,
			(len >> 24) & 0xff,
			(len >> 16) & 0xff,
			(len >> 8) & 0xff,
			len & 0xff,
		]),
		payload,
	]);
}

function encodePongFrame(): Buffer {
	return Buffer.from([0x8a, 0x00]);
}

function encodeCloseFrame(): Buffer {
	return Buffer.from([0x88, 0x00]);
}

type WsFrame =
	| { type: "text"; text: string }
	| { type: "close" }
	| { type: "ping" };

function parseWsFrames(buf: Buffer): { frames: WsFrame[]; remaining: Buffer } {
	const frames: WsFrame[] = [];
	let offset = 0;

	while (offset + 2 <= buf.length) {
		const byte0 = buf[offset];
		const byte1 = buf[offset + 1];
		const opcode = byte0 & 0x0f;
		const masked = (byte1 & 0x80) !== 0;
		let payloadLen = byte1 & 0x7f;
		let idx = offset + 2;

		if (payloadLen === 126) {
			if (idx + 2 > buf.length) break;
			payloadLen = (buf[idx] << 8) | buf[idx + 1];
			idx += 2;
		} else if (payloadLen === 127) {
			if (idx + 8 > buf.length) break;
			payloadLen =
				((buf[idx + 4] << 24) >>> 0) |
				(buf[idx + 5] << 16) |
				(buf[idx + 6] << 8) |
				buf[idx + 7];
			idx += 8;
		}

		const maskStart = idx;
		if (masked) {
			if (idx + 4 > buf.length) break;
			idx += 4;
		}

		if (idx + payloadLen > buf.length) break;

		const payload = Buffer.alloc(payloadLen);
		for (let i = 0; i < payloadLen; i++) {
			payload[i] = masked
				? buf[idx + i] ^ buf[maskStart + (i % 4)]
				: buf[idx + i];
		}
		offset = idx + payloadLen;

		if (opcode === 0x1)
			frames.push({ type: "text", text: payload.toString("utf8") });
		else if (opcode === 0x8) frames.push({ type: "close" });
		else if (opcode === 0x9) frames.push({ type: "ping" });
	}

	return { frames, remaining: Buffer.from(buf.slice(offset)) };
}

export interface WsConnection {
	send(text: string): void;
	close(): void;
	onMessage(handler: (text: string) => void): void;
	onClose(handler: () => void): void;
}

export interface NativeWsServer {
	stop(): void;
}

export function startNativeWsServer(
	port: number,
	onConnection: (conn: WsConnection) => void,
): NativeWsServer {
	const server = TcpSocket.createServer((socket) => {
		let buffer: Buffer = Buffer.alloc(0);
		let upgraded = false;
		const messageHandlers: ((text: string) => void)[] = [];
		const closeHandlers: (() => void)[] = [];

		function fireClose() {
			for (const h of closeHandlers) {
				try {
					h();
				} catch {}
			}
		}

		const conn: WsConnection = {
			send(text) {
				try {
					socket.write(encodeTextFrame(text));
				} catch {}
			},
			close() {
				try {
					socket.write(encodeCloseFrame());
					socket.destroy();
				} catch {}
			},
			onMessage(h) {
				messageHandlers.push(h);
			},
			onClose(h) {
				closeHandlers.push(h);
			},
		};

		socket.on("data", (data) => {
			const chunk = Buffer.isBuffer(data)
				? data
				: Buffer.from(data as string, "binary");
			buffer = Buffer.concat([buffer, chunk]);

			if (!upgraded) {
				const text = buffer.toString("utf8");
				const headerEnd = text.indexOf("\r\n\r\n");
				if (headerEnd === -1) return;

				// Parse WS upgrade headers
				const lines = text.slice(0, headerEnd).split("\r\n");
				const headers: Record<string, string> = {};
				for (let i = 1; i < lines.length; i++) {
					const colon = lines[i].indexOf(":");
					if (colon > 0) {
						headers[lines[i].slice(0, colon).toLowerCase().trim()] = lines[i]
							.slice(colon + 1)
							.trim();
					}
				}

				const wsKey = headers["sec-websocket-key"];
				if (!wsKey) {
					socket.destroy();
					return;
				}

				socket.write(
					[
						"HTTP/1.1 101 Switching Protocols",
						"Upgrade: websocket",
						"Connection: Upgrade",
						`Sec-WebSocket-Accept: ${computeAcceptKey(wsKey)}`,
						"\r\n",
					].join("\r\n"),
				);

				upgraded = true;
				// Keep any bytes that arrived after the HTTP headers
				const httpEnd = headerEnd + 4;
				buffer = Buffer.from(buffer.slice(httpEnd));

				onConnection(conn);
				// Process any WS frames that arrived with the same chunk
				if (buffer.length > 0) {
					const { frames, remaining } = parseWsFrames(buffer);
					buffer = remaining;
					for (const frame of frames) {
						if (frame.type === "text")
							for (const h of messageHandlers) h(frame.text);
						else if (frame.type === "ping") {
							try {
								socket.write(encodePongFrame());
							} catch {}
						} else if (frame.type === "close") {
							fireClose();
							socket.destroy();
						}
					}
				}
				return;
			}

			const { frames, remaining } = parseWsFrames(buffer);
			buffer = remaining;
			for (const frame of frames) {
				if (frame.type === "text") {
					for (const h of messageHandlers) h(frame.text);
				} else if (frame.type === "ping") {
					try {
						socket.write(encodePongFrame());
					} catch {}
				} else if (frame.type === "close") {
					fireClose();
					socket.destroy();
				}
			}
		});

		socket.on("error", () => fireClose());
		socket.on("close", () => fireClose());
	});

	server.listen({ port, host: "0.0.0.0" });
	server.on("error", (err) => console.error("[ws-server] error:", err));

	return {
		stop() {
			try {
				server.close();
			} catch {}
		},
	};
}
