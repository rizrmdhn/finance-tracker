import type { Category } from "@finance-tracker/types";
import { Button } from "@finance-tracker/ui/components/button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { ICON_MAP } from "@/components/icon-picker";
import useModalState from "@/hooks/use-modal-state";
import { pageHead } from "@/lib/page-head";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";
import CreateCategoryDialog from "./-components/create-category-dialog";
import EditCategoryDialog from "./-components/edit-category-dialog";

export const Route = createFileRoute("/categories")({
	component: CategoriesComponent,
	head: () =>
		pageHead(
			"Kategori",
			"Kelola kategori keuangan Anda untuk mengorganisir transaksi dengan lebih baik. Tambah, edit, atau hapus kategori sesuai kebutuhan untuk menjaga catatan keuangan Anda tetap rapi dan terstruktur.",
		),
});

function CategoriesComponent() {
	const { state, openModal, closeModal } = useModalState({
		createCategory: false,
		editCategory: false,
		deleteCategory: false,
	});

	const [selected, setSelected] = useState<Category | null>(null);

	const { data: categories = [] } = useQuery(trpc.category.list.queryOptions());

	const deleteMutation = useMutation(
		trpc.category.delete.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries(trpc.category.list.queryOptions());
				globalSuccessToast("Category deleted");
				closeModal("deleteCategory");
				setSelected(null);
			},
			onError: (error) => {
				globalErrorToast(`Failed to delete category: ${error.message}`);
			},
		}),
	);

	function handleEdit(category: Category) {
		setSelected(category);
		openModal("editCategory");
	}

	function handleDelete(category: Category) {
		setSelected(category);
		openModal("deleteCategory");
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-xl">Kategori</h1>
					<p className="text-muted-foreground text-sm">
						{categories.length} kategori
					</p>
				</div>
				<Button onClick={() => openModal("createCategory")}>
					Tambah Kategori
				</Button>
			</div>

			<div className="flex flex-col gap-2">
				{categories.map((category) => {
					const Icon = category.icon ? ICON_MAP[category.icon] : null;
					return (
						<div
							key={category.id}
							className="flex items-center gap-3 rounded-lg border px-4 py-3"
						>
							{Icon ? (
								<Icon
									className="size-4 shrink-0"
									style={{ color: category.color ?? "#94a3b8" }}
								/>
							) : (
								<div
									className="size-3 shrink-0 rounded-full"
									style={{ backgroundColor: category.color ?? "#94a3b8" }}
								/>
							)}
							<span className="flex-1 font-medium text-sm">
								{category.name}
							</span>
							<span className="text-muted-foreground text-xs capitalize">
								{category.type}
							</span>
							<div className="flex items-center gap-1">
								<Button
									variant="ghost"
									size="icon-sm"
									onClick={() => handleEdit(category)}
								>
									<PencilIcon className="size-3.5" />
								</Button>
								<Button
									variant="ghost"
									size="icon-sm"
									className="text-destructive hover:text-destructive"
									onClick={() => handleDelete(category)}
								>
									<Trash2Icon className="size-3.5" />
								</Button>
							</div>
						</div>
					);
				})}
				{categories.length === 0 && (
					<p className="py-6 text-center text-muted-foreground text-sm">
						Belum ada kategori
					</p>
				)}
			</div>

			<CreateCategoryDialog
				open={state.createCategory}
				setIsOpen={(open) =>
					open ? openModal("createCategory") : closeModal("createCategory")
				}
			/>

			<EditCategoryDialog
				open={state.editCategory}
				setIsOpen={(open) =>
					open ? openModal("editCategory") : closeModal("editCategory")
				}
				category={selected}
			/>

			<ConfirmationDialog
				open={state.deleteCategory}
				onOpenChange={(open) =>
					open ? openModal("deleteCategory") : closeModal("deleteCategory")
				}
				title="Delete Category"
				description={`Are you sure you want to delete "${selected?.name}"? This cannot be undone.`}
				confirmText="Delete"
				variant="destructive"
				isLoading={deleteMutation.isPending}
				onConfirm={() => {
					if (selected) deleteMutation.mutate({ id: selected.id });
				}}
			/>
		</div>
	);
}
