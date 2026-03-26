import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "./ui/text";

type ConfirmationDialogProps = {
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	trigger?: React.ReactNode;
	title: string;
	description: string;
	children?: React.ReactNode;
	cancelText?: string;
	confirmText?: string;
	isLoading?: boolean;
	onConfirm: () => void;
	confirmClassName?: string;
	variant?: "default" | "destructive";
};

export function ConfirmationDialog({
	open: controlledOpen,
	onOpenChange,
	trigger,
	title,
	description,
	children,
	cancelText,
	confirmText,
	isLoading = false,
	onConfirm,
	confirmClassName,
	variant = "default",
}: ConfirmationDialogProps) {
	const { t } = useTranslation();
	const [internalOpen, setInternalOpen] = useState(false);
	const wasLoading = useRef(false);

	const isControlled = controlledOpen !== undefined;
	const open = isControlled ? controlledOpen : internalOpen;

	const setOpen = useCallback(
		(value: boolean) => {
			if (!isControlled) setInternalOpen(value);
			onOpenChange?.(value);
		},
		[isControlled, onOpenChange],
	);

	useEffect(() => {
		if (wasLoading.current && !isLoading) {
			setOpen(false);
		}
		wasLoading.current = isLoading;
	}, [isLoading, setOpen]);

	const resolvedCancelText = cancelText ?? t("common.cancel");
	const resolvedConfirmText = confirmText ?? t("common.confirm");

	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			{trigger && <AlertDialogTrigger>{trigger}</AlertDialogTrigger>}
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				{children && <View className="py-2">{children}</View>}
				<AlertDialogFooter>
					<AlertDialogCancel>
						<Text>{resolvedCancelText}</Text>
					</AlertDialogCancel>
					<AlertDialogAction
						variant={variant === "destructive" ? "destructive" : "default"}
						className={confirmClassName}
						disabled={isLoading}
						onPress={onConfirm}
					>
						{isLoading && <Spinner />}
						<Text className="text-white">{resolvedConfirmText}</Text>
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
