import { Button } from "@finance-tracker/ui/components/button";
import { Calendar } from "@finance-tracker/ui/components/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@finance-tracker/ui/components/popover";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";

interface DateRangePickerProps {
	from: number;
	to: number;
	onChange: (from: number, to: number) => void;
}

export function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
	const [date, setDate] = useState<DateRange | undefined>({
		from: new Date(from),
		to: new Date(to),
	});

	function handleSelect(selected: DateRange | undefined) {
		setDate(selected);
		if (selected?.from && selected?.to) {
			const toEnd = new Date(selected.to);
			toEnd.setHours(23, 59, 59, 999);
			onChange(selected.from.getTime(), toEnd.getTime());
		}
	}

	function handleReset() {
		const now = new Date();
		const range = { from: startOfMonth(now), to: endOfMonth(now) };
		setDate(range);
		onChange(range.from.getTime(), range.to.getTime());
	}

	return (
		<Popover>
			<PopoverTrigger
				render={
					<Button
						variant="outline"
						className="justify-start px-2.5 font-normal"
					>
						<CalendarIcon data-icon="inline-start" />
						{date?.from ? (
							date.to ? (
								<>
									{format(date.from, "d MMM yyyy")} –{" "}
									{format(date.to, "d MMM yyyy")}
								</>
							) : (
								format(date.from, "d MMM yyyy")
							)
						) : (
							<span>Pilih tanggal</span>
						)}
					</Button>
				}
			/>
			<PopoverContent className="w-auto p-0" align="end">
				<Calendar
					mode="range"
					defaultMonth={date?.from}
					selected={date}
					onSelect={handleSelect}
					numberOfMonths={2}
				/>
				<div className="border-t p-3">
					<Button variant="outline" size="sm" className="w-full" onClick={handleReset}>
						Bulan Ini
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
}
