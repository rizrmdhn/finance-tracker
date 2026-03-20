import { CATEGORY_ICONS } from "@finance-tracker/constants";
import { Button } from "@finance-tracker/ui/components/button";
import { Input } from "@finance-tracker/ui/components/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@finance-tracker/ui/components/popover";
import { cn } from "@finance-tracker/ui/lib/utils";
import {
	Activity,
	Apple,
	BadgeDollarSign,
	Banknote,
	Beer,
	Bike,
	Book,
	Briefcase,
	Building2,
	Bus,
	Cake,
	Car,
	Coffee,
	Coins,
	CreditCard,
	DollarSign,
	Droplets,
	Dumbbell,
	Film,
	Fuel,
	Gamepad2,
	Gift,
	Headphones,
	Heart,
	Home,
	ImageIcon,
	Landmark,
	Laptop,
	Lightbulb,
	type LucideIcon,
	Monitor,
	Music,
	Package,
	PiggyBank,
	Pill,
	Pizza,
	Plane,
	Receipt,
	Scissors,
	Shirt,
	ShoppingBag,
	ShoppingBasket,
	ShoppingCart,
	Smile,
	Star,
	Stethoscope,
	Store,
	Tag,
	Train,
	TrendingDown,
	TrendingUp,
	Truck,
	Tv,
	Utensils,
	Wallet,
	Wifi,
	Wine,
	Wrench,
	Zap,
} from "lucide-react";
import { useState } from "react";

export const ICON_MAP: Record<string, LucideIcon> = {
	Activity,
	Apple,
	BadgeDollarSign,
	Banknote,
	Beer,
	Bike,
	Book,
	Briefcase,
	Building2,
	Bus,
	Cake,
	Car,
	Coffee,
	Coins,
	CreditCard,
	DollarSign,
	Droplets,
	Dumbbell,
	Film,
	Fuel,
	Gamepad2,
	Gift,
	Headphones,
	Heart,
	Home,
	Landmark,
	Laptop,
	Lightbulb,
	Monitor,
	Music,
	Package,
	PiggyBank,
	Pill,
	Pizza,
	Plane,
	Receipt,
	Scissors,
	Shirt,
	ShoppingBag,
	ShoppingBasket,
	ShoppingCart,
	Smile,
	Star,
	Stethoscope,
	Store,
	Tag,
	Train,
	TrendingDown,
	TrendingUp,
	Truck,
	Tv,
	Utensils,
	Wallet,
	Wifi,
	Wine,
	Wrench,
	Zap,
};

interface IconPickerProps {
	value?: string;
	onChange: (value: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
	const [search, setSearch] = useState("");
	const [open, setOpen] = useState(false);

	const SelectedIcon = value ? ICON_MAP[value] : null;

	const filtered = search
		? CATEGORY_ICONS.filter(
				(i) =>
					i.label.toLowerCase().includes(search.toLowerCase()) ||
					i.name.toLowerCase().includes(search.toLowerCase()),
			)
		: CATEGORY_ICONS;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button
						variant="outline"
						size="icon-sm"
						type="button"
						aria-label="Pick icon"
					/>
				}
			>
				{SelectedIcon ? (
					<SelectedIcon className="size-4" />
				) : (
					<ImageIcon className="size-4 text-muted-foreground" />
				)}
			</PopoverTrigger>
			<PopoverContent className="w-68 gap-2 p-2" align="start">
				<Input
					placeholder="Search icons..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
				/>
				<div className="no-scrollbar grid max-h-48 grid-cols-8 gap-0.5 overflow-y-auto">
					{filtered.map(({ name, label }) => {
						const Icon = ICON_MAP[name];
						if (!Icon) return null;
						return (
							<button
								key={name}
								type="button"
								title={label}
								onClick={() => {
									onChange(name);
									setOpen(false);
								}}
								className={cn(
									"flex size-8 items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-accent-foreground",
									value === name && "bg-accent text-accent-foreground",
								)}
							>
								<Icon className="size-4" />
							</button>
						);
					})}
					{filtered.length === 0 && (
						<p className="col-span-8 py-4 text-center text-muted-foreground text-xs">
							No icons found
						</p>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
