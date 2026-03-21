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
} from "@finance-tracker/ui/components/alert-dialog";
import { Button } from "@finance-tracker/ui/components/button";
import { cn } from "@finance-tracker/ui/lib/utils";
import { LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Props for {@link ConfirmationDialog}.
 */
type ConfirmationDialogProps = {
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	trigger?: React.ReactNode;
	title: string;
	description: string;
	/** Custom body content rendered between the header and footer (e.g. form fields). */
	children?: React.ReactNode;
	cancelText?: string;
	confirmText?: string;
	isLoading?: boolean;
	onConfirm: () => void;
	confirmClassName?: string;
	variant?: "default" | "destructive";
};

/**
 * Reusable confirmation dialog with built-in loading state.
 * Wraps shadcn/ui `AlertDialog` with a simpler API for confirm/cancel flows.
 *
 * Works in both **controlled** (pass `open`/`onOpenChange`) and **uncontrolled** (omit them) modes.
 *
 * @example
 * ```tsx
 * // Uncontrolled — dialog manages its own state
 * <ConfirmationDialog
 *   trigger={<Button variant="destructive">Hapus</Button>}
 *   title="Hapus Item?"
 *   description="Tindakan ini tidak dapat dibatalkan."
 *   confirmText="Hapus"
 *   variant="destructive"
 *   isLoading={deleteMutation.isPending}
 *   onConfirm={() => deleteMutation.mutate({ id })}
 * />
 *
 * // Controlled
 * const [open, setOpen] = useState(false);
 *
 * <ConfirmationDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   trigger={<Button>Cabut Sesi</Button>}
 *   title="Cabut Sesi?"
 *   description="Perangkat perlu login ulang."
 *   confirmText="Cabut"
 *   isLoading={mutation.isPending}
 *   onConfirm={() => mutation.mutate({ sessionId })}
 * />
 *
 * // With custom body content (e.g. form fields)
 * <ConfirmationDialog
 *   open={dialogs.isOpen("reject")}
 *   onOpenChange={(open) => open ? dialogs.open("reject") : dialogs.close("reject")}
 *   title="Tolak Order"
 *   description="Berikan alasan penolakan order ini."
 *   confirmText="Tolak Order"
 *   variant="destructive"
 *   isLoading={rejectMutation.isPending}
 *   onConfirm={handleReject}
 * >
 *   <Textarea
 *     value={reason}
 *     onChange={(e) => setReason(e.target.value)}
 *     placeholder="Tuliskan alasan penolakan"
 *     rows={4}
 *   />
 * </ConfirmationDialog>
 * ```
 */
export function ConfirmationDialog({
	open,
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
	const resolvedCancelText = cancelText ?? t("common.cancel");
	const resolvedConfirmText = confirmText ?? t("common.confirm");
	const destructiveClass =
		variant === "destructive"
			? "bg-destructive text-white hover:bg-destructive/90"
			: undefined;

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			{trigger && (
				<AlertDialogTrigger render={<Button />}>{trigger}</AlertDialogTrigger>
			)}
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				{children && <div className="py-4">{children}</div>}
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isLoading}>
						{resolvedCancelText}
					</AlertDialogCancel>
					<AlertDialogAction
						onClick={(e) => {
							e.preventDefault();
							onConfirm();
						}}
						disabled={isLoading}
						className={cn(destructiveClass, confirmClassName)}
					>
						{isLoading && (
							<LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
						)}
						{resolvedConfirmText}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
