import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Languages } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";

const LANGUAGES = [
	{ code: "en", label: "English" },
	{ code: "id", label: "Indonesia" },
] as const;

export function LanguageToggle() {
	const { i18n } = useTranslation();
	const queryClient = useQueryClient();

	const { data: language } = useQuery(
		trpc.appSetting.get.queryOptions({ key: "language" }),
	);

	const setLanguageMutation = useMutation(
		trpc.appSetting.set.mutationOptions({
			onSuccess: async (_, variables) => {
				i18n.changeLanguage(variables.value);
				await queryClient.invalidateQueries(
					trpc.appSetting.get.queryOptions({ key: "language" }),
				);
			},
		}),
	);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger className="px-2.5">
				<Icon as={Languages} className="size-5 text-foreground" />
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuRadioGroup
					value={language?.value ?? i18n.language}
					onValueChange={(value) =>
						setLanguageMutation.mutate({ key: "language", value })
					}
				>
					{LANGUAGES.map(({ code, label }) => (
						<DropdownMenuRadioItem key={code} value={code}>
							<Text>{label}</Text>
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
