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
		recurring: string;
		budgets: string;
		settings: string;
	};
	analitics: {
		title: string;
		incomeAndExpense: string;
		byCategory: string;
		balanceOverTime: string;
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
		cancel: string;
		confirm: string;
		account: string;
		category: string;
		toAccount: string;
		amount: string;
		tags: string;
		note: string;
		date: string;
		optional: string;
		allAccounts: string;
		selectAccountType: string;
		selectCurrency: string;
		selectCategoryType: string;
		selectDate: string;
		selectIcon: string;
		selectColor: string;
		searchIcon: string;
		noIconsFound: string;
		addTag: string;
		edit: string;
		seeDetails: string;
		printPDF: string;
		viewAll: string;
		selectStartDate: string;
		selectEndDate: string;
		from: string;
		reset: string;
		thisMonth: string;
		lastMonth: string;
		thisWeek: string;
		lastWeek: string;
		today: string;
		yesterday: string;
		recentTransactions: string;
		noTransactions: string;
		loading: string;
	};
	errors: {
		noData: string;
		somethingWentWrong: string;
		pageNotFound: string;
		pageNotFoundDescription: string;
		goBack: string;
		goHome: string;
		oops: string;
		refresh: string;
		validationFailed: string;
	};
	dashboard: {
		addTransaction: string;
		balance: string;
		income: string;
		expense: string;
		transfer: string;
		savings: string;
		budgetOverview: string;
		noBudgetsDescription: string;
	};
	accounts: {
		title: string;
		description: string;
		addAccount: string;
		accountCount: string;
		noAccounts: string;
		searchAccount: string;
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
		searchCategory: string;
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
		loadDefaults: string;
		toast: {
			created: string;
			createFailed: string;
			updated: string;
			updateFailed: string;
			deleted: string;
			deleteFailed: string;
			defaultsLoaded: string;
			defaultsLoadFailed: string;
		};
	};
	transactions: {
		title: string;
		transactionCount: string;
		description: string;
		addTransaction: string;
		noTransactions: string;
		noTransactionsDescription: string;
		notePlaceholder: string;
		repeat: string;
		frequency: string;
		endDate: string;
		create: {
			title: string;
		};
		edit: {
			title: string;
		};
		delete: {
			title: string;
			description: string;
			confirm: string;
		};
		toast: {
			created: string;
			updated: string;
			deleted: string;
			createFailed: string;
			updateFailed: string;
			deleteFailed: string;
			validationFailed: string;
			insufficientFunds: string;
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
		dataManagement: {
			title: string;
			backup: string;
			backupDescription: string;
			restore: string;
			restoreDescription: string;
			wipe: string;
			wipeDescription: string;
			wipeConfirmTitle: string;
			wipeConfirmDescription: string;
			wipeConfirmAction: string;
		};
		toast: {
			saved: string;
			saveFailed: string;
			onboardingReset: string;
			onboardingResetFailed: string;
			backupSuccess: string;
			backupFailed: string;
			restoreSuccess: string;
			restoreFailed: string;
			wipeSuccess: string;
			wipeFailed: string;
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
	budgets: {
		title: string;
		description: string;
		addBudget: string;
		budgetCount: string;
		noBudgets: string;
		period: string;
		monthly: string;
		weekly: string;
		selectPeriod: string;
		startDate: string;
		spent: string;
		remaining: string;
		overBy: string;
		overBudget: string;
		create: {
			title: string;
		};
		edit: {
			title: string;
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
	recurrences: {
		title: string;
		ruleCount: string;
		noRules: string;
		nextRun: string;
		active: string;
		paused: string;
		pause: string;
		resume: string;
		edit: {
			title: string;
		};
		delete: {
			title: string;
			description: string;
			confirm: string;
		};
		toast: {
			updated: string;
			deleted: string;
			paused: string;
			resumed: string;
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
