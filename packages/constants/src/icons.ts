export type SupportedIconMeta = { name: string; label: string };

export const SUPPORTED_ICONS: SupportedIconMeta[] = [
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

export const ICON_NAMES = SUPPORTED_ICONS.map((i) => i.name) as [
	string,
	...string[],
];
