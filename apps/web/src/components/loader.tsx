import { cn } from "@finance-tracker/ui/lib/utils";

interface LoaderProps {
	size?: "sm" | "md" | "lg";
	className?: string;
}

export default function Loader({ size = "md", className }: LoaderProps) {
	const sizeClasses = {
		sm: "h-6 w-6",
		md: "h-10 w-10",
		lg: "h-16 w-16",
	};

	return (
		<div
			className={cn(
				"fixed inset-0 flex items-center justify-center bg-background/50",
				className,
			)}
		>
			<div className="relative">
				{/* Outer ring */}
				<div
					className={cn(
						"rounded-full border-4 border-muted",
						sizeClasses[size],
					)}
				/>
				{/* Spinning gradient arc */}
				<div
					className={cn(
						"absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary",
						sizeClasses[size],
					)}
				/>
				{/* Inner pulse */}
				<div
					className={cn(
						"absolute inset-2 animate-pulse rounded-full bg-primary/20",
					)}
				/>
			</div>
		</div>
	);
}
