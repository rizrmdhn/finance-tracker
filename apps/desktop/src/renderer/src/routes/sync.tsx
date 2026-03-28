import { Badge } from "@finance-tracker/ui/components/badge";
import { Button } from "@finance-tracker/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@finance-tracker/ui/components/dialog";
import { Input } from "@finance-tracker/ui/components/input";
import { Separator } from "@finance-tracker/ui/components/separator";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	Loader2,
	Monitor,
	RefreshCw,
	Smartphone,
	Unplug,
	Wifi,
	WifiOff,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { pageHead } from "@/lib/page-head";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { trpc } from "@/lib/trpc";

export const Route = createFileRoute("/sync")({
	component: RouteComponent,
	head: () => pageHead("Sync", "Manage device pairing and local sync."),
});

interface DiscoveredPeer {
	deviceId: string;
	deviceName: string;
	platform: "desktop" | "mobile";
	host: string;
	port: number;
}

type PairingDialogState =
	| { open: false }
	| {
			open: true;
			direction: "incoming" | "outgoing";
			deviceId: string;
			deviceName: string;
			sasCode: string;
	  };

type SyncIpDialogState =
	| { open: false }
	| { open: true; deviceId: string; deviceName: string };

function RouteComponent() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const [deviceInfo, setDeviceInfo] = useState<{
		deviceId: string;
		deviceName: string;
	} | null>(null);
	const [isScanning, setIsScanning] = useState(false);
	const [discoveredPeers, setDiscoveredPeers] = useState<
		Map<string, DiscoveredPeer>
	>(new Map());
	const [pairingDialog, setPairingDialog] = useState<PairingDialogState>({
		open: false,
	});
	const [pairingDeviceId, setPairingDeviceId] = useState<string | null>(null);
	const [syncingDeviceId, setSyncingDeviceId] = useState<string | null>(null);
	const [syncIpDialog, setSyncIpDialog] = useState<SyncIpDialogState>({
		open: false,
	});
	const [syncIpInput, setSyncIpInput] = useState("");

	const { data: trustedPeers = [], isLoading } = useQuery(
		trpc.peer.list.queryOptions(),
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
		window.electronSync?.getDeviceInfo().then(setDeviceInfo);
	}, []);

	useEffect(() => {
		if (!window.electronSync) return;

		window.electronSync.onPeerDiscovered((peer) => {
			setDiscoveredPeers((prev) => {
				const next = new Map(prev);
				next.set(peer.deviceId, peer);
				return next;
			});
		});

		window.electronSync.onPeerLost(({ deviceId }) => {
			setDiscoveredPeers((prev) => {
				const next = new Map(prev);
				next.delete(deviceId);
				return next;
			});
		});

		window.electronSync.onPairChallenge(({ deviceId, deviceName, sasCode }) => {
			setPairingDeviceId(deviceId);
			setPairingDialog({
				open: true,
				direction: "outgoing",
				deviceId,
				deviceName,
				sasCode,
			});
		});

		window.electronSync.onPairRequestReceived(
			({ deviceId, deviceName, platform: _platform, sasCode }) => {
				setPairingDeviceId(deviceId);
				setPairingDialog({
					open: true,
					direction: "incoming",
					deviceId,
					deviceName,
					sasCode,
				});
			},
		);

		window.electronSync.onPairConfirmed(async ({ deviceId: _deviceId }) => {
			setPairingDialog({ open: false });
			setPairingDeviceId(null);
			await queryClient.invalidateQueries(trpc.peer.list.queryOptions());
			globalSuccessToast(t("sync.toast.paired"));
		});

		window.electronSync.onPairRejected(() => {
			setPairingDialog({ open: false });
			setPairingDeviceId(null);
			globalErrorToast(t("sync.toast.pairRejected"));
		});

		window.electronSync.onSyncComplete(async () => {
			await queryClient.invalidateQueries();
		});

		return () => {
			window.electronSync?.removeAllListeners("sync:peer-discovered");
			window.electronSync?.removeAllListeners("sync:peer-lost");
			window.electronSync?.removeAllListeners("sync:pair-challenge");
			window.electronSync?.removeAllListeners("sync:pair-request-received");
			window.electronSync?.removeAllListeners("sync:pair-confirmed");
			window.electronSync?.removeAllListeners("sync:pair-rejected");
			window.electronSync?.removeAllListeners("sync:sync-complete");
		};
	}, [queryClient, t]);

	async function handleStartScanning() {
		setIsScanning(true);
		setDiscoveredPeers(new Map());
		await window.electronSync?.startDiscovery();
	}

	async function handleStopScanning() {
		await window.electronSync?.stopDiscovery();
		setIsScanning(false);
	}

	async function handlePair(peer: DiscoveredPeer) {
		setPairingDeviceId(peer.deviceId);
		await window.electronSync?.initiatePair({
			host: peer.host,
			port: peer.port,
		});
	}

	async function handleConfirmPair() {
		if (!pairingDialog.open) return;
		await window.electronSync?.confirmPair(pairingDialog.deviceId);
	}

	async function handleRejectPair() {
		if (!pairingDialog.open) return;
		await window.electronSync?.rejectPair(pairingDialog.deviceId);
		setPairingDialog({ open: false });
		setPairingDeviceId(null);
	}

	async function handleSyncNearby(peer: DiscoveredPeer) {
		setSyncingDeviceId(peer.deviceId);
		try {
			await window.electronSync?.syncWithPeer({
				host: peer.host,
				port: peer.port,
			});
			updateHostMutation.mutate({
				deviceId: peer.deviceId,
				host: `${peer.host}:${peer.port}`,
			});
			await queryClient.invalidateQueries();
			globalSuccessToast(t("sync.toast.syncComplete"));
		} catch {
			globalErrorToast(t("sync.toast.syncFailed"));
		} finally {
			setSyncingDeviceId(null);
		}
	}

	async function handleSyncTrusted(peer: (typeof trustedPeers)[number]) {
		const storedHost = peer.syncPeer?.lastKnownHost;
		// Also check if this peer is currently visible via mDNS
		const discovered = discoveredPeers.get(peer.deviceId);
		const host =
			storedHost ??
			(discovered ? `${discovered.host}:${discovered.port}` : null);

		if (!host) {
			setSyncIpDialog({
				open: true,
				deviceId: peer.deviceId,
				deviceName: peer.deviceName,
			});
			return;
		}

		const [ip, portStr] = host.split(":");
		const port = portStr ? Number.parseInt(portStr, 10) : 47821;

		setSyncingDeviceId(peer.deviceId);
		try {
			await window.electronSync?.syncWithPeer({ host: ip, port });
			updateHostMutation.mutate({ deviceId: peer.deviceId, host });
			await queryClient.invalidateQueries();
			globalSuccessToast(t("sync.toast.syncComplete"));
		} catch {
			globalErrorToast(t("sync.toast.syncFailed"));
		} finally {
			setSyncingDeviceId(null);
		}
	}

	async function handleSyncWithIp() {
		if (!syncIpDialog.open || !syncIpInput.trim()) return;
		const hostInput = syncIpInput.trim();
		const [ip, portStr] = hostInput.includes(":")
			? hostInput.split(":")
			: [hostInput, "47821"];
		const port = Number.parseInt(portStr, 10);
		const host = `${ip}:${port}`;
		const capturedDeviceId = syncIpDialog.deviceId;

		setSyncingDeviceId(capturedDeviceId);
		setSyncIpDialog({ open: false });
		setSyncIpInput("");

		try {
			await window.electronSync?.syncWithPeer({ host: ip, port });
			updateHostMutation.mutate({ deviceId: capturedDeviceId, host });
			await queryClient.invalidateQueries();
			globalSuccessToast(t("sync.toast.syncComplete"));
		} catch {
			globalErrorToast(t("sync.toast.syncFailed"));
		} finally {
			setSyncingDeviceId(null);
		}
	}

	const trustedDeviceIds = new Set(trustedPeers.map((p) => p.deviceId));

	return (
		<div className="flex max-w-2xl flex-col gap-6">
			<div>
				<h1 className="font-semibold text-xl">{t("sync.heading")}</h1>
				<p className="text-muted-foreground text-sm">{t("sync.subheading")}</p>
			</div>

			<Separator />

			{/* This Device */}
			{deviceInfo && (
				<section className="flex flex-col gap-3">
					<h2 className="font-medium text-sm">{t("sync.thisDevice")}</h2>
					<div className="flex items-center gap-3 rounded-lg border p-4">
						<Monitor className="size-5 text-muted-foreground" />
						<div className="flex flex-col gap-0.5">
							<span className="font-medium text-sm">
								{deviceInfo.deviceName}
							</span>
							<span className="font-mono text-muted-foreground text-xs">
								{deviceInfo.deviceId}
							</span>
						</div>
						<Badge variant="secondary" className="ml-auto">
							{t("sync.desktop")}
						</Badge>
					</div>
				</section>
			)}

			<Separator />

			{/* Trusted Devices */}
			<section className="flex flex-col gap-3">
				<h2 className="font-medium text-sm">{t("sync.trustedDevices")}</h2>
				{isLoading ? (
					<div className="flex items-center gap-2 text-muted-foreground text-sm">
						<Loader2 className="size-4 animate-spin" />
					</div>
				) : trustedPeers.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						{t("sync.noTrustedDevicesDescription")}
					</p>
				) : (
					<div className="flex flex-col gap-2">
						{trustedPeers.map((peer) => (
							<div
								key={peer.deviceId}
								className="flex items-center gap-3 rounded-lg border p-4"
							>
								{peer.platform === "desktop" ? (
									<Monitor className="size-5 text-muted-foreground" />
								) : (
									<Smartphone className="size-5 text-muted-foreground" />
								)}
								<div className="flex flex-col gap-0.5">
									<span className="font-medium text-sm">{peer.deviceName}</span>
									<span className="text-muted-foreground text-xs">
										{t("sync.pairedOn")}{" "}
										{new Date(peer.pairedAt).toLocaleDateString()}
										{peer.syncPeer?.lastKnownHost && (
											<span className="ml-2 font-mono">
												{peer.syncPeer.lastKnownHost}
											</span>
										)}
									</span>
								</div>
								<div className="ml-auto flex items-center gap-2">
									<Badge variant="outline">{t(`sync.${peer.platform}`)}</Badge>
									<Button
										size="sm"
										variant="outline"
										onClick={() => handleSyncTrusted(peer)}
										disabled={syncingDeviceId === peer.deviceId}
									>
										{syncingDeviceId === peer.deviceId ? (
											<Loader2 className="size-4 animate-spin" />
										) : (
											<RefreshCw className="size-4" />
										)}
										{t("sync.syncNow")}
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onClick={() =>
											removePeerMutation.mutate({ deviceId: peer.deviceId })
										}
										disabled={removePeerMutation.isPending}
									>
										<Unplug className="size-4" />
										{t("sync.unpair")}
									</Button>
								</div>
							</div>
						))}
					</div>
				)}
			</section>

			<Separator />

			{/* Nearby Devices (for discovery & pairing new devices) */}
			<section className="flex flex-col gap-3">
				<div className="flex items-center justify-between">
					<h2 className="font-medium text-sm">{t("sync.nearbyDevices")}</h2>
					<Button
						variant="outline"
						size="sm"
						onClick={isScanning ? handleStopScanning : handleStartScanning}
					>
						{isScanning ? (
							<>
								<WifiOff className="size-4" />
								{t("sync.stopScanning")}
							</>
						) : (
							<>
								<Wifi className="size-4" />
								{t("sync.startScanning")}
							</>
						)}
					</Button>
				</div>

				{isScanning && discoveredPeers.size === 0 && (
					<div className="flex items-center gap-2 text-muted-foreground text-sm">
						<Loader2 className="size-4 animate-spin" />
						{t("sync.scanningForDevices")}
					</div>
				)}

				{!isScanning && discoveredPeers.size === 0 && (
					<p className="text-muted-foreground text-sm">
						{t("sync.noNearbyDevices")}
					</p>
				)}

				{discoveredPeers.size > 0 && (
					<div className="flex flex-col gap-2">
						{[...discoveredPeers.values()].map((peer) => (
							<div
								key={peer.deviceId}
								className="flex items-center gap-3 rounded-lg border p-4"
							>
								{peer.platform === "desktop" ? (
									<Monitor className="size-5 text-muted-foreground" />
								) : (
									<Smartphone className="size-5 text-muted-foreground" />
								)}
								<div className="flex flex-col gap-0.5">
									<span className="font-medium text-sm">{peer.deviceName}</span>
									<span className="font-mono text-muted-foreground text-xs">
										{peer.host}:{peer.port}
									</span>
								</div>
								<Badge variant="outline" className="mr-2 ml-auto">
									{t(`sync.${peer.platform}`)}
								</Badge>
								{trustedDeviceIds.has(peer.deviceId) ? (
									<div className="flex items-center gap-2">
										<Badge variant="secondary">{t("sync.paired")}</Badge>
										<Button
											size="sm"
											variant="outline"
											onClick={() => handleSyncNearby(peer)}
											disabled={syncingDeviceId === peer.deviceId}
										>
											{syncingDeviceId === peer.deviceId ? (
												<Loader2 className="size-4 animate-spin" />
											) : (
												<RefreshCw className="size-4" />
											)}
											{t("sync.syncNow")}
										</Button>
									</div>
								) : (
									<Button
										size="sm"
										onClick={() => handlePair(peer)}
										disabled={pairingDeviceId === peer.deviceId}
									>
										{pairingDeviceId === peer.deviceId ? (
											<Loader2 className="size-4 animate-spin" />
										) : null}
										{t("sync.pair")}
									</Button>
								)}
							</div>
						))}
					</div>
				)}
			</section>

			{/* Pairing Dialog */}
			<Dialog
				open={pairingDialog.open}
				onOpenChange={(open) => {
					if (!open) {
						if (pairingDialog.open && pairingDialog.direction === "incoming")
							handleRejectPair();
						else {
							setPairingDialog({ open: false });
							setPairingDeviceId(null);
						}
					}
				}}
			>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle>{t("sync.confirmPairing")}</DialogTitle>
						<DialogDescription>
							{t("sync.confirmPairingDescription")}
						</DialogDescription>
					</DialogHeader>

					{pairingDialog.open && (
						<div className="flex flex-col items-center gap-4 py-4">
							<p className="text-center text-muted-foreground text-sm">
								{t("sync.verificationCodeDescription")}
							</p>
							<div className="flex gap-2">
								{pairingDialog.sasCode.split("").map((digit, i) => (
									// index key is fine here — static 6-digit code, never reordered
									<div
										key={i}
										className="flex h-14 w-10 items-center justify-center rounded-lg border-2 font-bold font-mono text-2xl"
									>
										{digit}
									</div>
								))}
							</div>
							{pairingDialog.direction === "incoming" && (
								<p className="text-muted-foreground text-xs">
									{pairingDialog.deviceName} {t("common.name").toLowerCase()}{" "}
									wants to pair
								</p>
							)}
						</div>
					)}

					{pairingDialog.open && pairingDialog.direction === "incoming" && (
						<DialogFooter className="flex-col gap-2 sm:flex-col">
							<Button onClick={handleConfirmPair} className="w-full">
								{t("sync.confirm")}
							</Button>
							<Button
								variant="destructive"
								onClick={handleRejectPair}
								className="w-full"
							>
								{t("sync.reject")}
							</Button>
						</DialogFooter>
					)}

					{pairingDialog.open && pairingDialog.direction === "outgoing" && (
						<DialogFooter>
							<p className="w-full text-center text-muted-foreground text-xs">
								{t("sync.pairingInProgress")}
							</p>
						</DialogFooter>
					)}
				</DialogContent>
			</Dialog>

			{/* Sync IP Dialog (for trusted devices without stored host) */}
			<Dialog
				open={syncIpDialog.open}
				onOpenChange={(open) => {
					if (!open) {
						setSyncIpDialog({ open: false });
						setSyncIpInput("");
					}
				}}
			>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle>{t("sync.syncEnterIp")}</DialogTitle>
						<DialogDescription>
							{t("sync.syncEnterIpDescription")}
						</DialogDescription>
					</DialogHeader>
					<Input
						placeholder="192.168.1.x"
						value={syncIpInput}
						onChange={(e) => setSyncIpInput(e.target.value)}
					/>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setSyncIpDialog({ open: false });
								setSyncIpInput("");
							}}
						>
							{t("common.cancel")}
						</Button>
						<Button onClick={handleSyncWithIp} disabled={!syncIpInput.trim()}>
							{t("sync.syncNow")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
