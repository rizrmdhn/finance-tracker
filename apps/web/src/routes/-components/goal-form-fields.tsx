import type { Account } from "@finance-tracker/types";
import { Button } from "@finance-tracker/ui/components/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@finance-tracker/ui/components/select";
import { XIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DatePicker } from "@/components/date-picker";
import { ICON_MAP } from "@/components/icon-picker";

export function AccountOption({ account }: { account: Account }) {
	const Icon = account.icon ? ICON_MAP[account.icon] : null;
	const color = account.color ?? "#94a3b8";
	return (
		<span className="flex min-w-0 items-center gap-2">
			{Icon ? (
				<Icon className="size-3.5 shrink-0" style={{ color }} />
			) : (
				<span
					className="size-2.5 shrink-0 rounded-full"
					style={{ backgroundColor: color }}
				/>
			)}
			<span className="truncate">{account.name}</span>
		</span>
	);
}

const NO_ACCOUNT = "none";

interface LinkedAccountSelectProps {
	value?: string | null;
	onChange: (accountId: string | null) => void;
	accounts: { account: Account; canLink: boolean }[];
}

/** Linked account picker with a "no linked account" option; unavailable accounts are disabled. */
export function LinkedAccountSelect({
	value,
	onChange,
	accounts,
}: LinkedAccountSelectProps) {
	const { t } = useTranslation();
	const selected = accounts.find((a) => a.account.id === value)?.account;

	return (
		<Select
			value={value ?? NO_ACCOUNT}
			onValueChange={(id) => onChange(id && id !== NO_ACCOUNT ? id : null)}
		>
			<SelectTrigger className="w-full">
				<SelectValue>
					{selected ? (
						<AccountOption account={selected} />
					) : (
						t("goals.form.noLinkedAccount")
					)}
				</SelectValue>
			</SelectTrigger>
			<SelectContent>
				<SelectItem value={NO_ACCOUNT}>
					{t("goals.form.noLinkedAccount")}
				</SelectItem>
				{accounts.map(({ account, canLink }) => (
					<SelectItem key={account.id} value={account.id} disabled={!canLink}>
						<span className="flex flex-col">
							<AccountOption account={account} />
							{!canLink && (
								<span className="text-[0.625rem] text-muted-foreground">
									{t("goals.form.linkedAccountUnavailable")}
								</span>
							)}
						</span>
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

interface TargetDatePickerProps {
	value?: number | null;
	onChange: (date: number | null) => void;
}

/** Optional date: the picker plus a button that clears it. */
export function TargetDatePicker({ value, onChange }: TargetDatePickerProps) {
	const { t } = useTranslation();

	return (
		<div className="flex gap-2">
			<DatePicker value={value ?? undefined} onChange={onChange} />
			{value != null && (
				<Button
					type="button"
					variant="outline"
					size="icon"
					aria-label={t("goals.form.clearTargetDate")}
					onClick={() => onChange(null)}
				>
					<XIcon />
				</Button>
			)}
		</div>
	);
}
