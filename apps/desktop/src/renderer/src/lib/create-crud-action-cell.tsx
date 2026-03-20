import type { QueryKey, UseMutationOptions } from "@tanstack/react-query";
import type { Row } from "@tanstack/react-table";
import { Trash } from "lucide-react";
import DataTableActionCell, {
	type CustomAction,
} from "@/components/data-table-action-cell";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { useOptimisticMutation } from "./optimistic-update";

/** Structural type for a tRPC mutation proxy that exposes `.mutationOptions()` */
interface TRPCMutationLike<TInput> {
	mutationOptions: (
		opts?: Record<string, unknown>,
	) => Pick<
		UseMutationOptions<unknown, Error, TInput>,
		"mutationFn" | "mutationKey"
	>;
}

/** No-op mutation used when delete/restore actions are disabled */
const noOpMutation: TRPCMutationLike<{ id: string }> = {
	mutationOptions: () => ({
		mutationKey: ["__noop__"],
		mutationFn: async () => {},
	}),
};

interface CrudActionCellConfig<T, TParams> {
	/** Resource name (singular) for display messages */
	resourceName: string;
	/** Nested path route for routing (e.g., '(core)/back-office')
	 * use only if the resource is nested in another resource
	 * eg: "/back-office/tools/$toolId/detail/calibration"
	 */
	nestedPathRoute?: string;
	deleteMutation?: TRPCMutationLike<{ id: string }>;
	/** Query options to invalidate */
	getQueryOptions: (params: TParams) => { queryKey: QueryKey };
	/** Get current search params */
	useSearchParams: () => TParams;
	/** Show detail action button */
	showDetail?: boolean;
	/** Action on hover for edit button */
	onHoverEdit?: (id: string) => void;
	/** Action on hover for detail button */
	onHoverDetail?: (id: string) => void;
	/** Extra dropdown items derived from the row. Use for actions like opening a file URL. */
	customActions?: (row: T) => CustomAction[];
}

/**
 * Creates a reusable CRUD action cell component for data tables
 */
export function createCrudActionCell<T extends { id: string }, TParams>(
	config: CrudActionCellConfig<T, TParams>,
) {
	const {
		resourceName,
		nestedPathRoute,
		deleteMutation,
		getQueryOptions,
		useSearchParams,
		showDetail = false,
		onHoverEdit,
		onHoverDetail,
		customActions: getCustomActions,
	} = config;

	// Resolved outside the component so the hook call count is stable across renders
	const resolvedDeleteMutation = deleteMutation ?? noOpMutation;
	const hasCrudActions = !!deleteMutation;

	return function ActionCell({ row }: { row: Row<T> }) {
		const params = useSearchParams();

		const queryOptions = getQueryOptions(params);

		const deleteMut = useOptimisticMutation(
			resolvedDeleteMutation.mutationOptions(),
			{
				queryOptions,
				operation: {
					type: "delete",
					getId: (input) => input.id,
				},
				onSuccess: () => {
					globalSuccessToast(`Berhasil menghapus ${resourceName}`);
				},
				onError: (error) => {
					globalErrorToast(
						`Gagal menghapus ${resourceName}. ${error.message ?? "Silahkan coba lagi."}`,
					);
				},
			},
		);

		return (
			<DataTableActionCell
				icon={<Trash className="mr-4 size-4" />}
				isLoading={deleteMut.isPending}
				editText="Edit"
				triggerText={"Hapus"}
				dialogTitle={`Hapus data ${resourceName}`}
				dialogDescription={`Apakah anda yakin ingin menghapus data ${resourceName} ini? Data yang sudah dihapus tidak dapat dikembalikan.`}
				btnClassName="bg-red-600 text-white hover:bg-red-500"
				onEditAction={`${nestedPathRoute ?? ""}${row.original.id}/edit`}
				onHoverEdit={() => onHoverEdit?.(row.original.id)}
				showEdit={true}
				showDelete={hasCrudActions}
				showDetail={showDetail}
				onDetailAction={
					showDetail
						? `${nestedPathRoute ?? ""}${row.original.id}/detail`
						: undefined
				}
				onHoverDetail={() => onHoverDetail?.(row.original.id)}
				customActions={getCustomActions ? getCustomActions(row.original) : []}
				onConfirm={() => deleteMut.mutate({ id: row.original.id })}
			/>
		);
	};
}
