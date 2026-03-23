import { useToast } from "heroui-native";
import { useEffect } from "react";
import { setToastRef } from "@/lib/toast";

export function ToastBridge() {
	const { toast } = useToast();

	useEffect(() => {
		setToastRef(toast);
		return () => setToastRef(null);
	}, [toast]);

	return null;
}
