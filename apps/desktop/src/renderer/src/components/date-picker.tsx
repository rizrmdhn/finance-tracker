import { Button } from "@finance-tracker/ui/components/button";
import { Calendar } from "@finance-tracker/ui/components/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@finance-tracker/ui/components/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";

interface DatePickerProps {
	value?: number;
	onChange: (value: number) => void;
	placeholder?: string;
}

export function DatePicker({
	value,
	onChange,
	placeholder = "Pick a date",
}: DatePickerProps) {
	const [open, setOpen] = useState(false);
	const selected = value ? new Date(value) : undefined;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button
						variant="outline"
						type="button"
						className="w-full justify-start font-normal"
					/>
				}
			>
				<CalendarIcon className="size-3.5 text-muted-foreground" />
				{selected ? (
					<span>{format(selected, "dd MMM yyyy")}</span>
				) : (
					<span className="text-muted-foreground">{placeholder}</span>
				)}
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<Calendar
					mode="single"
					selected={selected}
					onSelect={(date) => {
						if (date) {
							onChange(date.getTime());
							setOpen(false);
						}
					}}
					captionLayout="dropdown"
					defaultMonth={selected}
				/>
			</PopoverContent>
		</Popover>
	);
}
