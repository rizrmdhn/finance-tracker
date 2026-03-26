import { toast } from "sonner-native";

const DEFAULT_DURATION = 1500;
const WARNING_DURATION = 3000;

export const globalSuccessToast = (message: string) =>
	toast.success(message, { duration: DEFAULT_DURATION });

export const globalErrorToast = (message: string, title?: string) =>
	toast.error(title ?? message, {
		description: title ? message : undefined,
		duration: DEFAULT_DURATION,
	});

export const globalWarningToast = (message: string) =>
	toast.warning(message, { duration: WARNING_DURATION });

export const globalInfoToast = (message: string) =>
	toast.info(message, { duration: WARNING_DURATION });

export const globalLoadingToast = (message: string) => toast.loading(message);

export const dismissLoadingToast = (toastId: string | number) =>
	toast.dismiss(toastId);
