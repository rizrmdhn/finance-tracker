import { X } from "lucide-react-native";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, TextInput, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

interface TagsInputProps {
	value?: string[];
	onChange: (value: string[]) => void;
	placeholder?: string;
	className?: string;
}

export function TagsInput({
	value = [],
	onChange,
	placeholder,
	className,
}: TagsInputProps) {
	const { t } = useTranslation();
	const resolvedPlaceholder = placeholder ?? t("common.addTag");

	const [input, setInput] = useState("");
	const inputRef = useRef<TextInput>(null);

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

	function handleSubmitEditing() {
		addTag(input);
	}

	function handleChangeText(text: string) {
		// Add tag when a comma is typed
		if (text.endsWith(",")) {
			addTag(text.slice(0, -1));
		} else {
			setInput(text);
		}
	}

	return (
		<Pressable
			onPress={() => inputRef.current?.focus()}
			className={cn(
				"min-h-10 w-full flex-row flex-wrap items-center gap-1 rounded-md border border-input bg-input/20 px-2 py-1.5 dark:bg-input/30",
				className,
			)}
		>
			{value.map((tag) => (
				<View
					key={tag}
					className="flex-row items-center gap-1 rounded bg-muted px-1.5 py-0.5"
				>
					<Text className="font-medium text-foreground text-xs">{tag}</Text>
					<Pressable onPress={() => removeTag(tag)} hitSlop={4}>
						<Icon as={X} className="size-3 text-muted-foreground" />
					</Pressable>
				</View>
			))}
			<TextInput
				ref={inputRef}
				value={input}
				onChangeText={handleChangeText}
				onSubmitEditing={handleSubmitEditing}
				onBlur={() => {
					if (input.trim()) addTag(input);
				}}
				placeholder={value.length === 0 ? resolvedPlaceholder : ""}
				placeholderTextColor="#94a3b8"
				returnKeyType="done"
				blurOnSubmit={false}
				className="min-w-16 flex-1 text-foreground text-xs"
			/>
		</Pressable>
	);
}
