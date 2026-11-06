CREATE TABLE `exchange_rate_history` (
	`target` text NOT NULL,
	`date` text NOT NULL,
	`rate` real NOT NULL,
	`fetched_at` integer NOT NULL,
	PRIMARY KEY(`target`, `date`)
);
