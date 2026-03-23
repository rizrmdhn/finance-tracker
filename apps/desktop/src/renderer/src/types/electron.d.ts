declare global {
	interface Window {
		electronApp: {
			getVersion: () => Promise<string>;
		};
		electronDataManager: {
			backup: () => Promise<{
				success: boolean;
				cancelled?: boolean;
				error?: string;
			}>;
			restore: () => Promise<{
				success: boolean;
				cancelled?: boolean;
				error?: string;
			}>;
			wipe: () => Promise<{ success: boolean; error?: string }>;
			exportFile: (payload: {
				content: string;
				format: "csv" | "json";
				defaultName: string;
			}) => Promise<{ success: boolean; cancelled?: boolean; error?: string }>;
			importFile: () => Promise<{
				success: boolean;
				cancelled?: boolean;
				content?: string;
				filename?: string;
				error?: string;
			}>;
		};
	}
}

export {};
