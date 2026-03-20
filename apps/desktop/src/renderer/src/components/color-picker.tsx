import { CATEGORY_COLORS } from "@finance-tracker/constants";
import { Button } from "@finance-tracker/ui/components/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@finance-tracker/ui/components/popover";
import { cn } from "@finance-tracker/ui/lib/utils";
import { PaletteIcon } from "lucide-react";
import { useState } from "react";

interface ColorPickerProps {
	value?: string;
	onChange: (value: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
	const [open, setOpen] = useState(false);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button
						variant="outline"
						size="icon-sm"
						type="button"
						aria-label="Pick color"
					/>
				}
			>
				{value ? (
					<span
						className="size-4 rounded-full border border-black/10"
						style={{ backgroundColor: value }}
					/>
				) : (
					<PaletteIcon className="size-4 text-muted-foreground" />
				)}
			</PopoverTrigger>
			<PopoverContent className="w-auto gap-2 p-2" align="start">
				<div className="grid grid-cols-5 gap-1">
					{CATEGORY_COLORS.map(({ label, value: color }) => (
						<button
							key={color}
							type="button"
							title={label}
							onClick={() => {
								onChange(color);
								setOpen(false);
							}}
							className={cn(
								"size-7 rounded-md border-2 border-transparent transition-all hover:scale-110",
								value === color && "scale-110 border-foreground/50",
							)}
							style={{ backgroundColor: color }}
						/>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
}
