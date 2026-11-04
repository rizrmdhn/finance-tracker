import { APP_SETTINGS_DEFAULTS } from "@finance-tracker/constants";
import {
	base64ToPubKey,
	computeSasCode,
	deriveSharedSecret,
	generateEphemeralKeypair,
	type PairAcceptMsg,
	type PairChallengeMsg,
	type PairingMessage,
	type PairRejectMsg,
	type PairRequestMsg,
	type PlatformType,
	pubKeyToBase64,
	SYNC_ERROR_TOAST_DURATION,
	SyncError,
	secretToHex,
	syncErrorKey,
} from "@finance-tracker/sync";
import { createId } from "@paralleldrive/cuid2";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Network from "expo-network";
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
import { ActivityIndicator, ScrollView, Switch, View } from "react-native";
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
import { type DeviceIdentity, getDeviceIdentity } from "@/lib/device-identity";
import { SYNC_PORT, syncWithPeer } from "@/lib/sync-client";
import { startSyncHost } from "@/lib/sync-host";
import { withSyncLock } from "@/lib/sync-runner";
import { useThemeColor } from "@/lib/theme";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { trpc } from "@/lib/trpc";
import type { NativeWsServer, WsConnection } from "@/lib/ws-server";

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
	| { status: "waiting_sas"; sasCode: string }
	| { status: "confirming"; sasCode: string }
	| { status: "done" };

/** The device on the other end of a pairing, once keys have been exchanged. */
interface PairingPeer {
	deviceId: string;
	deviceName: string;
	platform: PlatformType;
	publicKey: string; // hex
	sharedSecret: Uint8Array;
}

/** We connected to a host. Trusted once our user confirmed and the host accepted. */
interface OutgoingPairing {
	ws: WebSocket;
	host: string;
	peer: PairingPeer | null;
	confirmed: boolean;
	accepted: boolean;
	settled: boolean;
}

/** A device connected to our hosting server. Trusted once our user confirms. */
interface IncomingPairing {
	conn: WsConnection;
	peer: PairingPeer;
}

function toPlatform(platform: unknown): PlatformType {
	return platform === "desktop" ? "desktop" : "mobile";
}

