import TextRecognition from "@react-native-ml-kit/text-recognition";
import * as ImagePicker from "expo-image-picker";
import { Camera, ImageIcon, ScanText } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, View } from "react-native";
import { type ParsedReceipt, parseReceipt } from "@/lib/receipt-parser";
import { globalErrorToast, globalWarningToast } from "@/lib/toast";
import { Button } from "./ui/button";
import { Icon } from "./ui/icon";
import { ModalSheet } from "./ui/modal-sheet";
import { Text } from "./ui/text";

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
	const [isScanning, setIsScanning] = useState(false);

	async function processImage(uri: string) {
		setIsScanning(true);
		try {
			const result = await TextRecognition.recognize(uri);
			if (!result.text.trim()) {
				globalWarningToast(t("receiptScanner.noTextFound"));
				return;
			}
			const parsed = parseReceipt(result.text);
			onScanSuccess(parsed);
			onClose();
		} catch {
			globalErrorToast(t("receiptScanner.scanFailed"));
		} finally {
			setIsScanning(false);
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
			allowsEditing: false,
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
			allowsEditing: false,
		});
		if (!result.canceled && result.assets[0]) {
			await processImage(result.assets[0].uri);
		}
	}

	return (
		<ModalSheet open={open} onClose={onClose} title={t("receiptScanner.title")}>
			<View className="items-center gap-2 py-2">
				<View className="items-center justify-center rounded-full bg-primary/10 p-4">
					<Icon as={ScanText} className="size-8 text-primary" />
				</View>
				<Text className="text-center text-muted-foreground text-sm">
					{t("receiptScanner.description")}
				</Text>
			</View>

			{isScanning ? (
				<View className="items-center gap-3 py-6">
					<ActivityIndicator size="large" />
					<Text className="text-muted-foreground text-sm">
						{t("receiptScanner.scanning")}
					</Text>
				</View>
			) : (
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

					<Button variant="ghost" onPress={onClose} className="mt-1">
						<Text className="text-muted-foreground">
							{t("receiptScanner.fillManually")}
						</Text>
					</Button>
				</View>
			)}
		</ModalSheet>
	);
}
