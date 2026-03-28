import {
	base64ToPubKey,
	computeSasCode,
	deriveSharedSecret,
	generateEphemeralKeypair,
	pubKeyToBase64,
} from "@finance-tracker/sync";
import { createId } from "@paralleldrive/cuid2";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";
import { Monitor, Smartphone, Unplug, Wifi } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, ScrollView, View } from "react-native";
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
import { useThemeColor } from "@/lib/theme";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { trpc } from "@/lib/trpc";

// ── Device identity (persisted in SecureStore) ────────────────────────────────

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

// ── Types ─────────────────────────────────────────────────────────────────────

type PairingState =
	| { status: "idle" }
	| { status: "connecting" }
	| {
			status: "waiting_sas";
			sasCode: string;
			desktopId: string;
			desktopName: string;
	  }
	| {
			status: "confirming";
			sasCode: string;
			desktopId: string;
			desktopName: string;
	  }
	| { status: "done" };

// ── Component ─────────────────────────────────────────────────────────────────

export default function SyncScreen() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const mutedForeground = useThemeColor("mutedForeground");

	const [deviceInfo, setDeviceInfo] = useState<{
		deviceId: string;
		deviceName: string;
	} | null>(null);
	const [host, setHost] = useState("");
	const [pairingState, setPairingState] = useState<PairingState>({
		status: "idle",
	});

	// Keep a ref to the active WS so we can close it on unmount
	const wsRef = useRef<WebSocket | null>(null);

	// Keep ephemeral keypair across messages
	const keypairRef = useRef<{ privateKey: string; publicKey: string } | null>(
		null,
	);

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

	useEffect(() => {
		getOrCreateDeviceIdentity().then(setDeviceInfo);
		return () => {
			wsRef.current?.close();
		};
	}, []);

	function handleConnect() {
		if (!host.trim() || !deviceInfo) return;

		const trimmedHost = host.trim();
		// Accept bare IPs — default port 47821
		const url = trimmedHost.startsWith("ws://")
			? trimmedHost
			: `ws://${trimmedHost}:47821`;

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
			const msg = JSON.parse(event.data as string);

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
					desktopId: msg.deviceId as string,
					desktopName: msg.deviceName as string,
				});
			}

			if (msg.type === "pair-accept") {
				// Desktop confirmed — store the peer
				if (
					pairingState.status === "waiting_sas" ||
					pairingState.status === "confirming"
				) {
					const state = pairingState as Extract<
						PairingState,
						{ status: "waiting_sas" | "confirming" }
					>;
					await addPeerMutation.mutateAsync({
						deviceId: state.desktopId,
						deviceName: state.desktopName,
						platform: "desktop",
						publicKey: keypairRef.current?.publicKey ?? "",
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

	function handleConfirmPair() {
		if (pairingState.status !== "waiting_sas") return;
		const { desktopId, desktopName, sasCode } = pairingState;

		setPairingState({ status: "confirming", desktopId, desktopName, sasCode });

		// Tell the desktop we accepted
		wsRef.current?.send(
			JSON.stringify({
				type: "pair-accept",
				deviceId: deviceInfo?.deviceId,
			}),
		);
	}

	function handleRejectPair() {
		if (
			pairingState.status !== "waiting_sas" &&
			pairingState.status !== "confirming"
		)
			return;
		const _state = pairingState as Extract<
			PairingState,
			{ status: "waiting_sas" | "confirming" }
		>;

		wsRef.current?.send(
			JSON.stringify({
				type: "pair-reject",
				deviceId: deviceInfo?.deviceId,
				reason: "User rejected",
			}),
		);
		wsRef.current?.close();
		setPairingState({ status: "idle" });

		void addPeerMutation; // no-op — just referencing
		globalErrorToast(t("sync.toast.pairRejected"));
	}

	function handleDismissDone() {
		setPairingState({ status: "idle" });
		setHost("");
	}

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

				{/* Connect to Desktop */}
				<View className="flex flex-col gap-3">
					<Text className="font-medium text-sm">
						{t("sync.connectToDesktop")}
					</Text>
					<Text className="text-muted-foreground text-xs">
						{t("sync.connectDescription")}
					</Text>
					<View className="flex flex-row items-center gap-2">
						<Input
							className="flex-1"
							placeholder="192.168.1.x"
							value={host}
							onChangeText={setHost}
							autoCapitalize="none"
							autoCorrect={false}
							keyboardType="url"
							editable={pairingState.status === "idle"}
						/>
						<Button
							onPress={handleConnect}
							disabled={!host.trim() || pairingState.status !== "idle"}
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
									<Button
										variant="ghost"
										size="sm"
										onPress={() =>
											removePeerMutation.mutate({ deviceId: peer.deviceId })
										}
										disabled={removePeerMutation.isPending}
									>
										<Unplug size={16} color={mutedForeground} />
									</Button>
								</View>
							))}
						</View>
					)}
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

							{/* SAS Code display */}
							<View className="flex flex-col items-center gap-4 py-4">
								<View className="flex flex-row gap-2">
									{sasCode?.split("").map((digit: string, i: number) => (
										<View
											// biome-ignore lint/suspicious/noArrayIndexKey: static 6-char array
											key={i}
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
		</ScrollView>
	);
}
