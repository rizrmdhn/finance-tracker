CREATE TABLE `recurrences` (
	`id` text PRIMARY KEY NOT NULL,
	`template_transaction_id` text NOT NULL,
	`frequency` text NOT NULL,
	`next_run_at` integer NOT NULL,
	`end_date` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text,
	`updated_at` text,
	`deleted_at` text,
	FOREIGN KEY (`template_transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_recurrences_template_id` ON `recurrences` (`template_transaction_id`);--> statement-breakpoint
CREATE INDEX `idx_recurrences_next_run_at` ON `recurrences` (`next_run_at`);