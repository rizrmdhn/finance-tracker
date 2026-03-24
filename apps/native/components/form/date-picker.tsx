import { createId } from "@paralleldrive/cuid2";
import {
	addMonths,
	eachDayOfInterval,
	endOfMonth,
	format,
	getDay,
	isSameDay,
	isToday,
	startOfMonth,
	subMonths,
} from "date-fns";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface DatePickerProps {
	value?: number;
	onChange: (value: number) => void;
	placeholder?: string;
}

export function DatePicker({ value, onChange, placeholder }: DatePickerProps) {
	const { t } = useTranslation();
	const resolvedPlaceholder = placeholder ?? t("common.selectDate");

	const selected = value ? new Date(value) : undefined;
	const [modalVisible, setModalVisible] = useState(false);
	const [viewMonth, setViewMonth] = useState(selected ?? new Date());

	const monthStart = startOfMonth(viewMonth);
	const monthEnd = endOfMonth(viewMonth);
	const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

	// Leading empty cells so the first day lands on the correct weekday column
	const leadingBlanks = getDay(monthStart);

	function handleSelect(date: Date) {
		onChange(date.getTime());
		setModalVisible(false);
	}

	function openModal() {
		setViewMonth(selected ?? new Date());
		setModalVisible(true);
	}

	return (
		<>
			<Pressable
				onPress={openModal}
				className="flex h-10 flex-row items-center gap-2 rounded-md border border-input bg-background px-3 py-2 shadow-black/5 shadow-sm dark:bg-input/30"
			>
				<Icon as={CalendarIcon} className="size-4 text-muted-foreground" />
				{selected ? (
					<Text className="text-foreground text-sm">
						{format(selected, "dd MMM yyyy")}
					</Text>
				) : (
					<Text className="text-muted-foreground text-sm">
						{resolvedPlaceholder}
					</Text>
				)}
			</Pressable>

			<Modal
				visible={modalVisible}
				animationType="slide"
				presentationStyle="pageSheet"
				onRequestClose={() => setModalVisible(false)}
			>
				<SafeAreaView className="flex-1 bg-background">
					{/* Header */}
					<View className="flex-row items-center justify-between border-border border-b px-4 py-3">
						<Text className="font-semibold text-base text-foreground">
							{t("common.selectDate")}
						</Text>
						<Pressable onPress={() => setModalVisible(false)} hitSlop={8}>
							<Text className="font-medium text-primary text-sm">
								{t("common.cancel") ?? "Cancel"}
							</Text>
						</Pressable>
					</View>

					<ScrollView contentContainerClassName="px-4 py-4">
						{/* Month navigation */}
						<View className="mb-4 flex-row items-center justify-between">
							<Pressable
								onPress={() => setViewMonth((m) => subMonths(m, 1))}
								hitSlop={8}
								className="rounded-md p-1"
							>
								<Icon as={ChevronLeft} className="size-5 text-foreground" />
							</Pressable>

							<Text className="font-semibold text-base text-foreground">
								{format(viewMonth, "MMMM yyyy")}
							</Text>

							<Pressable
								onPress={() => setViewMonth((m) => addMonths(m, 1))}
								hitSlop={8}
								className="rounded-md p-1"
							>
								<Icon as={ChevronRight} className="size-5 text-foreground" />
							</Pressable>
						</View>

						{/* Weekday headers */}
						<View className="mb-1 flex-row">
							{WEEKDAYS.map((day) => (
								<View key={day} className="flex-1 items-center py-1">
									<Text className="font-medium text-muted-foreground text-xs">
										{day}
									</Text>
								</View>
							))}
						</View>

						{/* Day grid */}
						<View className="flex-row flex-wrap">
							{/* Leading blank cells */}
							{Array.from({ length: leadingBlanks }).map(() => (
								<View
									key={`blank-${createId()}`}
									className="aspect-square"
									style={{ width: `${100 / 7}%` }}
								/>
							))}

							{days.map((day) => {
								const isSelected = selected ? isSameDay(day, selected) : false;
								const todayDay = isToday(day);
								return (
									<Pressable
										key={day.toISOString()}
										onPress={() => handleSelect(day)}
										className={cn(
											"aspect-square items-center justify-center rounded-full",
											isSelected && "bg-primary",
											!isSelected && todayDay && "border border-primary",
										)}
										style={{ width: `${100 / 7}%` }}
									>
										<Text
											className={cn(
												"text-foreground text-sm",
												isSelected && "font-semibold text-primary-foreground",
												!isSelected && todayDay && "font-medium text-primary",
											)}
										>
											{format(day, "d")}
										</Text>
									</Pressable>
								);
							})}
						</View>
					</ScrollView>
				</SafeAreaView>
			</Modal>
		</>
	);
}
