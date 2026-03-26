import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Container } from "@/components/container";
import { TrashCategories } from "@/components/trash-categories-tab";
import { TrashTransactions } from "@/components/trash-transaction-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Text } from "@/components/ui/text";

export default function Trash() {
	const { t } = useTranslation();

	const [tab, setTab] = useState<"transactions" | "categories">("transactions");

	return (
		<Container>
			<View className="flex flex-col gap-4 px-6 py-3">
				<Tabs
					value={tab}
					onValueChange={(value) =>
						setTab(value as "transactions" | "categories")
					}
				>
					<TabsList>
						<TabsTrigger value="transactions">
							<Text>{t("trash.transactions")}</Text>
						</TabsTrigger>
						<TabsTrigger value="categories">
							<Text>{t("trash.categories")}</Text>
						</TabsTrigger>
					</TabsList>
					<TabsContent value="transactions">
						<TrashTransactions />
					</TabsContent>
					<TabsContent value="categories">
						<TrashCategories />
					</TabsContent>
				</Tabs>
			</View>
		</Container>
	);
}
