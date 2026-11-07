import { createId } from "@paralleldrive/cuid2";
import type { ParseKeys } from "i18next";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

function Field({ className, ...props }: React.ComponentProps<typeof View>) {
	return <View className={cn("gap-1.5", className)} {...props} />;
}

function FieldLabel({
	className,
	invalid,
	...props
}: React.ComponentProps<typeof Label> & { invalid?: boolean }) {
	return (
		<Label
			className={cn(invalid && "text-destructive", className)}
			{...props}
		/>
	);
}

function FieldDescription({
	className,
	...props
}: React.ComponentProps<typeof Text>) {
	return (
		<Text
			className={cn("text-muted-foreground text-xs", className)}
			{...props}
		/>
	);
}

function FieldError({
	className,
	children,
	errors,
	...props
}: React.ComponentProps<typeof View> & {
	children?: React.ReactNode;
	errors?: Array<{ message?: string } | undefined>;
}) {
	const { t, i18n } = useTranslation();

	const content = useMemo(() => {
		// Schema messages are dictionary keys (validation.*); anything else is shown as-is
		const translate = (message?: string) =>
			message && i18n.exists(message) ? t(message as ParseKeys) : message;

		if (children) {
			return children;
		}

		if (!errors?.length) {
			return null;
		}

		const uniqueErrors = [
			...new Map(errors.map((error) => [error?.message, error])).values(),
		];

		if (uniqueErrors.length === 1) {
			return (
				<Text className={cn("font-normal text-destructive text-xs", className)}>
					{translate(uniqueErrors[0]?.message)}
				</Text>
			);
		}

		return (
			<View className="gap-1">
				{uniqueErrors.map(
					(error) =>
						error?.message && (
							<Text
								key={createId()}
								className={cn(
									"font-normal text-destructive text-xs",
									className,
								)}
							>
								{"• "}
								{translate(error.message)}
							</Text>
						),
				)}
			</View>
		);
	}, [children, errors, className, t, i18n]);

	if (!content) {
		return null;
	}

	return (
		<View accessibilityRole="alert" {...props}>
			{content}
		</View>
	);
}

export { Field, FieldDescription, FieldError, FieldLabel };
