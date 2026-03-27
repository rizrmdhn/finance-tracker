CREATE TABLE `exchange_rates` (
	`base` text NOT NULL,
	`target` text NOT NULL,
	`rate` real NOT NULL,
	`fetched_at` integer NOT NULL,
	PRIMARY KEY(`base`, `target`)
);
