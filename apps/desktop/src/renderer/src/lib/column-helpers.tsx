import type { FilterVariant } from "@finance-tracker/types";
import { Badge } from "@finance-tracker/ui/components/badge";
import { cn } from "@finance-tracker/ui/lib/utils";
import type {
	ColumnDef,
	ColumnMeta,
	Row,
	RowData,
} from "@tanstack/react-table";
import { format } from "date-fns";
import type { LucideIcon } from "lucide-react";
import { Text } from "lucide-react";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";

type NestedKeyOf<T> = {
	[K in keyof T & string]: T[K] extends object
		? T[K] extends unknown[]
			? K
			: K | `${K}.${NestedKeyOf<T[K]>}`
		: K;
}[keyof T & string];

interface NumberColumnOptions {
	/** Width class (e.g., 'w-48', 'max-w-64') */
	width?: string;
}

/**
 * Creates a numbered row column (1, 2, 3...)
 */
export function createNumberColumn<T>(
	currentPage: number,
	perPage: number,
	options: NumberColumnOptions = {},
): ColumnDef<T> {
	const { width = "w-12" } = options;

	return {
		id: "no",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="No" label="No" />
		),
		cell: ({ row }) => (
			<div className={width}>{row.index + 1 + (currentPage - 1) * perPage}</div>
		),
	};
}

interface TextColumnOptions {
	/** Width class (e.g., 'w-48', 'max-w-64') */
	width?: string;
	/** Enable column filtering */
	enableFilter?: boolean;
	/** Custom placeholder for filter */
	placeholder?: string;
	/** Filter variant */
	variant?: FilterVariant;
	/** Icon for the filter */
	icon?: LucideIcon;
	/** Whether the text value is nullable */
	nullable?: boolean;
}

/**
 * Creates a text column with optional truncation and filtering
 */
export function createTextColumn<T extends RowData>(
	id: Extract<NestedKeyOf<T>, string>,
	label: string,
	options: TextColumnOptions = {},
): ColumnDef<T> {
	const {
		width = "w-48",
		enableFilter = false,
		placeholder = `Cari ${label.toLowerCase()}...`,
		variant = "text",
		icon = Text,
		nullable = false,
	} = options;

	const meta: ColumnMeta<T, unknown> = enableFilter
		? {
				label,
				placeholder,
				variant,
				icon,
			}
		: { label };

	return {
		id,
		accessorKey: id,
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title={label} label={label} />
		),
		cell: ({ row }) => (
			<div className={`${width} truncate`} title={row.getValue(id)}>
				{row.getValue(id) ?? (nullable ? "-" : "")}
			</div>
		),
		meta,
		enableColumnFilter: enableFilter,
	};
}

interface BadgeColumnOptions {
	/** Width class (e.g., 'w-48', 'max-w-64') */
	width?: string;
	/** Enable column filtering */
	enableFilter?: boolean;
	/** Custom placeholder for filter */
	placeholder?: string;
	/** Filter variant */
	variant?: FilterVariant;
	/** Icon for the filter */
	icon?: LucideIcon;
	/** Whether the badge value is boolean */
	valueIsBoolean?: boolean;
}

/**
 * Creates a badge column with consistent styling
 */
export function createBadgeColumn<T extends RowData>(
	id: Extract<NestedKeyOf<T>, string>,
	label: string,
	options: BadgeColumnOptions = {},
): ColumnDef<T> {
	const {
		width = "w-48",
		enableFilter = false,
		placeholder = `Cari ${label.toLowerCase()}...`,
		variant = "text",
		icon = Text,
		valueIsBoolean = false,
	} = options;

	const meta: ColumnMeta<T, string> = enableFilter
		? {
				label,
				placeholder,
				variant,
				icon,
			}
		: { label };

	return {
		id,
		accessorKey: id,
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title={label} label={label} />
		),
		cell: ({ row }) => {
			let value: unknown;
			if (valueIsBoolean) {
				value = Boolean(row.getValue(id));
			} else {
				value = row.getValue(id);
			}

			return (
				<div className={width}>
					<Badge
						variant="secondary"
						className={cn(
							value ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800",
						)}
					>
						{String(value)}
					</Badge>
				</div>
			);
		},
		meta,
		enableColumnFilter: enableFilter,
	};
}

