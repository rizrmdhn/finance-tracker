import { Button } from "@finance-tracker/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { trpc } from "../../lib/trpc";

export const Route = createFileRoute("/categories")({
	component: CategoriesComponent,
});

function CategoriesComponent() {
	const { data: categories = [] } = useQuery(trpc.category.list.queryOptions());

	return (
		<div className="flex flex-col gap-6 p-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-xl">Kategori</h1>
					<p className="text-muted-foreground text-sm">
						{categories.length} kategori
					</p>
				</div>
				<Button>Tambah Kategori</Button>
			</div>

			<div className="flex flex-col gap-2">
				{categories.map((category) => (
					<div
						key={category.id}
						className="flex items-center gap-3 rounded-lg border px-4 py-3"
					>
						<div
							className="size-3 rounded-full"
							style={{ backgroundColor: category.color ?? "#94a3b8" }}
						/>
						<span className="flex-1 font-medium text-sm">{category.name}</span>
						<span className="text-muted-foreground text-xs capitalize">
							{category.type}
						</span>
					</div>
				))}
				{categories.length === 0 && (
					<p className="py-6 text-center text-muted-foreground text-sm">
						Belum ada kategori
					</p>
				)}
			</div>
		</div>
	);
}
