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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@finance-tracker/ui/components/dropdown-menu";
import { cn } from "@finance-tracker/ui/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { Ellipsis, Eye, LoaderCircle, Pencil, Printer } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export type CustomAction = {
	icon: React.ReactNode;
	text: string;
	action: string | (() => void);
	className?: string;
};

type DataTableActionCellProps = {
	icon: React.ReactNode;
	editIcon?: React.ReactNode;
	editText?: string;
	triggerText: string;
	dialogTitle: string;
	dialogDescription: string;
	cancelText?: string;
	confirmText?: string;
	isLoading?: boolean;
	btnClassName?: string;
	onEditAction?: string | (() => void);
	onHoverEdit?: () => void;
	onConfirm: () => void;
	showDetail?: boolean;
	detailIcon?: React.ReactNode;
	detailText?: string;
	onDetailAction?: string | (() => void);
	onHoverDetail?: () => void;
	showPrint?: boolean;
	printIcon?: React.ReactNode;
	printText?: string;
	onPrintAction?: () => void;
	deleteIcon?: React.ReactNode;
	deleteText?: string;
	customActions?: CustomAction[];
	/** Show edit action - defaults to true if onEditAction is provided */
	showEdit?: boolean;
	/** Show delete action - defaults to true */
	showDelete?: boolean;
};

export default function DataTableActionCell({
	icon,
	editIcon = <Pencil className="mr-4 size-4" />,
	editText,
	triggerText,
	dialogTitle,
	dialogDescription,
	cancelText,
	confirmText,
	isLoading = false,
	btnClassName,
	onEditAction,
	onHoverEdit,
	onConfirm,
	showDetail = false,
	detailIcon = <Eye className="mr-4 size-4" />,
	detailText,
	onDetailAction,
	onHoverDetail,
	showPrint = false,
	printIcon = <Printer className="mr-4 size-4" />,
	printText,
	onPrintAction,
	deleteIcon = icon,
	deleteText = triggerText,
	customActions = [],
	showEdit = true,
	showDelete = true,
}: DataTableActionCellProps) {
	const { t } = useTranslation();
	const resolvedEditText = editText ?? t("common.edit");
	const resolvedDetailText = detailText ?? t("common.seeDetails");
	const resolvedPrintText = printText ?? t("common.printPDF");
	const resolvedDeleteText = deleteText ?? t("common.delete");
	const resolvedCancelText = cancelText ?? t("common.cancel");
	const resolvedConfirmText = confirmText ?? t("common.confirm");

	const navigate = useNavigate();

	const [isOpen, setIsOpen] = useState(false);

	// wait for the isLoading to be false before closing the dialog
	useEffect(() => {
		if (!isLoading) {
			setIsOpen(false);
		}
	}, [isLoading]);

	const renderActionItem = (action: CustomAction, index: number) => {
		if (typeof action.action === "string") {
			return (
				<DropdownMenuItem
					key={index}
					render={
						<a
							href={action.action}
							aria-label={action.text}
							className={cn("flex items-center gap-2", action.className)}
						>
							{action.icon}
							{action.text}
						</a>
					}
				/>
			);
		}
		return (
			<DropdownMenuItem
				key={index}
				onClick={() => typeof action.action === "function" && action.action()}
				className={action.className}
			>
				{action.icon}
				{action.text}
			</DropdownMenuItem>
		);
	};

	return (
		<AlertDialog open={isOpen}>
			<DropdownMenu>
				<DropdownMenuTrigger aria-label="Buka menu aksi">
					<Ellipsis className="size-4 text-black dark:text-white" />
				</DropdownMenuTrigger>
				<DropdownMenuContent className="group">
					{/* Detail Action */}
					{showDetail &&
						onDetailAction &&
						(typeof onDetailAction === "string" ? (
							<DropdownMenuItem
								render={
									<button
										type="button"
										aria-label={resolvedDetailText}
										className="flex items-center gap-2"
										onMouseEnter={() => onHoverDetail?.()}
										onClick={() => navigate({ to: onDetailAction })}
									>
										{detailIcon}
										{resolvedDetailText}
									</button>
								}
							/>
						) : (
							<DropdownMenuItem
								onClick={() => onDetailAction()}
								onMouseEnter={() => onHoverDetail?.()}
							>
								{detailIcon}
								{resolvedDetailText}
							</DropdownMenuItem>
						))}

					{/* Edit Action */}
					{showEdit &&
						onEditAction &&
						(typeof onEditAction === "string" ? (
							<DropdownMenuItem
								render={
									<button
										type="button"
										aria-label={resolvedEditText}
										className="flex items-center gap-2"
										onMouseEnter={() => onHoverEdit?.()}
										onClick={() => navigate({ to: onEditAction })}
									>
										{editIcon}
										{resolvedEditText}
									</button>
								}
							/>
						) : (
							<DropdownMenuItem
								onClick={() => onEditAction()}
								onMouseEnter={() => onHoverEdit?.()}
							>
								<div className="flex items-center gap-2">
									{editIcon}
									{resolvedEditText}
								</div>
							</DropdownMenuItem>
						))}

					{/* Print Action */}
					{showPrint && onPrintAction && (
						<DropdownMenuItem onClick={onPrintAction}>
							{printIcon}
							{resolvedPrintText}
						</DropdownMenuItem>
					)}

					{/* Custom Actions */}
					{customActions.map((action, index) =>
						renderActionItem(action, index),
					)}

					{/* Delete Action */}
					{showDelete && (
						<DropdownMenuItem className="focus:bg-destructive focus:text-destructive-foreground">
							<AlertDialogTrigger
								focus:bg-destructive
								onClick={() => setIsOpen(true)}
								render={
									<button
										type="button"
										className="flex w-full items-center gap-2"
									>
										{deleteIcon}
										{resolvedDeleteText}
									</button>
								}
							/>
						</DropdownMenuItem>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
					<AlertDialogDescription>{dialogDescription}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={() => setIsOpen(false)}>
						{resolvedCancelText}
					</AlertDialogCancel>
					<AlertDialogAction
						onClick={() => onConfirm()}
						className={cn(btnClassName)}
						disabled={isLoading}
					>
						{isLoading ? (
							<LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
						) : null}
						{resolvedConfirmText}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
