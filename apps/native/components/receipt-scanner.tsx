import type { SupportedCurrency } from "@finance-tracker/constants";
import TextRecognition from "@react-native-ml-kit/text-recognition";
import * as ImagePicker from "expo-image-picker";
import { Camera, ImageIcon, RotateCcw, ScanText } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, View } from "react-native";
import { type ParsedReceipt, parseReceipt } from "@/lib/receipt-parser";
import { globalErrorToast, globalWarningToast } from "@/lib/toast";
import { DatePicker } from "./form/date-picker";
import { Button } from "./ui/button";
import { Field, FieldLabel } from "./ui/field";
import { Icon } from "./ui/icon";
import { Input } from "./ui/input";
import { ModalSheet } from "./ui/modal-sheet";
import { Text } from "./ui/text";

type ScanStep = "idle" | "scanning" | "reviewing";

interface ReviewState {
	amount: string;
	note: string;
	date: number;
	currency: SupportedCurrency | null;
}

interface ReceiptScannerProps {
	open: boolean;
	onClose: () => void;
	onScanSuccess: (result: ParsedReceipt) => void;
}

export function ReceiptScanner({
	open,
	onClose,
	onScanSuccess,
}: ReceiptScannerProps) {
	const { t } = useTranslation();
	const [step, setStep] = useState<ScanStep>("idle");
	const [review, setReview] = useState<ReviewState>({
		amount: "",
		note: "",
		date: Date.now(),
		currency: null,
	});

	function resetToIdle() {
		setStep("idle");
	}

	async function processImage(uri: string) {
		setStep("scanning");
		try {
			const result = await TextRecognition.recognize(uri);
			if (!result.text.trim()) {
				globalWarningToast(t("receiptScanner.noTextFound"));
				setStep("idle");
				return;
			}
			const parsed = parseReceipt(result.text);
			setReview({
				amount: parsed.amount !== null ? String(parsed.amount) : "",
				note: parsed.note ?? "",
				date: parsed.date ?? Date.now(),
				currency: parsed.currency,
			});
			setStep("reviewing");
		} catch {
			globalErrorToast(t("receiptScanner.scanFailed"));
			setStep("idle");
		}
	}

	async function handleTakePhoto() {
		const permission = await ImagePicker.requestCameraPermissionsAsync();
		if (!permission.granted) {
			globalErrorToast(t("receiptScanner.permissionDenied"));
			return;
		}
		const result = await ImagePicker.launchCameraAsync({
			mediaTypes: ["images"],
			quality: 0.9,
			allowsEditing: true,
		});
		if (!result.canceled && result.assets[0]) {
			await processImage(result.assets[0].uri);
		}
	}

	async function handleChooseFromLibrary() {
		const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (!permission.granted) {
			globalErrorToast(t("receiptScanner.permissionDenied"));
			return;
		}
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ["images"],
			quality: 0.9,
			allowsEditing: true,
		});
		if (!result.canceled && result.assets[0]) {
			await processImage(result.assets[0].uri);
		}
	}

	function handleConfirm() {
		const amount = Number.parseFloat(review.amount);
		onScanSuccess({
			amount: Number.isFinite(amount) && amount > 0 ? amount : null,
			note: review.note.trim() || null,
			date: review.date,
			currency: review.currency,
		});
		onClose();
		setStep("idle");
	}

	function handleClose() {
		onClose();
		setStep("idle");
	}

	const title =
		step === "reviewing"
			? t("receiptScanner.review")
			: t("receiptScanner.title");

	return (
		<ModalSheet open={open} onClose={handleClose} title={title}>
			{step === "idle" && (
				<>
					<View className="items-center gap-2 py-2">
						<View className="items-center justify-center rounded-full bg-primary/10 p-4">
							<Icon as={ScanText} className="size-8 text-primary" />
						</View>
						<Text className="text-center text-muted-foreground text-sm">
							{t("receiptScanner.description")}
						</Text>
					</View>

					<View className="gap-3">
						<Button
							onPress={handleTakePhoto}
							variant="outline"
							className="h-14 flex-row gap-3"
						>
							<Icon as={Camera} className="size-5 text-foreground" />
							<Text>{t("receiptScanner.takePhoto")}</Text>
						</Button>

						<Button
							onPress={handleChooseFromLibrary}
							variant="outline"
							className="h-14 flex-row gap-3"
						>
							<Icon as={ImageIcon} className="size-5 text-foreground" />
							<Text>{t("receiptScanner.chooseFromLibrary")}</Text>
						</Button>

						<Button variant="ghost" onPress={handleClose} className="mt-1">
							<Text className="text-muted-foreground">
								{t("receiptScanner.fillManually")}
							</Text>
						</Button>
					</View>
				</>
			)}

			{step === "scanning" && (
				<View className="items-center gap-3 py-12">
					<ActivityIndicator size="large" />
					<Text className="text-muted-foreground text-sm">
						{t("receiptScanner.scanning")}
					</Text>
				</View>
			)}

			{step === "reviewing" && (
				<>
					<Text className="text-muted-foreground text-sm">
						{t("receiptScanner.reviewDescription")}
					</Text>

					{review.currency && (
						<View className="self-start rounded-full bg-primary/10 px-3 py-1">
							<Text className="font-medium text-primary text-xs">
								{review.currency}
							</Text>
						</View>
					)}

					<Field>
						<FieldLabel>{t("common.amount")}</FieldLabel>
						<Input
							value={review.amount}
							onChangeText={(v) => setReview((r) => ({ ...r, amount: v }))}
							keyboardType="decimal-pad"
							placeholder={t("receiptScanner.notDetected")}
						/>
					</Field>

					<Field>
						<FieldLabel>{t("common.note")}</FieldLabel>
						<Input
							value={review.note}
							onChangeText={(v) => setReview((r) => ({ ...r, note: v }))}
							placeholder={t("receiptScanner.notDetected")}
						/>
					</Field>

					<Field>
						<FieldLabel>{t("common.date")}</FieldLabel>
						<DatePicker
							value={review.date}
							onChange={(v) => setReview((r) => ({ ...r, date: v }))}
						/>
					</Field>

					<Button onPress={handleConfirm} className="mt-2">
						<Text>{t("receiptScanner.confirmAndFill")}</Text>
					</Button>

					<Button
						variant="outline"
						onPress={resetToIdle}
						className="flex-row gap-2"
					>
						<Icon as={RotateCcw} className="size-4 text-foreground" />
						<Text>{t("receiptScanner.scanAgain")}</Text>
					</Button>
				</>
			)}
		</ModalSheet>
	);
}
