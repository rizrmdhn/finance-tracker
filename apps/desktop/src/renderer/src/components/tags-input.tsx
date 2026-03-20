import { cn } from "@finance-tracker/ui/lib/utils";
import { XIcon } from "lucide-react";
import { useRef, useState } from "react";

interface TagsInputProps {
	value?: string[];
	onChange: (value: string[]) => void;
	placeholder?: string;
	className?: string;
}

export function TagsInput({
	value = [],
	onChange,
	placeholder = "Add tag...",
	className,
}: TagsInputProps) {
	const [input, setInput] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	function addTag(tag: string) {
		const trimmed = tag.trim();
		if (trimmed && !value.includes(trimmed)) {
			onChange([...value, trimmed]);
		}
		setInput("");
	}

	function removeTag(tag: string) {
		onChange(value.filter((t) => t !== tag));
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === "Enter" || e.key === ",") {
			e.preventDefault();
			addTag(input);
		} else if (e.key === "Backspace" && input === "" && value.length > 0) {
			onChange(value.slice(0, -1));
		}
	}

	return (
		<div
			className={cn(
				"flex min-h-7 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-input/20 px-2 py-1 transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 dark:bg-input/30",
				className,
			)}
			onClick={() => inputRef.current?.focus()}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") inputRef.current?.focus();
			}}
		>
			{value.map((tag) => (
				<span
					key={tag}
					className="inline-flex items-center gap-1 rounded bg-accent px-1.5 py-0.5 text-xs font-medium"
				>
					{tag}
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							removeTag(tag);
						}}
						className="text-muted-foreground hover:text-foreground"
					>
						<XIcon className="size-3" />
					</button>
				</span>
			))}
			<input
				ref={inputRef}
				value={input}
				onChange={(e) => setInput(e.target.value)}
				onKeyDown={handleKeyDown}
				onBlur={() => {
					if (input.trim()) addTag(input);
				}}
				placeholder={value.length === 0 ? placeholder : ""}
				className="min-w-16 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
			/>
		</div>
	);
}
