import {
	base64ToPubKey,
	computeSasCode,
	deriveSharedSecret,
	generateEphemeralKeypair,
	pubKeyToBase64,
} from "@finance-tracker/sync";
import { createId } from "@paralleldrive/cuid2";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Network from "expo-network";
import * as SecureStore from "expo-secure-store";
import {
	Monitor,
	RefreshCw,
	ScanLine,
	Server,
	Smartphone,
	Unplug,
	Wifi,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, ScrollView, View } from "react-native";
import Zeroconf from "react-native-zeroconf";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import { sqlite } from "@/lib/db";
import { useThemeColor } from "@/lib/theme";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { trpc } from "@/lib/trpc";
import { type NativeWsServer, startNativeWsServer } from "@/lib/ws-server";

// ── Device identity (persisted in SecureStore) ──────────────────────────────

const DEVICE_ID_KEY = "sync_device_id";
const DEVICE_NAME_KEY = "sync_device_name";

async function getOrCreateDeviceIdentity(): Promise<{
	deviceId: string;
	deviceName: string;
}> {
	let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
	let deviceName = await SecureStore.getItemAsync(DEVICE_NAME_KEY);
	if (!deviceId) {
		deviceId = createId();
		await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
	}
	if (!deviceName) {
		deviceName = "My Phone";
		await SecureStore.setItemAsync(DEVICE_NAME_KEY, deviceName);
	}
	return { deviceId, deviceName };
}

// ── Types ────────────────────────────────────────────────────────────────────

// ── Discovered mDNS service ───────────────────────────────────────────────────

interface DiscoveredService {
	deviceId: string;
	deviceName: string;
	platform: string;
	host: string;
	port: number;
}

// ── Zeroconf singleton ────────────────────────────────────────────────────────

const zeroconf = new Zeroconf();

// ── Pairing state ─────────────────────────────────────────────────────────────

type PairingState =
	| { status: "idle" }
	| { status: "connecting" }
	| {
			status: "waiting_sas";
			sasCode: string;
			peerId: string;
			peerName: string;
			peerPlatform: string;
	  }
	| {
			status: "confirming";
			sasCode: string;
			peerId: string;
			peerName: string;
			peerPlatform: string;
	  }
	| { status: "done" };

// ── Sync helper ──────────────────────────────────────────────────────────────

async function performSync(
	url: string,
	deviceId: string,
	onMessage?: (msg: Record<string, unknown>) => void,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const ws = new WebSocket(url);

		ws.onopen = () => {
			ws.send(JSON.stringify({ type: "sync-request", deviceId }));
		};

		ws.onmessage = async (event) => {
			const msg = JSON.parse(event.data as string) as Record<string, unknown>;
			onMessage?.(msg);

			if (msg.type === "sync-changes") {
				const changes =
					(msg.changes as Array<{
						table: string;
						pk: string;
						cid: string;
						val: unknown;
						col_version: number;
						db_version: number;
						site_id: string;
						cl: number;
						seq: number;
					}>) ?? [];

				for (const c of changes) {
					try {
						await sqlite.execute(
							"INSERT INTO crsql_changes VALUES (?, ?, ?, ?, ?, ?, unhex(?), ?, ?)",
							[
								c.table,
								c.pk,
								c.cid,
								c.val as string | number | null,
								c.col_version,
								c.db_version,
								c.site_id,
								c.cl,
								c.seq,
							],
						);
					} catch {}
				}

				// Send our changes back
				const result = await sqlite.execute(
					`SELECT "table" as tbl, pk, cid, val, col_version, db_version, hex(site_id) as site_id, cl, seq FROM crsql_changes WHERE site_id = crsql_site_id()`,
				);
				const ourChanges = (result.rows ?? []).map((r) => {
					const row = r as {
						tbl: string;
						pk: string;
						cid: string;
						val: unknown;
						col_version: number;
						db_version: number;
						site_id: string;
						cl: number;
						seq: number;
					};
					return {
						table: row.tbl,
						pk: row.pk,
						cid: row.cid,
						val: row.val,
						col_version: row.col_version,
						db_version: row.db_version,
						site_id: row.site_id,
						cl: row.cl,
						seq: row.seq,
					};
				});

				ws.send(
					JSON.stringify({
						type: "sync-changes",
						deviceId,
						changes: ourChanges,
					}),
				);
			}

			if (msg.type === "sync-done") {
				ws.close();
				resolve();
			}
		};

		ws.onerror = () => reject(new Error("WebSocket error"));
		ws.onclose = () => resolve();
	});
}

