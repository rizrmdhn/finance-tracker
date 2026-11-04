/**
 * Minimal WebSocket server for React Native.
 * Uses react-native-tcp-socket for the TCP layer.
 * Enables native-hosted sync sessions (mobile → mobile, desktop → mobile).
 */

import { sha1 } from "@noble/hashes/legacy";
// React Native has no global Buffer; this is the polyfill react-native-tcp-socket itself uses
import { Buffer } from "buffer";
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

function encodeFrame(opcode: number, payload: Buffer): Buffer {
	const len = payload.length;
	let header: Buffer;
	if (len < 126) {
		header = Buffer.from([0x80 | opcode, len]);
	} else if (len < 65536) {
		header = Buffer.alloc(4);
		header[0] = 0x80 | opcode;
		header[1] = 126;
		header.writeUInt16BE(len, 2);
	} else {
		header = Buffer.alloc(10);
		header[0] = 0x80 | opcode;
		header[1] = 127;
		header.writeUInt32BE(Math.floor(len / 2 ** 32), 2);
		header.writeUInt32BE(len >>> 0, 6);
	}
	return Buffer.concat([header, payload]);
}

const OP_CONTINUATION = 0x0;
const OP_TEXT = 0x1;
const OP_BINARY = 0x2;
const OP_CLOSE = 0x8;
const OP_PING = 0x9;
const OP_PONG = 0xa;

type WsFrame =
	| { type: "text"; text: string }
	| { type: "close" }
	| { type: "ping"; payload: Buffer };

/**
 * Parses complete frames from `buf`, joining fragmented messages via `fragments`.
 * `need` is how many bytes `remaining` must hold before parsing can make progress.
 */
function parseWsFrames(
	buf: Buffer,
	fragments: { opcode: number; parts: Buffer[] },
): { frames: WsFrame[]; remaining: Buffer; need: number } {
	const frames: WsFrame[] = [];
	let offset = 0;
	let need = 2;

	while (offset + 2 <= buf.length) {
		const byte0 = buf[offset];
		const byte1 = buf[offset + 1];
		const fin = (byte0 & 0x80) !== 0;
		const opcode = byte0 & 0x0f;
		const masked = (byte1 & 0x80) !== 0;
		let payloadLen = byte1 & 0x7f;
		let idx = offset + 2;

		if (payloadLen === 126) {
			need = 4;
			if (idx + 2 > buf.length) break;
			payloadLen = buf.readUInt16BE(idx);
			idx += 2;
		} else if (payloadLen === 127) {
			need = 10;
			if (idx + 8 > buf.length) break;
			payloadLen = buf.readUInt32BE(idx) * 2 ** 32 + buf.readUInt32BE(idx + 4);
			idx += 8;
		}

		const maskStart = idx;
		if (masked) idx += 4;

		need = idx - offset + payloadLen;
		if (idx + payloadLen > buf.length) break;

		const payload = Buffer.from(buf.subarray(idx, idx + payloadLen));
		if (masked) {
			for (let i = 0; i < payloadLen; i++) {
				payload[i] ^= buf[maskStart + (i % 4)];
			}
		}
		offset = idx + payloadLen;
		need = 2;

		if (opcode === OP_CLOSE) {
			frames.push({ type: "close" });
		} else if (opcode === OP_PING) {
			frames.push({ type: "ping", payload });
		} else if (
			opcode === OP_TEXT ||
			opcode === OP_BINARY ||
			opcode === OP_CONTINUATION
		) {
			if (opcode !== OP_CONTINUATION) {
				fragments.opcode = opcode;
				fragments.parts = [];
			}
			fragments.parts.push(payload);
			if (fin) {
				const message = Buffer.concat(fragments.parts);
				fragments.parts = [];
				if (fragments.opcode === OP_TEXT) {
					frames.push({ type: "text", text: message.toString("utf8") });
				}
			}
		}
		// pong frames are ignored
	}

	return { frames, remaining: Buffer.from(buf.subarray(offset)), need };
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
		// Incoming chunks are only joined once a whole frame has arrived;
		// joining on every chunk is quadratic for multi-MB sync batches.
		let chunks: Buffer[] = [];
		let buffered = 0;
		let need = 0;
		let upgraded = false;
		let closing = false;
		let closed = false;
		const fragments = { opcode: OP_TEXT, parts: [] as Buffer[] };
		const messageHandlers: ((text: string) => void)[] = [];
		const closeHandlers: (() => void)[] = [];

		// `error` is followed by `close`, and close frames end the socket too: notify once
		function fireClose() {
			if (closed) return;
			closed = true;
			for (const h of closeHandlers) {
				try {
					h();
				} catch (err) {
					console.error("[ws-server] close handler failed:", err);
				}
			}
		}

		function write(frame: Buffer) {
			if (closing) return;
			try {
				socket.write(frame);
			} catch (err) {
				console.error("[ws-server] write failed:", err);
			}
		}

		// `destroy()` would drop frames still queued for writing; `end(data)` closes after they flush
		function closeSocket() {
			if (closing) return;
			closing = true;
			try {
				socket.end(encodeFrame(OP_CLOSE, Buffer.alloc(0)));
			} catch {
				socket.destroy();
			}
		}

		const conn: WsConnection = {
			send(text) {
				write(encodeFrame(OP_TEXT, Buffer.from(text, "utf8")));
			},
			close: closeSocket,
			onMessage(h) {
				messageHandlers.push(h);
			},
			onClose(h) {
				closeHandlers.push(h);
			},
		};

		function take(): Buffer {
			const buf = chunks.length === 1 ? chunks[0] : Buffer.concat(chunks);
			chunks = [];
			buffered = 0;
			return buf;
		}

		function keep(rest: Buffer) {
			if (rest.length === 0) return;
			chunks = [rest];
			buffered = rest.length;
		}

		function processFrames() {
			const {
				frames,
				remaining,
				need: nextNeed,
			} = parseWsFrames(take(), fragments);
			keep(remaining);
			need = nextNeed;
			for (const frame of frames) {
				if (frame.type === "text") {
					for (const h of messageHandlers) h(frame.text);
				} else if (frame.type === "ping") {
					write(encodeFrame(OP_PONG, frame.payload));
				} else if (frame.type === "close") {
					closeSocket();
					fireClose();
					return;
				}
			}
		}

		socket.on("data", (data) => {
			if (closing) return;
			const chunk = Buffer.isBuffer(data)
				? data
				: Buffer.from(data as string, "binary");
			chunks.push(chunk);
			buffered += chunk.length;

			if (!upgraded) {
				const buf = take();
				const headerEnd = buf.indexOf("\r\n\r\n");
				if (headerEnd === -1) {
					keep(buf);
					return;
				}

				// Parse WS upgrade headers
				const lines = buf.toString("utf8", 0, headerEnd).split("\r\n");
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
				keep(Buffer.from(buf.subarray(headerEnd + 4)));
				onConnection(conn);
			}

			if (buffered >= need) processFrames();
		});

		socket.on("error", (err) => {
			console.error("[ws-server] socket error:", err);
			fireClose();
		});
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