/** Accepts `ip`, `ip:port` or `ws://ip:port`; returns `ip:port`. */
function toHost(input: string): string {
	const host = input.trim().replace(/^ws:\/\//, "");
	return host.includes(":") ? host : `${host}:${SYNC_PORT}`;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function SyncScreen() {
	const { t, i18n } = useTranslation();
	const queryClient = useQueryClient();
	const mutedForeground = useThemeColor("mutedForeground");

	const [deviceInfo, setDeviceInfo] = useState<DeviceIdentity | null>(null);
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

	// Read from socket callbacks, which outlive the render that created them
	const outgoingRef = useRef<OutgoingPairing | null>(null);
	const incomingRef = useRef<IncomingPairing | null>(null);
	const serverRef = useRef<NativeWsServer | null>(null);

	const { data: trustedPeers = [], isLoading } = useQuery(
		trpc.peer.list.queryOptions(),
	);

	const { data: autoSyncSetting } = useQuery(
		trpc.appSetting.get.queryOptions({ key: "auto_sync" }),
	);
	const autoSync =
		(autoSyncSetting?.value ?? APP_SETTINGS_DEFAULTS.auto_sync) === "true";

	const setSettingMutation = useMutation(
		trpc.appSetting.set.mutationOptions({
			onSuccess: (_, variables) =>
				queryClient.invalidateQueries(
					trpc.appSetting.get.queryOptions({ key: variables.key }),
				),
		}),
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
		getDeviceIdentity().then(setDeviceInfo);
		Network.getIpAddressAsync()
			.then(setDeviceIp)
			.catch(() => {});
		return () => {
			outgoingRef.current?.ws.close();
			serverRef.current?.stop();
			zeroconf.stop();
			zeroconf.removeAllListeners();
		};
	}, []);

	// ── Pairing (shared) ──────────────────────────────────────────────────

	function trustPeer(peer: PairingPeer) {
		return addPeerMutation.mutateAsync({
			deviceId: peer.deviceId,
			deviceName: peer.deviceName,
			platform: peer.platform,
			publicKey: peer.publicKey,
			sharedSecret: secretToHex(peer.sharedSecret),
		});
	}

	function rejectMessage(): string {
		return JSON.stringify({
			type: "pair-reject",
			deviceId: deviceInfo?.deviceId ?? "",
			reason: "User rejected",
		} satisfies PairRejectMsg);
	}

	// ── Pairing (as client, we connect to a hosting device) ───────────────

	function settleOutgoing(outgoing: OutgoingPairing) {
		outgoing.settled = true;
		if (outgoingRef.current === outgoing) outgoingRef.current = null;
		outgoing.ws.close();
	}

	function failOutgoing(outgoing: OutgoingPairing, message: string) {
		settleOutgoing(outgoing);
		globalErrorToast(message);
		setPairingState({ status: "idle" });
	}

	async function completeOutgoing(outgoing: OutgoingPairing) {
		const { peer, host } = outgoing;
		if (!peer) return;
		settleOutgoing(outgoing);
		try {
			await trustPeer(peer);
			await updateHostMutation.mutateAsync({ deviceId: peer.deviceId, host });
			setPairingState({ status: "done" });
		} catch {
			setPairingState({ status: "idle" }); // the mutation shows the error toast
		}
	}

	function initiatePair(host: string) {
		if (!deviceInfo) return;

		setPairingState({ status: "connecting" });
		const keypair = generateEphemeralKeypair();
		const ws = new WebSocket(`ws://${host}`);
		const outgoing: OutgoingPairing = {
			ws,
			host,
			peer: null,
			confirmed: false,
			accepted: false,
			settled: false,
		};
		outgoingRef.current = outgoing;

		ws.onopen = () => {
			ws.send(
				JSON.stringify({
					type: "pair-request",
					deviceId: deviceInfo.deviceId,
					deviceName: deviceInfo.deviceName,
					platform: "mobile",
					publicKey: pubKeyToBase64(keypair.publicKey),
				} satisfies PairRequestMsg),
			);
		};

		// The host answers on the connection we opened
		ws.onmessage = (event) => {
			if (outgoing.settled) return;
			try {
				const msg = JSON.parse(event.data as string) as PairingMessage;

				if (msg.type === "pair-challenge") {
					const publicKey = base64ToPubKey(msg.publicKey);
					const sharedSecret = deriveSharedSecret(
						keypair.privateKey,
						publicKey,
					);
					outgoing.peer = {
						deviceId: msg.deviceId,
						deviceName: msg.deviceName,
						platform: toPlatform(msg.platform),
						publicKey,
						sharedSecret,
					};
					setPairingState({
						status: "waiting_sas",
						sasCode: computeSasCode(
							sharedSecret,
							deviceInfo.deviceId,
							msg.deviceId,
						),
					});
				} else if (
					msg.type === "pair-accept" &&
					msg.deviceId === outgoing.peer?.deviceId
				) {
					outgoing.accepted = true;
					if (outgoing.confirmed) void completeOutgoing(outgoing);
				} else if (msg.type === "pair-reject") {
					failOutgoing(outgoing, t("sync.toast.pairRejected"));
				}
			} catch (err) {
				console.error("[sync] pairing failed:", err);
				failOutgoing(outgoing, t("sync.toast.pairFailed"));
			}
		};

		// `onerror` is always followed by `onclose`
		ws.onclose = () => {
			if (!outgoing.settled) failOutgoing(outgoing, t("sync.toast.pairFailed"));
		};
	}

	function handleConnect() {
		if (!pairHost.trim() || !deviceInfo) return;
		initiatePair(toHost(pairHost));
	}

	// ── Pairing (as host, a device connected to our server) ───────────────

	function handleHostMessage(conn: WsConnection, raw: unknown) {
		if (!deviceInfo) return;
		const msg = raw as PairingMessage;

		if (msg.type === "pair-request") {
			if (incomingRef.current || outgoingRef.current) {
				conn.send(rejectMessage()); // already pairing with someone
				return;
			}
			try {
				const keypair = generateEphemeralKeypair();
				const publicKey = base64ToPubKey(msg.publicKey);
				const sharedSecret = deriveSharedSecret(keypair.privateKey, publicKey);
				incomingRef.current = {
					conn,
					peer: {
						deviceId: msg.deviceId,
						deviceName: msg.deviceName,
						platform: toPlatform(msg.platform),
						publicKey,
						sharedSecret,
					},
				};
				conn.send(
					JSON.stringify({
						type: "pair-challenge",
						deviceId: deviceInfo.deviceId,
						deviceName: deviceInfo.deviceName,
						platform: "mobile",
						publicKey: pubKeyToBase64(keypair.publicKey),
					} satisfies PairChallengeMsg),
				);
				setPairingState({
					status: "waiting_sas",
					sasCode: computeSasCode(
						sharedSecret,
						deviceInfo.deviceId,
						msg.deviceId,
					),
				});
			} catch (err) {
				console.error("[sync] invalid pair-request:", err);
				incomingRef.current = null;
			}
			return;
		}

		// The initiator declined the SAS code
		if (msg.type === "pair-reject" && incomingRef.current?.conn === conn) {
			incomingRef.current = null;
			globalErrorToast(t("sync.toast.pairRejected"));
			setPairingState({ status: "idle" });
		}
	}

	function handleHostConnectionClose(conn: WsConnection) {
		if (incomingRef.current?.conn !== conn) return;
		incomingRef.current = null;
		globalErrorToast(t("sync.toast.pairFailed"));
		setPairingState({ status: "idle" });
	}

	async function confirmIncoming(incoming: IncomingPairing) {
		incomingRef.current = null;
		try {
			await trustPeer(incoming.peer);
			incoming.conn.send(
				JSON.stringify({
					type: "pair-accept",
					deviceId: deviceInfo?.deviceId ?? "",
				} satisfies PairAcceptMsg),
			);
			setPairingState({ status: "done" });
		} catch {
			incoming.conn.send(rejectMessage());
			incoming.conn.close();
			setPairingState({ status: "idle" }); // the mutation shows the error toast
		}
	}

	// ── Pairing dialog actions ────────────────────────────────────────────

	function handleConfirmPair() {
		if (pairingState.status !== "waiting_sas") return;
		setPairingState({ status: "confirming", sasCode: pairingState.sasCode });

		const incoming = incomingRef.current;
		if (incoming) {
			void confirmIncoming(incoming);
			return;
		}
		const outgoing = outgoingRef.current;
		if (!outgoing) return;
		outgoing.confirmed = true;
		// Otherwise wait for the host's user to accept
		if (outgoing.accepted) void completeOutgoing(outgoing);
	}

	function handleRejectPair() {
		const incoming = incomingRef.current;
		if (incoming) {
			incomingRef.current = null;
			incoming.conn.send(rejectMessage());
			incoming.conn.close();
		}
		const outgoing = outgoingRef.current;
		if (outgoing) {
			if (outgoing.ws.readyState === WebSocket.OPEN) {
				outgoing.ws.send(rejectMessage());
			}
			settleOutgoing(outgoing);
		}
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
		await doSync(syncIpDialog.deviceId, toHost(syncIpInput));
		setSyncIpDialog({ open: false });
		setSyncIpInput("");
	}

	function showSyncError(err: unknown) {
		const code = err instanceof SyncError ? err.code : "internal";
		console.error("[sync] sync failed:", code, err);
		globalErrorToast(
			t(syncErrorKey(code)),
			t("sync.toast.syncFailed"),
			SYNC_ERROR_TOAST_DURATION,
		);
	}

	// syncWithPeer remembers the host on success
	async function doSync(peerDeviceId: string, host: string) {
		if (!deviceInfo) return;
		setSyncingDeviceId(peerDeviceId);
		try {
			const { deviceId } = deviceInfo;
			// Waits for a running auto sync instead of colliding with it
			await withSyncLock(() =>
				syncWithPeer({ host, deviceId, expectedPeerDeviceId: peerDeviceId }),
			);
			await queryClient.invalidateQueries();
			globalSuccessToast(t("sync.toast.syncComplete"));
		} catch (err) {
			showSyncError(err);
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
		initiatePair(`${service.host}:${service.port}`);
	}

	// ── Hosting (act as WS server) ────────────────────────────────────────

	function handleStartHosting() {
		if (!deviceInfo) return;
		serverRef.current = startSyncHost({
			deviceId: deviceInfo.deviceId,
			onSyncComplete: () => {
				void queryClient.invalidateQueries();
				globalSuccessToast(t("sync.toast.syncComplete"));
			},
			onSyncError: showSyncError,
			onOtherMessage: handleHostMessage,
			onConnectionClose: handleHostConnectionClose,
		});
		setIsHosting(true);

		// Advertise over mDNS so other Finance Tracker devices can discover this device
		const serviceName = `${deviceInfo.deviceName}-${deviceInfo.deviceId.slice(0, 8)}`;
		zeroconf.publishService(
			"financetracker",
			"tcp",
			"local.",
			serviceName,
			SYNC_PORT,
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
					<View className="flex-row items-center justify-between gap-4">
						<View className="flex-1 gap-0.5">
							<Text className="text-foreground text-sm">
								{t("sync.autoSync")}
							</Text>
							<Text className="text-muted-foreground text-xs">
								{t("sync.autoSyncDescription")}
							</Text>
						</View>
						<Switch
							value={autoSync}
							disabled={setSettingMutation.isPending}
							onValueChange={(val) =>
								setSettingMutation.mutate({
									key: "auto_sync",
									value: val ? "true" : "false",
								})
							}
						/>
					</View>
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
										<Text className="text-muted-foreground text-xs">
											{t("sync.lastSeen")}:{" "}
											{peer.syncPeer?.lastSeenAt
												? new Date(peer.syncPeer.lastSeenAt).toLocaleString(
														i18n.language,
													)
												: t("sync.never")}
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
									isScanning ? "text-destructive-foreground text-sm" : "text-sm"
								}
							>
								{isScanning ? t("sync.stopScanning") : t("sync.startScanning")}
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
								<DialogFooter className="flex-col gap-2">
									<View className="flex flex-row items-center justify-center gap-2">
										<ActivityIndicator size="small" />
										<Text className="text-muted-foreground text-sm">
											{t("sync.pairingInProgress")}
										</Text>
									</View>
									<Button
										variant="outline"
										onPress={handleRejectPair}
										className="w-full"
									>
										<Text className="text-sm">{t("common.cancel")}</Text>
									</Button>
								</DialogFooter>
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
