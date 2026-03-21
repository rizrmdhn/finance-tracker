export interface Dictionary {
	app: {
		title: string;
		description: string;
	};
	sidebar: {
		dashboard: string;
		accounts: string;
		categories: string;
		transactions: string;
		settings: string;
	};
	common: {
		name: string;
		icon: string;
		color: string;
		type: string;
		currency: string;
		initialBalance: string;
		create: string;
		saveChanges: string;
		delete: string;
		account: string;
		category: string;
		toAccount: string;
		amount: string;
		tags: string;
		note: string;
		date: string;
		allAccounts: string;
		selectAccountType: string;
		selectCurrency: string;
		selectCategoryType: string;
	};
	dashboard: {
		addTransaction: string;
		balance: string;
		income: string;
		expense: string;
		transfer: string;
		savings: string;
	};
	accounts: {
		title: string;
		description: string;
		addAccount: string;
		accountCount: string;
		noAccounts: string;
		create: {
			title: string;
			namePlaceholder: string;
		};
		edit: {
			title: string;
			namePlaceholder: string;
		};
		delete: {
			title: string;
			description: string;
			confirm: string;
		};
		toast: {
			created: string;
			createFailed: string;
			updated: string;
			updateFailed: string;
			deleted: string;
			deleteFailed: string;
		};
	};
	categories: {
		title: string;
		description: string;
		addCategory: string;
		categoryCount: string;
		noCategories: string;
		create: {
			title: string;
			namePlaceholder: string;
		};
		edit: {
			title: string;
			namePlaceholder: string;
		};
		delete: {
			title: string;
			description: string;
			confirm: string;
		};
		toast: {
			created: string;
			createFailed: string;
			updated: string;
			updateFailed: string;
			deleted: string;
			deleteFailed: string;
		};
	};
	transactions: {
		title: string;
		description: string;
		addTransaction: string;
		noTransactions: string;
		noTransactionsDescription: string;
		notePlaceholder: string;
		create: {
			title: string;
		};
		edit: {
			title: string;
		};
		toast: {
			created: string;
			updated: string;
		};
	};
	settings: {
		title: string;
		description: string;
		heading: string;
		subheading: string;
		appearance: {
			title: string;
			theme: string;
			themeDescription: string;
			light: string;
			dark: string;
			system: string;
		};
		localization: {
			title: string;
			currency: string;
			currencyDescription: string;
			language: string;
			languageDescription: string;
		};
		advanced: {
			title: string;
			updates: string;
			updatesDescription: string;
			checkUpdates: string;
			upToDate: string;
			versionAvailable: string;
			downloadingAuto: string;
			downloading: string;
			readyToInstall: string;
			restartInstall: string;
			resetOnboarding: string;
			resetOnboardingDescription: string;
			failedToCheck: string;
		};
		toast: {
			saved: string;
			saveFailed: string;
			onboardingReset: string;
			onboardingResetFailed: string;
		};
	};
	onboarding: {
		title: string;
		description: string;
		accountName: string;
		accountNamePlaceholder: string;
		accountType: string;
		submit: string;
		toast: {
			failed: string;
		};
	};
	update: {
		toast: {
			title: string;
			description: string;
			action: string;
		};
	};
}
