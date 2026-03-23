import type { TransactionInput } from "@finance-tracker/schema";
import { Badge } from "@finance-tracker/ui/components/badge";
import { Button } from "@finance-tracker/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@finance-tracker/ui/components/dialog";
import {
	Progress,
	ProgressLabel,
} from "@finance-tracker/ui/components/progress";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@finance-tracker/ui/components/select";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	CSV_HEADERS,
	type CsvColumn,
	parseCSV,
	parseJSON,
	REQUIRED_CSV_COLUMNS,
	type ValidatedImportRow,
	validateAndResolveCSVRow,
	validateJSONRow,
} from "@/lib/transaction-io";
import { queryClient, trpc } from "@/lib/trpc";

interface ImportTransactionsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	fileContent: string;
	filename: string;
}

const CSV_COLUMN_LABELS: Record<CsvColumn, string> = {
	date: "Date",
	amount: "Amount",
	note: "Note",
	category: "Category",
	account: "Account",
	toAccount: "To Account",
	tags: "Tags",
};

type ImportState = {
	done: number;
	total: number;
	errors: string[];
	complete: boolean;
};

type ValidatedRowWithDisplay = ValidatedImportRow & {
	display: {
		date: string;
		amount: string;
		category: string;
		account: string;
	};
};

export default function ImportTransactionsDialog({
	open,
	onOpenChange,
	fileContent,
	filename,
}: ImportTransactionsDialogProps) {
	const fileFormat: "csv" | "json" = filename.toLowerCase().endsWith(".json")
		? "json"
		: "csv";

	// Steps: CSV: 1=columnMap, 2=preview, 3=conflict, 4=importing
	//        JSON: 1=preview, 2=conflict, 3=importing
	const PREVIEW_STEP = fileFormat === "csv" ? 2 : 1;
	const CONFLICT_STEP = fileFormat === "csv" ? 3 : 2;
	const IMPORT_STEP = fileFormat === "csv" ? 4 : 3;
	const TOTAL_STEPS = fileFormat === "csv" ? 4 : 3;

	const [step, setStep] = useState(1);
	const [importState, setImportState] = useState<ImportState | null>(null);
	const importingRef = useRef(false);

	// Reset state when dialog opens
	useEffect(() => {
		if (open) {
			setStep(1);
			setImportState(null);
			importingRef.current = false;
		}
	}, [open]);

	// ── Data queries ────────────────────────────────────────────────────────
	const { data: categories = [] } = useQuery(trpc.category.list.queryOptions());
	const { data: accounts = [] } = useQuery(trpc.account.list.queryOptions());

	// CSV: name(lowercase) -> id
	const categoriesNameMap = useMemo(
		() => new Map(categories.map((c) => [c.name.toLowerCase(), c.id])),
		[categories],
	);
	const accountsNameMap = useMemo(
		() => new Map(accounts.map((a) => [a.name.toLowerCase(), a.id])),
		[accounts],
	);
	// JSON: Set of valid IDs
	const categoryIdSet = useMemo(
		() => new Set(categories.map((c) => c.id)),
		[categories],
	);
	const accountIdSet = useMemo(
		() => new Set(accounts.map((a) => a.id)),
		[accounts],
	);
	// Display maps (id -> name) for JSON preview
	const categoriesIdMap = useMemo(
		() => new Map(categories.map((c) => [c.id, c.name])),
		[categories],
	);
	const accountsIdMap = useMemo(
		() => new Map(accounts.map((a) => [a.id, a.name])),
		[accounts],
	);

	// ── CSV parsing ─────────────────────────────────────────────────────────
	const csvParsed = useMemo(() => {
		if (fileFormat !== "csv") return null;
		try {
			return parseCSV(fileContent);
		} catch {
			return { headers: [] as string[], rows: [] as Record<string, string>[] };
		}
	}, [fileContent, fileFormat]);

	// Auto-detect column map from headers
	const initialColumnMap = useMemo((): Partial<Record<CsvColumn, string>> => {
		if (!csvParsed) return {};
		const map: Partial<Record<CsvColumn, string>> = {};
		for (const col of CSV_HEADERS) {
			const match = csvParsed.headers.find(
				(h) =>
					h.toLowerCase() === col.toLowerCase() ||
					(col === "toAccount" &&
						(h.toLowerCase() === "toaccount" ||
							h.toLowerCase() === "to account" ||
							h.toLowerCase() === "to_account")),
			);
			if (match) map[col] = match;
		}
		return map;
	}, [csvParsed]);

	const [columnMap, setColumnMap] =
		useState<Partial<Record<CsvColumn, string>>>(initialColumnMap);

	useEffect(() => {
		setColumnMap(initialColumnMap);
	}, [initialColumnMap]);

	// ── JSON parsing ────────────────────────────────────────────────────────
	const jsonParseResult = useMemo(() => {
		if (fileFormat !== "json") return null;
		try {
			return { rows: parseJSON(fileContent), error: null };
		} catch (e) {
			return { rows: [] as unknown[], error: (e as Error).message };
		}
	}, [fileContent, fileFormat]);

	// ── Validated rows ──────────────────────────────────────────────────────
	const validatedRows = useMemo((): ValidatedRowWithDisplay[] => {
		if (fileFormat === "csv") {
			if (!csvParsed || csvParsed.rows.length === 0) return [];
			return csvParsed.rows.map((row) => {
				const result = validateAndResolveCSVRow(
					row,
					columnMap,
					categoriesNameMap,
					accountsNameMap,
				);
				const dateVal = columnMap.date ? (row[columnMap.date] ?? "") : "";
				const amountVal = columnMap.amount ? (row[columnMap.amount] ?? "") : "";
				const categoryVal = columnMap.category
					? (row[columnMap.category] ?? "")
					: "";
				const accountVal = columnMap.account
					? (row[columnMap.account] ?? "")
					: "";
				return {
					...result,
					display: {
						date: dateVal,
						amount: amountVal,
						category: categoryVal,
						account: accountVal,
					},
				};
			});
		}
		if (!jsonParseResult || jsonParseResult.rows.length === 0) return [];
		return jsonParseResult.rows.map((raw) => {
			const result = validateJSONRow(raw, categoryIdSet, accountIdSet);
			const r = raw as Record<string, unknown>;
			const dateNum = typeof r.date === "number" ? r.date : null;
			return {
				...result,
				display: {
					date: dateNum
						? format(new Date(dateNum), "yyyy-MM-dd")
						: String(r.date ?? ""),
					amount: String(r.amount ?? ""),
					category:
						typeof r.categoryId === "string"
							? (categoriesIdMap.get(r.categoryId) ?? r.categoryId)
							: "",
					account:
						typeof r.accountId === "string"
							? (accountsIdMap.get(r.accountId) ?? r.accountId)
							: "",
				},
			};
		});
	}, [
		fileFormat,
		csvParsed,
		jsonParseResult,
		columnMap,
		categoriesNameMap,
		accountsNameMap,
		categoryIdSet,
		accountIdSet,
		categoriesIdMap,
		accountsIdMap,
	]);

	const validRows = useMemo(
		() =>
			validatedRows.filter(
				(
					r,
				): r is ValidatedRowWithDisplay & {
					ok: true;
					data: TransactionInput;
				} => r.ok,
			),
		[validatedRows],
	);
	const invalidCount = validatedRows.length - validRows.length;

	// ── Date range for conflict detection ───────────────────────────────────
	const dateRange = useMemo(() => {
		if (validRows.length === 0) return null;
		const dates = validRows.map((r) => r.data.date);
		return { from: Math.min(...dates), to: Math.max(...dates) };
	}, [validRows]);

	const { data: existingTransactions = [] } = useQuery({
		...trpc.transaction.list.queryOptions(dateRange ?? undefined),
		enabled: step === CONFLICT_STEP && dateRange !== null,
	});

	// ── Import ──────────────────────────────────────────────────────────────
	const createMutation = useMutation(trpc.transaction.create.mutationOptions());

	async function handleImport() {
		if (importingRef.current) return;
		importingRef.current = true;
		setStep(IMPORT_STEP);

		const total = validRows.length;
		setImportState({ done: 0, total, errors: [], complete: false });

		let done = 0;
		const errors: string[] = [];

		for (const row of validRows) {
			try {
				await createMutation.mutateAsync(row.data);
				done++;
			} catch (err) {
				errors.push((err as Error).message ?? "Unknown error");
			}
			setImportState({ done, total, errors: [...errors], complete: false });
		}

		setImportState({ done, total, errors, complete: true });
		importingRef.current = false;

		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: trpc.transaction.paginated.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.transaction.summary.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.transaction.list.queryKey(),
			}),
		]);
	}

	// ── Column mapping validity ─────────────────────────────────────────────
	const csvMappingComplete = REQUIRED_CSV_COLUMNS.every(
		(col) => !!columnMap[col],
	);

	// ── Navigation ──────────────────────────────────────────────────────────
	function handleNext() {
		setStep((s) => s + 1);
	}
	function handleBack() {
		setStep((s) => s - 1);
	}

	const isImporting = step === IMPORT_STEP && !importState?.complete;
	const isDone = step === IMPORT_STEP && importState?.complete;

	const stepLabel =
		fileFormat === "csv"
			? (["Map Columns", "Preview", "Conflicts", "Importing"] as const)[
					step - 1
				]
			: (["Preview", "Conflicts", "Importing"] as const)[step - 1];

	return (
		<Dialog open={open} onOpenChange={isImporting ? undefined : onOpenChange}>
			<DialogContent className="sm:max-w-2xl" showCloseButton={!isImporting}>
				<DialogHeader>
					<DialogTitle>Import Transactions</DialogTitle>
					<p className="text-muted-foreground text-xs">
						{filename} · <span className="capitalize">{fileFormat}</span> · Step{" "}
						{step} of {TOTAL_STEPS}: {stepLabel}
					</p>
				</DialogHeader>

				{/* ── Step 1 (CSV): Column Mapping ─────────────────────────────── */}
				{fileFormat === "csv" && step === 1 && (
					<ColumnMappingStep
						headers={csvParsed?.headers ?? []}
						columnMap={columnMap}
						setColumnMap={setColumnMap}
					/>
				)}

				{/* ── Preview step ──────────────────────────────────────────────── */}
				{step === PREVIEW_STEP && (
					<PreviewStep
						validatedRows={validatedRows}
						validCount={validRows.length}
						invalidCount={invalidCount}
						jsonError={
							fileFormat === "json" ? (jsonParseResult?.error ?? null) : null
						}
					/>
				)}

				{/* ── Conflict step ─────────────────────────────────────────────── */}
				{step === CONFLICT_STEP && (
					<ConflictStep
						validCount={validRows.length}
						existingCount={existingTransactions.length}
					/>
				)}

				{/* ── Import progress step ──────────────────────────────────────── */}
				{step === IMPORT_STEP && importState && (
					<ImportProgressStep state={importState} />
				)}

				{/* ── Footer ───────────────────────────────────────────────────── */}
				<DialogFooter showCloseButton={isDone}>
					{/* Back button */}
					{step > 1 && step < IMPORT_STEP && (
						<Button variant="outline" onClick={handleBack}>
							Back
						</Button>
					)}

					{/* Next button (steps before conflict) */}
					{step < CONFLICT_STEP && (
						<Button
							onClick={handleNext}
							disabled={
								(fileFormat === "csv" && step === 1 && !csvMappingComplete) ||
								(step === PREVIEW_STEP && validRows.length === 0)
							}
						>
							Next
						</Button>
					)}

					{/* Import button (on conflict step) */}
					{step === CONFLICT_STEP && (
						<Button onClick={handleImport} disabled={validRows.length === 0}>
							Import {validRows.length} transaction
							{validRows.length !== 1 ? "s" : ""}
							{existingTransactions.length > 0
								? ` (${existingTransactions.length} existing in range)`
								: ""}
						</Button>
					)}

					{/* Done button */}
					{isDone && <Button onClick={() => onOpenChange(false)}>Done</Button>}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ColumnMappingStep({
	headers,
	columnMap,
	setColumnMap,
}: {
	headers: string[];
	columnMap: Partial<Record<CsvColumn, string>>;
	setColumnMap: (map: Partial<Record<CsvColumn, string>>) => void;
}) {
	if (headers.length === 0) {
		return (
			<div className="flex flex-col items-center gap-2 py-8 text-center">
				<XCircle className="size-8 text-destructive" />
				<p className="font-medium text-sm">Empty or invalid CSV file</p>
				<p className="text-muted-foreground text-xs">
					The file has no detectable headers. Please check the file and try
					again.
				</p>
			</div>
		);
	}

	const headerOptions = [
		{ value: "__none__", label: "(skip)" },
		...headers.map((h) => ({ value: h, label: h })),
	];

	return (
		<div className="flex flex-col gap-3">
			<p className="text-muted-foreground text-xs">
				Map your CSV columns to the transaction schema. Required fields are
				marked with *.
			</p>
			<div className="grid grid-cols-2 gap-3">
				{CSV_HEADERS.map((col) => {
					const isRequired = REQUIRED_CSV_COLUMNS.includes(col);
					const currentValue = columnMap[col] ?? "__none__";
					return (
						<div key={col} className="flex flex-col gap-1">
							<span className="text-xs">
								{CSV_COLUMN_LABELS[col]}
								{isRequired && (
									<span className="ml-0.5 text-destructive">*</span>
								)}
							</span>
							<Select
								value={currentValue}
								onValueChange={(v) => {
									setColumnMap({
										...columnMap,
										[col]: v === "__none__" ? undefined : v,
									});
								}}
							>
								<SelectTrigger className="h-8 text-xs">
									<SelectValue placeholder="Select column…" />
								</SelectTrigger>
								<SelectContent>
									{headerOptions.map((opt) => (
										<SelectItem key={opt.value} value={opt.value}>
											{opt.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					);
				})}
			</div>
		</div>
	);
}

function PreviewStep({
	validatedRows,
	validCount,
	invalidCount,
	jsonError,
}: {
	validatedRows: ValidatedRowWithDisplay[];
	validCount: number;
	invalidCount: number;
	jsonError: string | null;
}) {
	if (jsonError) {
		return (
			<div className="flex flex-col items-center gap-2 py-8 text-center">
				<XCircle className="size-8 text-destructive" />
				<p className="font-medium text-sm">Could not parse JSON file</p>
				<p className="text-muted-foreground text-xs">{jsonError}</p>
			</div>
		);
	}

	if (validatedRows.length === 0) {
		return (
			<div className="flex flex-col items-center gap-2 py-8 text-center">
				<AlertTriangle className="size-8 text-muted-foreground" />
				<p className="font-medium text-sm">No rows to preview</p>
				<p className="text-muted-foreground text-xs">
					The file has no data rows, or all columns are unmapped.
				</p>
			</div>
		);
	}

	const previewRows = validatedRows.slice(0, 10);
	const remaining = validatedRows.length - previewRows.length;

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center gap-2">
				<Badge variant="secondary">{validatedRows.length} total</Badge>
				{validCount > 0 && (
					<Badge className="border-green-200 bg-green-500/10 text-green-600">
						{validCount} valid
					</Badge>
				)}
				{invalidCount > 0 && (
					<Badge variant="destructive">{invalidCount} invalid</Badge>
				)}
			</div>

			<div className="overflow-hidden rounded-md border">
				<table className="w-full text-xs">
					<thead>
						<tr className="border-b bg-muted/50">
							<th className="px-3 py-2 text-left font-medium">Date</th>
							<th className="px-3 py-2 text-left font-medium">Amount</th>
							<th className="px-3 py-2 text-left font-medium">Category</th>
							<th className="px-3 py-2 text-left font-medium">Account</th>
							<th className="px-3 py-2 text-left font-medium">Status</th>
						</tr>
					</thead>
					<tbody>
						{previewRows.map((row, i) => (
							<tr
								key={i}
								className={
									row.ok
										? "border-b last:border-0"
										: "border-b bg-destructive/5 last:border-0"
								}
							>
								<td className="px-3 py-2">{row.display.date}</td>
								<td className="px-3 py-2">{row.display.amount}</td>
								<td className="px-3 py-2">{row.display.category}</td>
								<td className="px-3 py-2">{row.display.account}</td>
								<td className="px-3 py-2">
									{row.ok ? (
										<CheckCircle2 className="size-3.5 text-green-500" />
									) : (
										<span
											className="text-destructive"
											title={row.errors.join(", ")}
										>
											<XCircle className="mr-1 inline size-3.5" />
											{row.errors[0]}
										</span>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
				{remaining > 0 && (
					<p className="border-t px-3 py-2 text-center text-muted-foreground text-xs">
						…and {remaining} more rows
					</p>
				)}
			</div>

			{invalidCount > 0 && validCount === 0 && (
				<p className="text-destructive text-xs">
					All rows are invalid. Go back and fix the column mapping.
				</p>
			)}
		</div>
	);
}

function ConflictStep({
	validCount,
	existingCount,
}: {
	validCount: number;
	existingCount: number;
}) {
	return (
		<div className="flex flex-col gap-4 py-2">
			{existingCount > 0 ? (
				<div className="flex gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950/30">
					<AlertTriangle className="mt-0.5 size-4 shrink-0 text-yellow-600 dark:text-yellow-500" />
					<div className="flex flex-col gap-1">
						<p className="font-medium text-sm">Potential duplicates detected</p>
						<p className="text-muted-foreground text-xs">
							There are{" "}
							<strong className="text-foreground">{existingCount}</strong>{" "}
							existing transactions within the same date range as your import.
							Importing will not remove existing transactions — you may end up
							with duplicates.
						</p>
					</div>
				</div>
			) : (
				<div className="flex gap-3 rounded-lg border p-3">
					<CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-500" />
					<div className="flex flex-col gap-1">
						<p className="font-medium text-sm">No conflicts detected</p>
						<p className="text-muted-foreground text-xs">
							No existing transactions overlap with this import's date range.
						</p>
					</div>
				</div>
			)}
			<p className="text-muted-foreground text-xs">
				Ready to import{" "}
				<strong className="text-foreground">{validCount}</strong> transaction
				{validCount !== 1 ? "s" : ""}.
			</p>
		</div>
	);
}

function ImportProgressStep({ state }: { state: ImportState }) {
	const percent =
		state.total > 0 ? Math.round((state.done / state.total) * 100) : 0;

	return (
		<div className="flex flex-col gap-4 py-2">
			{!state.complete ? (
				<Progress value={percent} className="flex-col gap-1.5">
					<div className="flex w-full items-center justify-between">
						<ProgressLabel>Importing transactions…</ProgressLabel>
						<span className="text-muted-foreground text-xs tabular-nums">
							{percent}%
						</span>
					</div>
				</Progress>
			) : (
				<div className="flex flex-col gap-2">
					{state.errors.length === 0 ? (
						<div className="flex items-center gap-2 text-green-600 dark:text-green-400">
							<CheckCircle2 className="size-4" />
							<p className="font-medium text-sm">
								Successfully imported {state.done} transaction
								{state.done !== 1 ? "s" : ""}.
							</p>
						</div>
					) : (
						<div className="flex items-center gap-2 text-destructive">
							<AlertTriangle className="size-4" />
							<p className="font-medium text-sm">
								Imported {state.done} of {state.total}. {state.errors.length}{" "}
								failed.
							</p>
						</div>
					)}
					{state.errors.length > 0 && (
						<div className="max-h-32 overflow-y-auto rounded-md border bg-muted/30 p-2">
							{state.errors.map((err, i) => (
								<p key={i} className="text-destructive text-xs">
									{err}
								</p>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
