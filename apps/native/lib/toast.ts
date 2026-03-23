import type { useToast } from "heroui-native";

type ToastInstance = ReturnType<typeof useToast>["toast"];

let _toast: ToastInstance | null = null;

const DEFAULT_DURATION = 1500;
const WARNING_DURATION = 3000;

export const setToastRef = (toast: ToastInstance | null) => {
	_toast = toast;
};

export const globalSuccessToast = (message: string) => {
	return _toast?.show({
		variant: "success",
		label: "Success",
		description: message,
		duration: DEFAULT_DURATION,
	});
};

export const globalLoadingToast = (message: string) => {
	return _toast?.show({
		label: message,
		duration: "persistent",
	});
};

export const dismissLoadingToast = (toastId: string | number) => {
	_toast?.hide(String(toastId));
};

export const globalErrorToast = (message: string, title?: string) => {
	return _toast?.show({
		variant: "danger",
		label: title ?? "Error",
		description: message,
		duration: DEFAULT_DURATION,
	});
};

export const globalInfoToast = (message: string) => {
	return _toast?.show({
		label: "Info",
		description: message,
		duration: WARNING_DURATION,
	});
};

export const globalWarningToast = (message: string) => {
	return _toast?.show({
		variant: "warning",
		label: "Warning",
		description: message,
		duration: WARNING_DURATION,
	});
};
