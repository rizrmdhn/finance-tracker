import { Wallet } from "lucide-react";
import Loader from "@/components/loader";

export function SplashScreen() {
	return (
		<div className="fade-in flex h-screen w-screen animate-in flex-col items-center justify-center gap-6 bg-background duration-300">
			<div className="flex flex-col items-center gap-4">
				<div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
					<Wallet className="h-8 w-8 text-primary-foreground" />
				</div>
				<div className="flex flex-col items-center gap-1">
					<h1 className="font-semibold text-foreground text-xl tracking-tight">
						Finance Tracker
					</h1>
					<p className="text-muted-foreground text-sm">Loading your data…</p>
				</div>
			</div>
			<Loader size="sm" className="static bg-transparent" />
		</div>
	);
}
