import {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandShortcut,
} from "@finance-tracker/ui/components/command";
import { useHotkey } from "@tanstack/react-hotkeys";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { SearchIcon } from "lucide-react";
import { useDeferredValue, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";

const CURRENCY_LOCALE_MAP: Record<string, string> = {
	IDR: "id-ID",
	USD: "en-US",
};

const LANGUAGE_LOCALE_MAP: Record<string, string> = {
	id: "id-ID",
	en: "en-US",
};

function formatAmount(amount: number, currency: string) {
	const locale = CURRENCY_LOCALE_MAP[currency] ?? "id-ID";
	return new Intl.NumberFormat(locale, {
		style: "currency",
		currency,
		maximumFractionDigits: 0,
	}).format(amount);
}

function formatDate(timestamp: number, locale: string) {
	return new Intl.DateTimeFormat(locale, {
		day: "numeric",
		month: "short",
	}).format(new Date(timestamp));
}

const TYPE_AMOUNT_CLASS = {
	income: "text-green-600",
	expense: "text-red-500",
	savings: "text-violet-500",
	transfer: "text-muted-foreground",
} as const;

const TYPE_PREFIX = {
	income: "+",
	expense: "-",
	savings: "-",
	transfer: "",
} as const;

function HighlightMatch({ text, query }: { text: string; query: string }) {
	if (!query) return <span>{text}</span>;
	const idx = text.toLowerCase().indexOf(query.toLowerCase());
	if (idx === -1) return <span>{text}</span>;
	return (
		<span>
			{text.slice(0, idx)}
			<mark className="rounded bg-yellow-200 px-0.5 dark:bg-yellow-800">
				{text.slice(idx, idx + query.length)}
			</mark>
			{text.slice(idx + query.length)}
		</span>
	);
}

const OPEN_EVENT = "global-search:open";

export function GlobalSearch() {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const deferredQuery = useDeferredValue(query);
	const navigate = useNavigate();

	useHotkey("Mod+K", (e) => {
		e.preventDefault();
		setOpen((prev) => !prev);
	});

	useEffect(() => {
		const handler = () => setOpen(true);
		window.addEventListener(OPEN_EVENT, handler);
		return () => window.removeEventListener(OPEN_EVENT, handler);
	}, []);

	const { data: currencySetting } = useQuery(
		trpc.appSetting.get.queryOptions({ key: "currency" }),
	);
	const { data: languageSetting } = useQuery(
		trpc.appSetting.get.queryOptions({ key: "language" }),
	);
	const { t } = useTranslation();
	const currency = currencySetting?.value ?? "IDR";
	const locale = LANGUAGE_LOCALE_MAP[languageSetting?.value ?? "id"] ?? "id-ID";

	const { data: results = [] } = useQuery({
		...trpc.transaction.search.queryOptions({
			query: deferredQuery,
			limit: 8,
		}),
		enabled: deferredQuery.length > 0,
		placeholderData: keepPreviousData,
	});

	function handleOpenChange(val: boolean) {
		setOpen(val);
		if (!val) setQuery("");
	}

	function handleSelect() {
		handleOpenChange(false);
		navigate({ to: "/transactions" });
	}

	return (
		<CommandDialog
			open={open}
			onOpenChange={handleOpenChange}
			title={t("search.title")}
			description={t("search.description")}
		>
			<Command shouldFilter={false}>
				<CommandInput
					placeholder={t("search.placeholder")}
					value={query}
					onValueChange={setQuery}
				/>
				<CommandList>
					{query.length === 0 && (
						<div className="flex flex-col items-center gap-1 py-8 text-muted-foreground">
							<SearchIcon className="size-5 opacity-40" />
							<span className="text-xs">{t("search.hint")}</span>
						</div>
					)}
					{query.length > 0 && results.length === 0 && (
						<CommandEmpty>{t("search.noResults")}</CommandEmpty>
					)}
					{results.length > 0 && (
						<CommandGroup heading={t("search.heading")}>
							{results.map((tx) => {
								const type =
									(tx.category?.type as keyof typeof TYPE_AMOUNT_CLASS) ??
									"transfer";
								const amountClass =
									TYPE_AMOUNT_CLASS[type] ?? TYPE_AMOUNT_CLASS.transfer;
								const prefix = TYPE_PREFIX[type] ?? "";
								const label = tx.note ?? tx.category?.name ?? "—";

								return (
									<CommandItem
										key={tx.id}
										value={tx.id}
										onSelect={handleSelect}
									>
										<div className="flex min-w-0 flex-1 items-center gap-2">
											<div className="flex min-w-0 flex-1 flex-col">
												<span className="truncate font-medium text-xs">
													<HighlightMatch text={label} query={deferredQuery} />
												</span>
												<span className="text-muted-foreground text-xs">
													{tx.category?.name && (
														<>
															<HighlightMatch
																text={tx.category.name}
																query={deferredQuery}
															/>
															{" · "}
														</>
													)}
													{formatDate(tx.date, locale)}
												</span>
											</div>
											<span
												className={`shrink-0 font-medium text-xs ${amountClass}`}
											>
												{prefix}
												{formatAmount(tx.amount, currency)}
											</span>
										</div>
									</CommandItem>
								);
							})}
						</CommandGroup>
					)}
				</CommandList>
				<div className="flex items-center justify-between border-t px-3 py-2 text-muted-foreground text-xs">
					<span>{t("search.navigateHint")}</span>
					<CommandShortcut>⌘K</CommandShortcut>
				</div>
			</Command>
		</CommandDialog>
	);
}

const isMac = /Mac/i.test(navigator.userAgent);

export function SearchTrigger() {
	const { t } = useTranslation();

	return (
		<button
			type="button"
			onClick={() => window.dispatchEvent(new CustomEvent(OPEN_EVENT))}
			className="flex h-7 w-64 items-center gap-2 rounded-md border border-input bg-muted/40 px-2.5 text-muted-foreground text-xs shadow-none transition-colors hover:bg-muted"
		>
			<SearchIcon className="size-3 shrink-0" />
			<span className="flex-1 text-left">{t("search.placeholder")}</span>
			<kbd className="pointer-events-none rounded border border-border bg-background px-1 font-mono text-[0.6rem]">
				{isMac ? "⌘K" : "Ctrl+K"}
			</kbd>
		</button>
	);
}
