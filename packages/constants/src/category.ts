export const CATEGORY_TYPES = [
	"income",
	"expense",
	"transfer",
	"savings",
] as const;
export type CategoryType = (typeof CATEGORY_TYPES)[number];

export const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
	income: "Income",
	expense: "Expense",
	transfer: "Transfer",
	savings: "Savings",
};

export const CATEGORY_TYPE_COLORS: Record<CategoryType, string> = {
	income: "green-500",
	expense: "red-500",
	transfer: "blue-500",
	savings: "yellow-500",
};

export type CategoryColorMeta = { label: string; value: string };

export const CATEGORY_COLORS: CategoryColorMeta[] = [
	{ label: "Red", value: "#ef4444" },
	{ label: "Orange", value: "#f97316" },
	{ label: "Amber", value: "#f59e0b" },
	{ label: "Yellow", value: "#eab308" },
	{ label: "Lime", value: "#84cc16" },
	{ label: "Green", value: "#22c55e" },
	{ label: "Emerald", value: "#10b981" },
	{ label: "Teal", value: "#14b8a6" },
	{ label: "Cyan", value: "#06b6d4" },
	{ label: "Sky", value: "#0ea5e9" },
	{ label: "Blue", value: "#3b82f6" },
	{ label: "Indigo", value: "#6366f1" },
	{ label: "Violet", value: "#8b5cf6" },
	{ label: "Purple", value: "#a855f7" },
	{ label: "Fuchsia", value: "#d946ef" },
	{ label: "Pink", value: "#ec4899" },
	{ label: "Rose", value: "#f43f5e" },
	{ label: "Slate", value: "#64748b" },
	{ label: "Gray", value: "#6b7280" },
	{ label: "Stone", value: "#78716c" },
];

export type CategoryIconMeta = { name: string; label: string };

export const CATEGORY_ICONS: CategoryIconMeta[] = [
	// Finance
	{ name: "Wallet", label: "Wallet" },
	{ name: "CreditCard", label: "Credit Card" },
	{ name: "Banknote", label: "Banknote" },
	{ name: "PiggyBank", label: "Piggy Bank" },
	{ name: "TrendingUp", label: "Trending Up" },
	{ name: "TrendingDown", label: "Trending Down" },
	{ name: "DollarSign", label: "Dollar Sign" },
	{ name: "Landmark", label: "Bank" },
	{ name: "Receipt", label: "Receipt" },
	{ name: "Coins", label: "Coins" },
	{ name: "BadgeDollarSign", label: "Badge Dollar" },
	// Food & Dining
	{ name: "Utensils", label: "Utensils" },
	{ name: "Coffee", label: "Coffee" },
	{ name: "Pizza", label: "Pizza" },
	{ name: "ShoppingBasket", label: "Basket" },
	{ name: "Apple", label: "Food" },
	{ name: "Beer", label: "Beer" },
	{ name: "Cake", label: "Cake" },
	{ name: "Wine", label: "Wine" },
	// Shopping
	{ name: "ShoppingCart", label: "Shopping Cart" },
	{ name: "ShoppingBag", label: "Shopping Bag" },
	{ name: "Package", label: "Package" },
	{ name: "Tag", label: "Tag" },
	{ name: "Gift", label: "Gift" },
	{ name: "Store", label: "Store" },
	// Transport
	{ name: "Car", label: "Car" },
	{ name: "Bus", label: "Bus" },
	{ name: "Train", label: "Train" },
	{ name: "Plane", label: "Plane" },
	{ name: "Fuel", label: "Fuel" },
	{ name: "Bike", label: "Bike" },
	{ name: "Truck", label: "Truck" },
	// Health
	{ name: "Heart", label: "Heart" },
	{ name: "Activity", label: "Activity" },
	{ name: "Stethoscope", label: "Medical" },
	{ name: "Pill", label: "Medicine" },
	{ name: "Dumbbell", label: "Gym" },
	// Home & Utilities
	{ name: "Home", label: "Home" },
	{ name: "Wifi", label: "Internet" },
	{ name: "Zap", label: "Electricity" },
	{ name: "Droplets", label: "Water" },
	{ name: "Lightbulb", label: "Lightbulb" },
	{ name: "Wrench", label: "Repairs" },
	// Entertainment
	{ name: "Music", label: "Music" },
	{ name: "Film", label: "Movies" },
	{ name: "Gamepad2", label: "Gaming" },
	{ name: "Tv", label: "TV" },
	{ name: "Book", label: "Books" },
	{ name: "Headphones", label: "Headphones" },
	// Work
	{ name: "Briefcase", label: "Work" },
	{ name: "Building2", label: "Office" },
	{ name: "Laptop", label: "Laptop" },
	{ name: "Monitor", label: "Monitor" },
	// Personal
	{ name: "Star", label: "Star" },
	{ name: "Shirt", label: "Clothing" },
	{ name: "Scissors", label: "Haircut" },
	{ name: "Smile", label: "Other" },
];