interface StatusColumnOptions {
	/** Width class (e.g., 'w-48', 'max-w-64') */
	width?: string;
	/** Enable column filtering */
	enableFilter?: boolean;
	/** Custom placeholder for filter */
	placeholder?: string;
	/** Filter variant */
	variant?: FilterVariant;
	/** Icon for the filter */
	icon?: LucideIcon;
	/** Whether the status value is boolean */
	valueIsBoolean?: boolean;
	/** Mapping of status values to display text and badge colors */
	statusMap: Record<
		string,
		{
			text: string;
			color?: "green" | "red" | "blue" | "yellow" | "gray" | "custom";
			/* Optional custom colors for the badge (overrides color) using tailwind classes */
			customColors?: string;
		}
	>;
}

export function createStatusColumn<T extends RowData>(
	id: Extract<NestedKeyOf<T>, string>,
	label: string,
	options: StatusColumnOptions,
): ColumnDef<T> {
	const {
		width = "w-48",
		enableFilter = false,
		placeholder = `Cari ${label.toLowerCase()}...`,
		variant = "text",
		icon = Text,
		valueIsBoolean = false,
		statusMap,
	} = options;

	const meta: ColumnMeta<T, string> = enableFilter
		? {
				label,
				placeholder,
				variant,
				icon,
			}
		: { label };

	return {
		id,
		accessorKey: id,
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title={label} label={label} />
		),
		cell: ({ row }) => {
			let value: unknown;
			if (valueIsBoolean) {
				value = Boolean(row.getValue(id));
			} else {
				value = row.getValue(id);
			}

			const status = statusMap[String(value)] || {
				text: String(value),
				color: "gray",
			};

			return (
				<div className={width}>
					<Badge
						variant="secondary"
						className={cn(
							status.color === "green" && "bg-green-100 text-green-800",
							status.color === "red" && "bg-red-100 text-red-800",
							status.color === "blue" && "bg-blue-100 text-blue-800",
							status.color === "yellow" && "bg-yellow-100 text-yellow-800",
							status.color === "gray" && "bg-gray-100 text-gray-800",
							status.customColors,
						)}
					>
						{status.text}
					</Badge>
				</div>
			);
		},
		meta,
		enableColumnFilter: enableFilter,
	};
}

/**
 * Creates a price column with consistent formatting
 */
export function createPriceColumn<T extends RowData>(
	id: Extract<NestedKeyOf<T>, string>,
	label: string,
	options: TextColumnOptions = {},
): ColumnDef<T> {
	const {
		width = "w-48",
		enableFilter = false,
		placeholder = `Cari ${label.toLowerCase()}...`,
		variant = "text",
		icon = Text,
	} = options;

	const meta: ColumnMeta<T, unknown> = enableFilter
		? {
				label,
				placeholder,
				variant,
				icon,
			}
		: { label };

	return {
		id,
		accessorKey: id,
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title={label} label={label} />
		),
		cell: ({ row }) => {
			const value = row.getValue(id);
			const formattedPrice = new Intl.NumberFormat("id-ID", {
				style: "currency",
				currency: "IDR",
				maximumFractionDigits: 0,
			}).format(Number(value));
			return (
				<div className={`${width} truncate`} title={formattedPrice}>
					{formattedPrice}
				</div>
			);
		},
		meta,
		enableColumnFilter: enableFilter,
	};
}

interface DateColumnOptions {
	/** Whether the date can be null */
	nullable?: boolean;
	/** Date format string */
	format?: string;
}

