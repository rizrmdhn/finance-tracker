import type { Account } from "@finance-tracker/types";
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

interface AccountComboboxProps {
	value?: string;
	onChange: (value: string | undefined) => void;
	accounts: Account[];
	placeholder?: string;
}

export function AccountCombobox({
	value,
	onChange,
	accounts,
	placeholder = "Search Account...",
}: AccountComboboxProps) {
	const [inputValue, setInputValue] = useState(
		() => accounts.find((c) => c.id === value)?.name ?? "",
	);

	useEffect(() => {
		setInputValue(accounts.find((c) => c.id === value)?.name ?? "");
	}, [value, accounts]);

	const filtered = inputValue.trim()
		? accounts.filter((c) =>
				c.name.toLowerCase().includes(inputValue.toLowerCase()),
			)
		: accounts;

	return (
		<Combobox
			items={accounts}
			value={value ?? null}
			onValueChange={(val) => {
				onChange(val ?? undefined);
				setInputValue(accounts.find((c) => c.id === val)?.name ?? "");
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
						const cat = accounts.find((c) => c.id === value);
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
				<ComboboxEmpty>No accounts found</ComboboxEmpty>
				<ComboboxList>
					{filtered.map((Account) => {
						const Icon = Account.icon ? ICON_MAP[Account.icon] : null;
						return (
							<ComboboxItem key={Account.id} value={Account.id}>
								{Icon ? (
									<Icon
										className="size-3.5 shrink-0"
										style={{ color: Account.color ?? "#94a3b8" }}
									/>
								) : (
									<span
										className="size-2.5 shrink-0 rounded-full"
										style={{
											backgroundColor: Account.color ?? "#94a3b8",
										}}
									/>
								)}
								<span>{Account.name}</span>
								<span className="ml-auto text-muted-foreground capitalize">
									{Account.type}
								</span>
							</ComboboxItem>
						);
					})}
				</ComboboxList>
			</ComboboxContent>
		</Combobox>
	);
}
