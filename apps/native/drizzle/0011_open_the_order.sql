PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text DEFAULT '' NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'IDR' NOT NULL,
	`period` text DEFAULT 'monthly' NOT NULL,
	`start_date` integer DEFAULT 0 NOT NULL,
	`created_at` text,
	`updated_at` text,
	`deleted_at` text
);
--> statement-breakpoint
INSERT INTO `__new_budgets`("id", "category_id", "amount", "currency", "period", "start_date", "created_at", "updated_at", "deleted_at") SELECT "id", "category_id", "amount", "currency", "period", "start_date", "created_at", "updated_at", "deleted_at" FROM `budgets`;--> statement-breakpoint
DROP TABLE `budgets`;--> statement-breakpoint
ALTER TABLE `__new_budgets` RENAME TO `budgets`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_budgets_category_id` ON `budgets` (`category_id`);--> statement-breakpoint
CREATE TABLE `__new_recurrences` (
	`id` text PRIMARY KEY NOT NULL,
	`template_transaction_id` text DEFAULT '' NOT NULL,
	`frequency` text DEFAULT 'daily' NOT NULL,
	`next_run_at` integer DEFAULT 0 NOT NULL,
	`end_date` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text,
	`updated_at` text,
	`deleted_at` text
);
--> statement-breakpoint
INSERT INTO `__new_recurrences`("id", "template_transaction_id", "frequency", "next_run_at", "end_date", "is_active", "created_at", "updated_at", "deleted_at") SELECT "id", "template_transaction_id", "frequency", "next_run_at", "end_date", "is_active", "created_at", "updated_at", "deleted_at" FROM `recurrences`;--> statement-breakpoint
DROP TABLE `recurrences`;--> statement-breakpoint
ALTER TABLE `__new_recurrences` RENAME TO `recurrences`;--> statement-breakpoint
CREATE INDEX `idx_recurrences_template_id` ON `recurrences` (`template_transaction_id`);--> statement-breakpoint
CREATE INDEX `idx_recurrences_next_run_at` ON `recurrences` (`next_run_at`);--> statement-breakpoint
CREATE TABLE `__new_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`note` text,
	`category_id` text DEFAULT '' NOT NULL,
	`account_id` text DEFAULT '' NOT NULL,
	`to_account_id` text,
	`tags` text,
	`date` integer DEFAULT 0 NOT NULL,
	`created_at` text,
	`updated_at` text,
	`deleted_at` text
);
--> statement-breakpoint
INSERT INTO `__new_transactions`("id", "amount", "note", "category_id", "account_id", "to_account_id", "tags", "date", "created_at", "updated_at", "deleted_at") SELECT "id", "amount", "note", "category_id", "account_id", "to_account_id", "tags", "date", "created_at", "updated_at", "deleted_at" FROM `transactions`;--> statement-breakpoint
DROP TABLE `transactions`;--> statement-breakpoint
ALTER TABLE `__new_transactions` RENAME TO `transactions`;--> statement-breakpoint
CREATE INDEX `idx_transactions_category_id` ON `transactions` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_transactions_account_id` ON `transactions` (`account_id`);--> statement-breakpoint
CREATE INDEX `idx_transactions_date` ON `transactions` (`date`);