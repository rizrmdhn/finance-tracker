import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from "@finance-tracker/ui/components/combobox";
import {
	InputGroupAddon,
	InputGroupText,
} from "@finance-tracker/ui/components/input-group";
import { useEffect, useState } from "react";
import { ICON_MAP } from "@/components/icon-picker";

type Category = {
	id: string;
	name: string;
	icon: string | null;
	color: string | null;
	type: string;
};

interface CategoryComboboxProps {
	value?: string;
	onChange: (value: string | undefined) => void;
	categories: Category[];
	placeholder?: string;
}

export function CategoryCombobox({
	value,
	onChange,
	categories,
	placeholder = "Search category...",
}: CategoryComboboxProps) {
	const [inputValue, setInputValue] = useState(
		() => categories.find((c) => c.id === value)?.name ?? "",
	);

	useEffect(() => {
		setInputValue(categories.find((c) => c.id === value)?.name ?? "");
	}, [value, categories]);

	const filtered = inputValue.trim()
		? categories.filter((c) =>
				c.name.toLowerCase().includes(inputValue.toLowerCase()),
			)
		: categories;

	return (
		<Combobox
			items={categories}
			value={value ?? null}
			onValueChange={(val) => {
				onChange(val ?? undefined);
				setInputValue(categories.find((c) => c.id === val)?.name ?? "");
			}}
			filter={() => true}
		>
			<ComboboxInput
				showClear={!!value}
				placeholder={placeholder}
				value={inputValue}
				onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
					setInputValue(e.target.value)
				}
			>
				{value &&
					(() => {
						const cat = categories.find((c) => c.id === value);
						const Icon = cat?.icon ? ICON_MAP[cat.icon] : null;
						return (
							<InputGroupAddon align="inline-start">
								<InputGroupText>
									{Icon ? (
										<Icon
											className="size-3.5"
											style={{ color: cat?.color ?? "#94a3b8" }}
										/>
									) : (
										<span
											className="size-2.5 rounded-full"
											style={{ backgroundColor: cat?.color ?? "#94a3b8" }}
										/>
									)}
								</InputGroupText>
							</InputGroupAddon>
						);
					})()}
			</ComboboxInput>
			<ComboboxContent>
				<ComboboxEmpty>No categories found</ComboboxEmpty>
				<ComboboxList>
					{filtered.map((category) => {
						const Icon = category.icon ? ICON_MAP[category.icon] : null;
						return (
							<ComboboxItem key={category.id} value={category.id}>
								{Icon ? (
									<Icon
										className="size-3.5 shrink-0"
										style={{ color: category.color ?? "#94a3b8" }}
									/>
								) : (
									<span
										className="size-2.5 shrink-0 rounded-full"
										style={{
											backgroundColor: category.color ?? "#94a3b8",
										}}
									/>
								)}
								<span>{category.name}</span>
								<span className="ml-auto text-muted-foreground capitalize">
									{category.type}
								</span>
							</ComboboxItem>
						);
					})}
				</ComboboxList>
			</ComboboxContent>
		</Combobox>
	);
}