/**
 * Creates a date column with consistent formatting
 */
export function createDateColumn<T extends RowData>(
	id: Extract<NestedKeyOf<T>, string>,
	label: string,
	options: DateColumnOptions = {},
): ColumnDef<T> {
	const { nullable = false, format: dateFormat = "dd/MM/yyyy" } = options;

	return {
		id,
		accessorKey: id,
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title={label} label={label} />
		),
		cell: ({ row }) => {
			const value = row.getValue(id);
			if (!value && nullable) return <span>-</span>;
			return <span>{format(new Date(value as string), dateFormat)}</span>;
		},
		meta: { label },
	};
}

interface TagsColumnOptions {
	/** Width class */
	width?: string;
	/** Max tags to show before collapsing */
	maxVisible?: number;
}

/**
 * Creates a tags column that renders an array of strings as badges
 */
export function createTagsColumn<T extends RowData>(
	id: Extract<NestedKeyOf<T>, string>,
	label: string,
	options: TagsColumnOptions = {},
): ColumnDef<T> {
	const { width = "w-48", maxVisible = 3 } = options;

	return {
		id,
		accessorKey: id,
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title={label} label={label} />
		),
		cell: ({ row }) => {
			const raw = row.getValue(id);
			const tags: string[] = Array.isArray(raw)
				? raw
				: typeof raw === "string" && raw
					? (JSON.parse(raw) as string[])
					: [];
			if (!tags.length) return <div className={width}>-</div>;
			const visible = tags.slice(0, maxVisible);
			const overflow = tags.length - maxVisible;
			return (
				<div className={cn(width, "flex flex-wrap gap-1")}>
					{visible.map((tag) => (
						<Badge key={tag} variant="secondary">
							{tag}
						</Badge>
					))}
					{overflow > 0 && <Badge variant="outline">+{overflow}</Badge>}
				</div>
			);
		},
		meta: { label },
	};
}

interface CurrencyColumnOptions {
	/** Width class */
	width?: string;
	/** BCP 47 locale (e.g. "en-US", "id-ID") */
	locale?: string;
	/** ISO 4217 currency code (e.g. "USD", "IDR") */
	currency?: string;
	/** Maximum fraction digits */
	maximumFractionDigits?: number;
	/** Enable column filtering */
	enableFilter?: boolean;
	/** Filter variant */
	variant?: FilterVariant;
	/** Icon for the filter */
	icon?: LucideIcon;
}

/**
 * Creates a currency column with configurable locale and currency
 */
export function createCurrencyColumn<T extends RowData>(
	id: Extract<NestedKeyOf<T>, string>,
	label: string,
	options: CurrencyColumnOptions = {},
): ColumnDef<T> {
	const {
		width = "w-48",
		locale = "id-ID",
		currency = "IDR",
		maximumFractionDigits = 0,
		enableFilter = false,
		variant = "range",
		icon = Text,
	} = options;

	const formatter = new Intl.NumberFormat(locale, {
		style: "currency",
		currency,
		maximumFractionDigits,
	});

	const meta: ColumnMeta<T, unknown> = enableFilter
		? { label, variant, icon, placeholder: label }
		: { label };

	return {
		id,
		accessorKey: id,
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title={label} label={label} />
		),
		cell: ({ row }) => {
			const formatted = formatter.format(Number(row.getValue(id)));
			return (
				<div className={`${width} truncate`} title={formatted}>
					{formatted}
				</div>
			);
		},
		meta,
		enableColumnFilter: enableFilter,
	};
}

/**
 * Creates an action column (header only, cell must be provided)
 */
export function createActionColumn<T>(
	cellRenderer: (props: { row: Row<T> }) => React.ReactNode,
): ColumnDef<T> {
	return {
		id: "action",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Aksi" label="Aksi" />
		),
		cell: ({ row }) => cellRenderer({ row }),
	};
}
