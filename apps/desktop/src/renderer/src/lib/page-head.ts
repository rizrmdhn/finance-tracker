const APP_NAME = "Finance Tracker";

export function pageHead(title: string, description?: string) {
	return {
		meta: [
			{ title: `${title} | ${APP_NAME}` },
			...(description
				? [{ name: "description" as const, content: description }]
				: []),
		],
	};
}
