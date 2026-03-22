CREATE TABLE `budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`amount` real NOT NULL,
	`period` text NOT NULL,
	`start_date` integer NOT NULL,
	`created_at` text,
	`updated_at` text,
	`deleted_at` text,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_budgets_category_id` ON `budgets` (`category_id`);