import { createId } from "@paralleldrive/cuid2";
import {
	addMonths,
	eachDayOfInterval,
	endOfMonth,
	format,
	getDay,
	isAfter,
	isBefore,
	isSameDay,
	isToday,
	startOfMonth,
	subMonths,
} from "date-fns";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface DateRangePickerProps {
	from: number;
	to: number;
	onChange: (from: number, to: number) => void;
}

export function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
	const { t } = useTranslation();
	const insets = useSafeAreaInsets();

	const fromDate = new Date(from);
	const toDate = new Date(to);

	const [modalVisible, setModalVisible] = useState(false);
	const [viewMonth, setViewMonth] = useState(fromDate);
	// pending: user has picked `from` but not yet `to`
	const [pending, setPending] = useState<Date | null>(null);

	const monthStart = startOfMonth(viewMonth);
	const monthEnd = endOfMonth(viewMonth);
	const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
	const leadingBlanks = getDay(monthStart);

	function openModal() {
		setViewMonth(fromDate);
		setPending(null);
		setModalVisible(true);
	}

	function handleDayPress(day: Date) {
		if (!pending) {
			// First tap — set pending from
			setPending(day);
		} else {
			// Second tap
			let start = pending;
			let end = day;
			if (isAfter(start, end)) {
				[start, end] = [end, start];
			}
			const endOfDay = new Date(end);
			endOfDay.setHours(23, 59, 59, 999);
			onChange(start.getTime(), endOfDay.getTime());
			setPending(null);
			setModalVisible(false);
		}
	}

	function handleReset() {
		const now = new Date();
		const start = startOfMonth(now);
		const end = endOfMonth(now);
		end.setHours(23, 59, 59, 999);
		onChange(start.getTime(), end.getTime());
		setPending(null);
		setModalVisible(false);
	}

	function getDayStyle(day: Date) {
		const rangeFrom = pending ?? fromDate;
		const rangeTo = pending ? null : toDate;

		const isFrom = isSameDay(day, rangeFrom);
		const isTo = rangeTo ? isSameDay(day, rangeTo) : false;
		const inRange =
			rangeTo && isAfter(day, rangeFrom) && isBefore(day, rangeTo);

		return { isFrom, isTo, inRange: !!inRange, todayDay: isToday(day) };
	}

	return (
		<>
			<Pressable
				onPress={openModal}
				className="flex h-10 flex-row items-center gap-2 rounded-md border border-input bg-background px-3 py-2 shadow-black/5 shadow-sm dark:bg-input/30"
			>
				<Icon as={CalendarIcon} className="size-4 text-muted-foreground" />
				<Text className="text-foreground text-sm">
					{format(fromDate, "d MMM yyyy")}
					{" – "}
					{format(toDate, "d MMM yyyy")}
				</Text>
			</Pressable>

			<Modal
				visible={modalVisible}
				animationType="slide"
				presentationStyle="pageSheet"
				onRequestClose={() => {
					setPending(null);
					setModalVisible(false);
				}}
			>
				<View
					className={cn("flex-1 bg-background")}
					style={{ paddingTop: insets.top }}
				>
					{/* Header */}
					<View className="flex-row items-center justify-between border-border border-b px-4 py-3">
						<Text className="font-semibold text-base text-foreground">
							{pending
								? (t("common.selectEndDate") ?? "Select end date")
								: (t("common.selectStartDate") ?? "Select start date")}
						</Text>
						<Pressable
							onPress={() => {
								setPending(null);
								setModalVisible(false);
							}}
							hitSlop={8}
						>
							<Text className="font-medium text-primary text-sm">
								{t("common.cancel") ?? "Cancel"}
							</Text>
						</Pressable>
					</View>

					{/* Pending hint */}
					{pending && (
						<View className="flex-row items-center justify-between bg-muted/50 px-4 py-2">
							<Text className="text-muted-foreground text-xs">
								{t("common.from") ?? "From"}:{" "}
								<Text className="font-medium text-foreground text-xs">
									{format(pending, "d MMM yyyy")}
								</Text>
							</Text>
							<Pressable onPress={() => setPending(null)} hitSlop={8}>
								<Text className="text-primary text-xs">
									{t("common.reset") ?? "Reset"}
								</Text>
							</Pressable>
						</View>
					)}

					<ScrollView
						contentContainerClassName="px-4 py-4"
						keyboardShouldPersistTaps="handled"
					>
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
							{Array.from({ length: leadingBlanks }).map((_, _i) => (
								<View
									key={`blank-${createId()}`}
									className="aspect-square"
									style={{ width: `${100 / 7}%` }}
								/>
							))}

							{days.map((day) => {
								const { isFrom, isTo, inRange, todayDay } = getDayStyle(day);
								const isEndpoint = isFrom || isTo;
								return (
									<View
										key={day.toISOString()}
										style={{ width: `${100 / 7}%` }}
										className={cn(
											"aspect-square",
											inRange && "bg-primary/15",
											isFrom && "rounded-l-full bg-primary/15",
											isTo && "rounded-r-full bg-primary/15",
										)}
									>
										<Pressable
											onPress={() => handleDayPress(day)}
											className={cn(
												"flex-1 items-center justify-center rounded-full",
												isEndpoint && "bg-primary",
												!isEndpoint && todayDay && "border border-primary",
											)}
										>
											<Text
												className={cn(
													"text-foreground text-sm",
													isEndpoint && "font-semibold text-primary-foreground",
													!isEndpoint && todayDay && "font-medium text-primary",
													inRange && !isEndpoint && "text-foreground",
												)}
											>
												{format(day, "d")}
											</Text>
										</Pressable>
									</View>
								);
							})}
						</View>

						{/* Reset button */}
						<Pressable
							onPress={handleReset}
							className="mt-6 h-10 items-center justify-center rounded-md border border-input"
						>
							<Text className="font-medium text-foreground text-sm">
								{t("common.thisMonth") ?? "This Month"}
							</Text>
						</Pressable>
					</ScrollView>
				</View>
			</Modal>
		</>
	);
}
