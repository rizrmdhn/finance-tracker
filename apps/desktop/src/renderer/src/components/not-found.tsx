import { Button } from "@finance-tracker/ui/components/button";
import { useRouter } from "@tanstack/react-router";
import { FileQuestion } from "lucide-react";

export function NotFoundComponent() {
	const router = useRouter();

	return (
		<div className="flex min-h-screen flex-col items-center justify-center px-4">
			<div className="flex flex-col items-center space-y-6 text-center">
				<div className="rounded-full bg-muted p-6">
					<FileQuestion className="h-16 w-16 text-muted-foreground" />
				</div>
				<div className="space-y-2">
					<h1 className="font-bold text-4xl tracking-tight">404</h1>
					<h2 className="font-semibold text-2xl">Halaman Tidak Ditemukan</h2>
					<p className="max-w-md text-muted-foreground">
						Halaman yang Anda cari tidak ada atau telah dipindahkan. Periksa
						kembali URL atau kembali ke halaman utama.
					</p>
				</div>
				<div className="flex gap-4">
					<Button variant="outline" onClick={() => router.history.back()}>
						Kembali
					</Button>
					<Button onClick={() => router.navigate({ to: "/" })}>
						Ke Beranda
					</Button>
				</div>
			</div>
		</div>
	);
}
