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
		goals: string;
		trash: string;
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
		deleteTitle: string;
		deleteDescription: string;
		deleteSuccess: string;
		deleteFailed: string;
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
		more: string;
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
		searchPlaceholder: string;
		repeat: string;
		frequency: string;
		endDate: string;
		showDeleted: string;
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
			downloadApk: string;
			readyToInstall: string;
			restartInstall: string;
			resetOnboarding: string;
			resetOnboardingDescription: string;
			failedToCheck: string;
			preRelease: string;
			preReleaseDescription: string;
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
	goals: {
		title: string;
		description: string;
		addGoal: string;
		goalCount_one: string;
		goalCount_other: string;
		noGoals: string;
		noGoalsDescription: string;
		inactiveGoals: string;
		status: {
			active: string;
			reached: string;
			purchased: string;
			archived: string;
		};
		form: {
			namePlaceholder: string;
			targetAmount: string;
			targetDate: string;
			targetDateHelp: string;
			linkedAccount: string;
			linkedAccountPlaceholder: string;
			noLinkedAccount: string;
			linkedAccountHelp: string;
			linkedAccountUnavailable: string;
			initialFund: string;
			initialFundHelp: string;
			initialFundAccount: string;
			freeBalance: string;
			allocationPercent: string;
			allocationPercentHelp: string;
			allocationAvailable: string;
			priority: string;
			priorityHelp: string;
			productUrl: string;
			productUrlPlaceholder: string;
			image: string;
			uploadImage: string;
			removeImage: string;
		};
		create: {
			title: string;
		};
		edit: {
			title: string;
		};
		card: {
			progress: string;
			percent: string;
			remaining: string;
			openProduct: string;
		};
		estimate: {
			daysLeft_one: string;
			daysLeft_other: string;
			monthsLeft_one: string;
			monthsLeft_other: string;
			yearsLeft_one: string;
			yearsLeft_other: string;
			yearsMonthsLeft: string;
			overCap: string;
			estimatedDate: string;
			rough: string;
			roughDescription: string;
			initial: string;
			range: string;
			basedOnSavings: string;
			basedOnSurplus: string;
			noSurplus: string;
			noHistory: string;
			reached: string;
			reachedDescription: string;
		};
		duration: {
			days_one: string;
			days_other: string;
			months_one: string;
			months_other: string;
			years_one: string;
			years_other: string;
			yearsMonths: string;
			overCap: string;
		};
		insight: {
			potential: string;
		};
		targetDate: {
			label: string;
			onTrack: string;
			behind: string;
			past: string;
		};
		funding: {
			title: string;
			linkedAccount: string;
			setAside: string;
			total: string;
			empty: string;
		};
		contributions: {
			title: string;
			empty: string;
			setAside: string;
			withdrawn: string;
			delete: {
				title: string;
				description: string;
				confirm: string;
			};
		};
		contribution: {
			setAside: string;
			setAsideDescription: string;
			withdraw: string;
			withdrawDescription: string;
			freeBalance: string;
			maxWithdraw: string;
			notePlaceholder: string;
			noAccounts: string;
		};
		purchase: {
			action: string;
			title: string;
			description: string;
			payments: string;
			addPayment: string;
			removePayment: string;
			shortfall: string;
			total: string;
			category: string;
			selectCategory: string;
			confirm: string;
		};
		archive: {
			action: string;
			title: string;
			description: string;
			confirm: string;
		};
		delete: {
			title: string;
			description: string;
			confirm: string;
		};
		allocation: {
			freeBalance: string;
			allocated: string;
			linkedTo: string;
			overAllocated: string;
			overAllocatedDescription: string;
			overLimit: string;
		};
		errors: {
			notActive: string;
			accountAlreadyLinked: string;
			accountIsContributionSource: string;
			linkedAccountContribution: string;
			insufficientFreeBalance: string;
			withdrawalExceedsAllocation: string;
			allocationLimitExceeded: string;
		};
		toast: {
			created: string;
			createFailed: string;
			updated: string;
			updateFailed: string;
			deleted: string;
			deleteFailed: string;
			setAside: string;
			withdrawn: string;
			contributionFailed: string;
			contributionDeleted: string;
			contributionDeleteFailed: string;
			purchased: string;
			purchaseFailed: string;
			archived: string;
			archiveFailed: string;
		};
		widget: {
			title: string;
			noGoals: string;
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
			updateFailed: string;
			deleted: string;
			deleteFailed: string;
			paused: string;
			resumed: string;
			toggleFailed: string;
		};
	};
	trash: {
		title: string;
		description: string;
		transactions: string;
		categories: string;
		accounts: string;
		goals: string;
		emptyTrash: string;
		restore: string;
		permanentDelete: string;
		noItems: string;
		noItemsDescription: string;
		toast: {
			restored: string;
			restoreFailed: string;
			permanentlyDeleted: string;
			permanentDeleteFailed: string;
			confirmPermanentDelete: string;
			confirmEmptyTrash: string;
		};
	};
	update: {
		toast: {
			title: string;
			description: string;
			action: string;
		};
	};
	search: {
		title: string;
		description: string;
		placeholder: string;
		hint: string;
		noResults: string;
		navigateHint: string;
		heading: string;
	};
	receiptScanner: {
		title: string;
		description: string;
		takePhoto: string;
		chooseFromLibrary: string;
		scanning: string;
		scanFailed: string;
		noTextFound: string;
		fillManually: string;
		scannedBadge: string;
		scanReceipt: string;
		permissionDenied: string;
		review: string;
		reviewDescription: string;
		confirmAndFill: string;
		scanAgain: string;
		notDetected: string;
	};
	sync: {
		title: string;
		description: string;
		heading: string;
		subheading: string;
		thisDevice: string;
		trustedDevices: string;
		noTrustedDevices: string;
		noTrustedDevicesDescription: string;
		nearbyDevices: string;
		scanningForDevices: string;
		noNearbyDevices: string;
		startScanning: string;
		stopScanning: string;
		pair: string;
		unpair: string;
		desktop: string;
		mobile: string;
		lastSeen: string;
		never: string;
		pairedOn: string;
		confirmPairing: string;
		confirmPairingDescription: string;
		verificationCode: string;
		verificationCodeDescription: string;
		confirm: string;
		reject: string;
		pairingInProgress: string;
		wantsToPair: string;
		connectToDesktop: string;
		connectDescription: string;
		connect: string;
		syncNow: string;
		syncing: string;
		paired: string;
		syncWithDesktop: string;
		syncDescription: string;
		connectToDevice: string;
		connectToDeviceDescription: string;
		hostSyncSession: string;
		hostSyncDescription: string;
		yourIpAddress: string;
		startHosting: string;
		stopHosting: string;
		hosting: string;
		syncEnterIp: string;
		syncEnterIpDescription: string;
		autoSync: string;
		autoSyncDescription: string;
		toast: {
			paired: string;
			pairFailed: string;
			unpaired: string;
			unpairFailed: string;
			pairRejected: string;
			syncComplete: string;
			syncFailed: string;
			autoSyncFailed: string;
		};
		errors: {
			untrusted: string;
			repairRequired: string;
			authFailed: string;
			schemaMismatch: string;
			protocolMismatch: string;
			applyFailed: string;
			protocolError: string;
			connectionClosed: string;
			timeout: string;
			internal: string;
		};
	};
}