// ── Component ────────────────────────────────────────────────────────────────

export default function SyncScreen() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const mutedForeground = useThemeColor("mutedForeground");

	const [deviceInfo, setDeviceInfo] = useState<{
		deviceId: string;
		deviceName: string;
	} | null>(null);
	const [deviceIp, setDeviceIp] = useState<string | null>(null);
	const [pairHost, setPairHost] = useState("");
	const [pairingState, setPairingState] = useState<PairingState>({
		status: "idle",
	});
	const [syncingDeviceId, setSyncingDeviceId] = useState<string | null>(null);
	const [syncIpDialog, setSyncIpDialog] = useState<
		{ open: false } | { open: true; deviceId: string; deviceName: string }
	>({ open: false });
	const [syncIpInput, setSyncIpInput] = useState("");
	const [isHosting, setIsHosting] = useState(false);
	const [isScanning, setIsScanning] = useState(false);
	const [nearbyDevices, setNearbyDevices] = useState<DiscoveredService[]>([]);

	const wsRef = useRef<WebSocket | null>(null);
	const keypairRef = useRef<{ privateKey: string; publicKey: string } | null>(
		null,
	);
	const serverRef = useRef<NativeWsServer | null>(null);

	const { data: trustedPeers = [], isLoading } = useQuery(
		trpc.peer.list.queryOptions(),
	);

	const addPeerMutation = useMutation(
		trpc.peer.add.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries(trpc.peer.list.queryOptions());
				globalSuccessToast(t("sync.toast.paired"));
			},
			onError: () => globalErrorToast(t("sync.toast.pairFailed")),
		}),
	);

	const removePeerMutation = useMutation(
		trpc.peer.remove.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries(trpc.peer.list.queryOptions());
				globalSuccessToast(t("sync.toast.unpaired"));
			},
			onError: () => globalErrorToast(t("sync.toast.unpairFailed")),
		}),
	);

	const updateHostMutation = useMutation(
		trpc.peer.updateHost.mutationOptions(),
	);

	useEffect(() => {
		getOrCreateDeviceIdentity().then(setDeviceInfo);
		Network.getIpAddressAsync()
			.then(setDeviceIp)
			.catch(() => {});
		return () => {
			wsRef.current?.close();
			serverRef.current?.stop();
			zeroconf.stop();
			zeroconf.removeAllListeners();
		};
	}, []);

	// ── Pairing (as client, connect by IP) ────────────────────────────────

	function initiatePair(url: string) {
		if (!deviceInfo) return;

		setPairingState({ status: "connecting" });
		const keypair = generateEphemeralKeypair();
		keypairRef.current = keypair;

		const ws = new WebSocket(url);
		wsRef.current = ws;

		ws.onopen = () => {
			ws.send(
				JSON.stringify({
					type: "pair-request",
					deviceId: deviceInfo.deviceId,
					deviceName: deviceInfo.deviceName,
					platform: "mobile",
					publicKey: pubKeyToBase64(keypair.publicKey),
				}),
			);
		};

		ws.onmessage = async (event) => {
			const msg = JSON.parse(event.data as string) as Record<string, unknown>;

			if (msg.type === "pair-challenge") {
				const kp = keypairRef.current;
				if (!kp || !deviceInfo) return;
				const theirPubKeyHex = base64ToPubKey(msg.publicKey as string);
				const sharedSecret = deriveSharedSecret(kp.privateKey, theirPubKeyHex);
				const sasCode = computeSasCode(
					sharedSecret,
					deviceInfo.deviceId,
					msg.deviceId as string,
				);
				setPairingState({
					status: "waiting_sas",
					sasCode,
					peerId: msg.deviceId as string,
					peerName: msg.deviceName as string,
					peerPlatform: msg.platform as string,
				});
			}

			if (msg.type === "pair-accept") {
				if (
					pairingState.status === "waiting_sas" ||
					pairingState.status === "confirming"
				) {
					const state = pairingState as Extract<
						PairingState,
						{ status: "waiting_sas" | "confirming" }
					>;
					await addPeerMutation.mutateAsync({
						deviceId: state.peerId,
						deviceName: state.peerName,
						platform: state.peerPlatform === "desktop" ? "desktop" : "mobile",
						publicKey: keypairRef.current?.publicKey ?? "",
					});
					// Derive a plain host string from the ws url for storing
					const rawHost = url
						.replace(/^ws:\/\//, "")
						.replace(/:47821$/, "");
					updateHostMutation.mutate({
						deviceId: state.peerId,
						host: `${rawHost}:47821`,
					});
				}
				setPairingState({ status: "done" });
				ws.close();
			}

			if (msg.type === "pair-reject") {
				globalErrorToast(t("sync.toast.pairRejected"));
				setPairingState({ status: "idle" });
				ws.close();
			}
		};

		ws.onerror = () => {
			globalErrorToast(t("sync.toast.pairFailed"));
			setPairingState({ status: "idle" });
		};

		ws.onclose = () => {
			wsRef.current = null;
		};
	}

	function handleConnect() {
		if (!pairHost.trim() || !deviceInfo) return;
		const url = pairHost.trim().startsWith("ws://")
			? pairHost.trim()
			: `ws://${pairHost.trim()}:47821`;
		initiatePair(url);
	}

	function handleConfirmPair() {
		if (pairingState.status !== "waiting_sas") return;
		const { peerId, peerName, peerPlatform, sasCode } = pairingState;
		setPairingState({
			status: "confirming",
			peerId,
			peerName,
			peerPlatform,
			sasCode,
		});
		wsRef.current?.send(
			JSON.stringify({ type: "pair-accept", deviceId: deviceInfo?.deviceId }),
		);
	}

	function handleRejectPair() {
		if (
			pairingState.status !== "waiting_sas" &&
			pairingState.status !== "confirming"
		)
			return;
		wsRef.current?.send(
			JSON.stringify({
				type: "pair-reject",
				deviceId: deviceInfo?.deviceId,
				reason: "User rejected",
			}),
		);
		wsRef.current?.close();
		setPairingState({ status: "idle" });
	}

	function handleDismissDone() {
		setPairingState({ status: "idle" });
		setPairHost("");
	}

	// ── Sync (as client, to a trusted peer) ──────────────────────────────

	async function handleSyncWithPeer(peer: {
		deviceId: string;
		deviceName: string;
		syncPeer?: { lastKnownHost?: string | null } | null;
	}) {
		const storedHost = peer.syncPeer?.lastKnownHost;
		if (!storedHost) {
			setSyncIpDialog({
				open: true,
				deviceId: peer.deviceId,
				deviceName: peer.deviceName,
			});
			return;
		}
		await doSync(peer.deviceId, storedHost);
	}

	async function handleSyncWithIp() {
		if (!syncIpDialog.open || !syncIpInput.trim()) return;
		const host = syncIpInput.trim().includes(":")
			? syncIpInput.trim()
			: `${syncIpInput.trim()}:47821`;
		await doSync(syncIpDialog.deviceId, host);
		setSyncIpDialog({ open: false });
		setSyncIpInput("");
	}

	async function doSync(deviceId: string, host: string) {
		if (!deviceInfo) return;
		setSyncingDeviceId(deviceId);
		const url = host.startsWith("ws://") ? host : `ws://${host}`;
		try {
			let remoteDeviceId: string | null = null;
			await performSync(url, deviceInfo.deviceId, (msg) => {
				if (msg.type === "sync-changes" && !remoteDeviceId) {
					remoteDeviceId = msg.deviceId as string;
				}
			});
			if (remoteDeviceId) {
				updateHostMutation.mutate({ deviceId: remoteDeviceId, host });
			}
			await queryClient.invalidateQueries();
			globalSuccessToast(t("sync.toast.syncComplete"));
		} catch {
			globalErrorToast(t("sync.toast.syncFailed"));
		} finally {
			setSyncingDeviceId(null);
		}
	}

	// ── mDNS Nearby Devices ───────────────────────────────────────────────

	function handleStartScanning() {
		if (!deviceInfo) return;
		setNearbyDevices([]);
		setIsScanning(true);

		zeroconf.removeAllListeners();

		zeroconf.on("resolved", (service) => {
			const txt = service.txt ?? {};
			const resolvedDeviceId = txt.deviceId ?? "";
			// Filter out self
			if (resolvedDeviceId === deviceInfo.deviceId) return;
			const ip = service.addresses[0] ?? service.host;
			const discovered: DiscoveredService = {
				deviceId: resolvedDeviceId,
				deviceName: txt.deviceName ?? service.name,
				platform: txt.platform ?? "unknown",
				host: ip,
				port: service.port,
			};
			setNearbyDevices((prev) => {
				const without = prev.filter((d) => d.deviceId !== resolvedDeviceId);
				return [...without, discovered];
			});
		});

		zeroconf.on("removed", (service) => {
			const removedId = service.txt?.deviceId ?? "";
			if (removedId) {
				setNearbyDevices((prev) =>
					prev.filter((d) => d.deviceId !== removedId),
				);
			}
		});

		zeroconf.scan("financetracker", "tcp", "local.");
	}

	function handleStopScanning() {
		zeroconf.stop();
		zeroconf.removeAllListeners();
		setIsScanning(false);
	}

	function handlePairDiscovered(service: DiscoveredService) {
		const url = `ws://${service.host}:${service.port}`;
		initiatePair(url);
	}

	// ── Hosting (act as WS server) ────────────────────────────────────────

	function handleStartHosting() {
		if (!deviceInfo) return;
		const server = startNativeWsServer(47821, (conn) => {
			// Handle both pairing and sync from incoming connections
			let peerDeviceId: string | null = null;
			let incomingKeypair: { privateKey: string; publicKey: string } | null =
				null;

			conn.onMessage(async (text) => {
				const msg = JSON.parse(text) as Record<string, unknown>;

				if (msg.type === "pair-request") {
					const theirPubKeyHex = base64ToPubKey(msg.publicKey as string);
					const kp = generateEphemeralKeypair();
					incomingKeypair = kp;
					peerDeviceId = msg.deviceId as string;

					const sharedSecret = deriveSharedSecret(
						kp.privateKey,
						theirPubKeyHex,
					);
					const sasCode = computeSasCode(
						sharedSecret,
						msg.deviceId as string,
						deviceInfo.deviceId,
					);

					conn.send(
						JSON.stringify({
							type: "pair-challenge",
							deviceId: deviceInfo.deviceId,
							deviceName: deviceInfo.deviceName,
							platform: "mobile",
							publicKey: pubKeyToBase64(kp.publicKey),
							sasCode,
						}),
					);
				}

				if (msg.type === "pair-accept" && peerDeviceId && incomingKeypair) {
					await addPeerMutation.mutateAsync({
						deviceId: peerDeviceId,
						deviceName: (msg.deviceName as string) ?? "Unknown",
						platform:
							(msg.platform as string) === "desktop" ? "desktop" : "mobile",
						publicKey: incomingKeypair.publicKey,
					});
					conn.send(
						JSON.stringify({
							type: "pair-accept",
							deviceId: deviceInfo.deviceId,
						}),
					);
					conn.close();
				}

				if (msg.type === "sync-request") {
					// Only serve trusted peers
					const peerId = msg.deviceId as string;
					const trusted = trustedPeers.find((p) => p.deviceId === peerId);
					if (!trusted) {
						conn.close();
						return;
					}
					peerDeviceId = peerId;

					const result = await sqlite.execute(
						`SELECT "table" as tbl, pk, cid, val, col_version, db_version, hex(site_id) as site_id, cl, seq FROM crsql_changes WHERE site_id = crsql_site_id()`,
					);
					const changes = (result.rows ?? []).map((r) => {
						const row = r as {
							tbl: string;
							pk: string;
							cid: string;
							val: unknown;
							col_version: number;
							db_version: number;
							site_id: string;
							cl: number;
							seq: number;
						};
						return {
							table: row.tbl,
							pk: row.pk,
							cid: row.cid,
							val: row.val,
							col_version: row.col_version,
							db_version: row.db_version,
							site_id: row.site_id,
							cl: row.cl,
							seq: row.seq,
						};
					});

					conn.send(
						JSON.stringify({
							type: "sync-changes",
							deviceId: deviceInfo.deviceId,
							changes,
						}),
					);
				}

				if (msg.type === "sync-changes") {
					const changes =
						(msg.changes as Array<{
							table: string;
							pk: string;
							cid: string;
							val: unknown;
							col_version: number;
							db_version: number;
							site_id: string;
							cl: number;
							seq: number;
						}>) ?? [];
					for (const c of changes) {
						try {
							await sqlite.execute(
								"INSERT INTO crsql_changes VALUES (?, ?, ?, ?, ?, ?, unhex(?), ?, ?)",
								[
									c.table,
									c.pk,
									c.cid,
									c.val as string | number | null,
									c.col_version,
									c.db_version,
									c.site_id,
									c.cl,
									c.seq,
								],
							);
						} catch {}
					}
					conn.send(
						JSON.stringify({
							type: "sync-done",
							deviceId: deviceInfo.deviceId,
						}),
					);
					conn.close();
					await queryClient.invalidateQueries();
					globalSuccessToast(t("sync.toast.syncComplete"));
				}
			});

			conn.onClose(() => {
				peerDeviceId = null;
				incomingKeypair = null;
			});
		});

		serverRef.current = server;
		setIsHosting(true);

		// Advertise over mDNS so other Finance Tracker devices can discover this device
		const serviceName = `${deviceInfo.deviceName}-${deviceInfo.deviceId.slice(0, 8)}`;
		zeroconf.publishService(
			"financetracker",
			"tcp",
			"local.",
			serviceName,
			47821,
			{
				deviceId: deviceInfo.deviceId,
				deviceName: deviceInfo.deviceName,
				platform: "mobile",
				version: "1.5.0",
			},
		);
	}

	function handleStopHosting() {
		if (deviceInfo) {
			const serviceName = `${deviceInfo.deviceName}-${deviceInfo.deviceId.slice(0, 8)}`;
			zeroconf.unpublishService(serviceName);
		}
		serverRef.current?.stop();
		serverRef.current = null;
		setIsHosting(false);
	}

	// ── Render helpers ────────────────────────────────────────────────────

	const isPairingDialogOpen =
		pairingState.status === "waiting_sas" ||
		pairingState.status === "confirming" ||
		pairingState.status === "done";

	const sasCode =
		pairingState.status === "waiting_sas" ||
		pairingState.status === "confirming"
			? pairingState.sasCode
			: null;

	return (
		<ScrollView className="flex-1 bg-background">
			<View className="flex flex-col gap-6 p-4">
				{/* This Device */}
				{deviceInfo && (
					<View className="flex flex-col gap-3">
						<Text className="font-medium text-sm">{t("sync.thisDevice")}</Text>
						<View className="flex flex-row items-center gap-3 rounded-lg border border-border p-4">
							<Smartphone size={20} color={mutedForeground} />
							<View className="flex flex-1 flex-col gap-0.5">
								<Text className="font-medium text-sm">
									{deviceInfo.deviceName}
								</Text>
								<Text className="font-mono text-muted-foreground text-xs">
									{deviceInfo.deviceId}
								</Text>
							</View>
						</View>
					</View>
				)}

				<Separator />

				{/* Trusted Devices */}
				<View className="flex flex-col gap-3">
					<Text className="font-medium text-sm">
						{t("sync.trustedDevices")}
					</Text>
					{isLoading ? (
						<ActivityIndicator />
					) : trustedPeers.length === 0 ? (
						<Text className="text-muted-foreground text-sm">
							{t("sync.noTrustedDevicesDescription")}
						</Text>
					) : (
						<View className="flex flex-col gap-2">
							{trustedPeers.map((peer) => (
								<View
									key={peer.deviceId}
									className="flex flex-row items-center gap-3 rounded-lg border border-border p-4"
								>
									{peer.platform === "desktop" ? (
										<Monitor size={20} color={mutedForeground} />
									) : (
										<Smartphone size={20} color={mutedForeground} />
									)}
									<View className="flex flex-1 flex-col gap-0.5">
										<Text className="font-medium text-sm">
											{peer.deviceName}
										</Text>
										<Text className="text-muted-foreground text-xs">
											{t("sync.pairedOn")}{" "}
											{new Date(peer.pairedAt).toLocaleDateString()}
										</Text>
									</View>
									<View className="flex flex-row gap-1">
										<Button
											size="sm"
											variant="outline"
											onPress={() => handleSyncWithPeer(peer)}
											disabled={syncingDeviceId === peer.deviceId}
										>
											{syncingDeviceId === peer.deviceId ? (
												<ActivityIndicator size="small" />
											) : (
												<RefreshCw size={14} color={mutedForeground} />
											)}
											<Text className="text-sm">{t("sync.syncNow")}</Text>
										</Button>
										<Button
											variant="ghost"
											size="sm"
											onPress={() =>
												removePeerMutation.mutate({ deviceId: peer.deviceId })
											}
											disabled={removePeerMutation.isPending}
										>
											<Unplug size={14} color={mutedForeground} />
										</Button>
									</View>
								</View>
							))}
						</View>
					)}
				</View>

				<Separator />

				{/* Nearby Devices */}
				<View className="flex flex-col gap-3">
					<View className="flex flex-row items-center justify-between">
						<Text className="font-medium text-sm">
							{t("sync.nearbyDevices")}
						</Text>
						<Button
							size="sm"
							variant={isScanning ? "destructive" : "outline"}
							onPress={isScanning ? handleStopScanning : handleStartScanning}
						>
							<ScanLine
								size={14}
								color={isScanning ? "white" : mutedForeground}
							/>
							<Text
								className={
									isScanning
										? "text-destructive-foreground text-sm"
										: "text-sm"
								}
							>
								{isScanning
									? t("sync.stopScanning")
									: t("sync.startScanning")}
							</Text>
						</Button>
					</View>
					{isScanning && nearbyDevices.length === 0 && (
						<View className="flex flex-row items-center gap-2">
							<ActivityIndicator size="small" />
							<Text className="text-muted-foreground text-sm">
								{t("sync.scanningForDevices")}
							</Text>
						</View>
					)}
					{!isScanning && nearbyDevices.length === 0 && (
						<Text className="text-muted-foreground text-sm">
							{t("sync.noNearbyDevices")}
						</Text>
					)}
					{nearbyDevices.length > 0 && (
						<View className="flex flex-col gap-2">
							{nearbyDevices.map((service) => {
								const trusted = trustedPeers.find(
									(p) => p.deviceId === service.deviceId,
								);
								return (
									<View
										key={service.deviceId}
										className="flex flex-row items-center gap-3 rounded-lg border border-border p-4"
									>
										{service.platform === "desktop" ? (
											<Monitor size={20} color={mutedForeground} />
										) : (
											<Smartphone size={20} color={mutedForeground} />
										)}
										<View className="flex flex-1 flex-col gap-0.5">
											<Text className="font-medium text-sm">
												{service.deviceName}
											</Text>
											<Text className="font-mono text-muted-foreground text-xs">
												{service.host}:{service.port}
											</Text>
										</View>
										{trusted ? (
											<Button
												size="sm"
												variant="outline"
												onPress={() =>
													doSync(
														service.deviceId,
														`${service.host}:${service.port}`,
													)
												}
												disabled={syncingDeviceId === service.deviceId}
											>
												{syncingDeviceId === service.deviceId ? (
													<ActivityIndicator size="small" />
												) : (
													<RefreshCw size={14} color={mutedForeground} />
												)}
												<Text className="text-sm">{t("sync.syncNow")}</Text>
											</Button>
										) : (
											<Button
												size="sm"
												onPress={() => handlePairDiscovered(service)}
												disabled={pairingState.status !== "idle"}
											>
												<Wifi size={14} color="white" />
												<Text className="text-primary-foreground text-sm">
													{t("sync.pair")}
												</Text>
											</Button>
										)}
									</View>
								);
							})}
						</View>
					)}
				</View>

				<Separator />

				{/* Pair New Device */}
				<View className="flex flex-col gap-3">
					<Text className="font-medium text-sm">
						{t("sync.connectToDevice")}
					</Text>
					<Text className="text-muted-foreground text-xs">
						{t("sync.connectToDeviceDescription")}
					</Text>
					<View className="flex flex-row items-center gap-2">
						<Input
							className="flex-1"
							placeholder="192.168.1.x"
							value={pairHost}
							onChangeText={setPairHost}
							autoCapitalize="none"
							autoCorrect={false}
							keyboardType="url"
							editable={pairingState.status === "idle"}
						/>
						<Button
							onPress={handleConnect}
							disabled={!pairHost.trim() || pairingState.status !== "idle"}
						>
							{pairingState.status === "connecting" ? (
								<ActivityIndicator size="small" color="white" />
							) : (
								<Wifi size={16} color="white" />
							)}
							<Text className="text-primary-foreground text-sm">
								{t("sync.connect")}
							</Text>
						</Button>
					</View>
				</View>

				<Separator />

				{/* Host Sync Session */}
				<View className="flex flex-col gap-3">
					<Text className="font-medium text-sm">
						{t("sync.hostSyncSession")}
					</Text>
					<Text className="text-muted-foreground text-xs">
						{t("sync.hostSyncDescription")}
					</Text>
					{deviceIp && (
						<View className="flex flex-row items-center gap-2 rounded-md bg-muted p-3">
							<Text className="text-muted-foreground text-xs">
								{t("sync.yourIpAddress")}:
							</Text>
							<Text className="font-medium font-mono text-sm">{deviceIp}</Text>
						</View>
					)}
					{isHosting && (
						<View className="flex flex-row items-center gap-2 rounded-md bg-muted p-3">
							<ActivityIndicator size="small" />
							<Text className="text-muted-foreground text-sm">
								{t("sync.hosting")}
							</Text>
						</View>
					)}
					<Button
						variant={isHosting ? "destructive" : "outline"}
						onPress={isHosting ? handleStopHosting : handleStartHosting}
					>
						<Server size={16} color={isHosting ? "white" : mutedForeground} />
						<Text
							className={
								isHosting ? "text-destructive-foreground text-sm" : "text-sm"
							}
						>
							{isHosting ? t("sync.stopHosting") : t("sync.startHosting")}
						</Text>
					</Button>
				</View>
			</View>

			{/* Pairing Dialog */}
			<Dialog open={isPairingDialogOpen}>
				<DialogContent>
					{pairingState.status === "done" ? (
						<>
							<DialogHeader>
								<DialogTitle>🎉 {t("sync.toast.paired")}</DialogTitle>
								<DialogDescription>
									{t("sync.pairingInProgress")}
								</DialogDescription>
							</DialogHeader>
							<DialogFooter>
								<Button onPress={handleDismissDone} className="w-full">
									<Text className="text-primary-foreground text-sm">
										{t("common.confirm")}
									</Text>
								</Button>
							</DialogFooter>
						</>
					) : (
						<>
							<DialogHeader>
								<DialogTitle>{t("sync.confirmPairing")}</DialogTitle>
								<DialogDescription>
									{t("sync.verificationCodeDescription")}
								</DialogDescription>
							</DialogHeader>
							<View className="flex flex-col items-center gap-4 py-4">
								<View className="flex flex-row gap-2">
									{sasCode?.split("").map((digit: string) => (
										<View
											key={createId()}
											className="h-14 w-9 items-center justify-center rounded-lg border-2 border-border"
										>
											<Text className="font-bold font-mono text-2xl">
												{digit}
											</Text>
										</View>
									))}
								</View>
								<Text className="text-center text-muted-foreground text-xs">
									{t("sync.confirmPairingDescription")}
								</Text>
							</View>
							{pairingState.status === "confirming" ? (
								<View className="flex flex-row items-center justify-center gap-2">
									<ActivityIndicator size="small" />
									<Text className="text-muted-foreground text-sm">
										{t("sync.pairingInProgress")}
									</Text>
								</View>
							) : (
								<DialogFooter className="flex-col gap-2">
									<Button onPress={handleConfirmPair} className="w-full">
										<Text className="text-primary-foreground text-sm">
											{t("sync.confirm")}
										</Text>
									</Button>
									<Button
										variant="destructive"
										onPress={handleRejectPair}
										className="w-full"
									>
										<Text className="text-destructive-foreground text-sm">
											{t("sync.reject")}
										</Text>
									</Button>
								</DialogFooter>
							)}
						</>
					)}
				</DialogContent>
			</Dialog>

			{/* Sync IP Dialog (when no stored host) */}
			<Dialog
				open={syncIpDialog.open}
				onOpenChange={(open) => {
					if (!open) setSyncIpDialog({ open: false });
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t("sync.syncEnterIp")}</DialogTitle>
						<DialogDescription>
							{t("sync.syncEnterIpDescription")}
						</DialogDescription>
					</DialogHeader>
					<Input
						placeholder="192.168.1.x"
						value={syncIpInput}
						onChangeText={setSyncIpInput}
						autoCapitalize="none"
						autoCorrect={false}
						keyboardType="url"
					/>
					<DialogFooter className="flex-col gap-2">
						<Button
							onPress={handleSyncWithIp}
							disabled={!syncIpInput.trim()}
							className="w-full"
						>
							<Text className="text-primary-foreground text-sm">
								{t("sync.syncNow")}
							</Text>
						</Button>
						<Button
							variant="outline"
							onPress={() => setSyncIpDialog({ open: false })}
							className="w-full"
						>
							<Text className="text-sm">{t("common.cancel")}</Text>
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</ScrollView>
	);
}
