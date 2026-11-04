CREATE TABLE `goal_contributions` (
	`id` text PRIMARY KEY NOT NULL,
	`goal_id` text DEFAULT '' NOT NULL,
	`account_id` text DEFAULT '' NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`note` text,
	`date` integer DEFAULT 0 NOT NULL,
	`created_at` text,
	`updated_at` text,
	`deleted_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_goal_contributions_goal_id` ON `goal_contributions` (`goal_id`);--> statement-breakpoint
CREATE INDEX `idx_goal_contributions_account_id` ON `goal_contributions` (`account_id`);--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`icon` text DEFAULT 'Gift' NOT NULL,
	`color` text DEFAULT '#ef4444' NOT NULL,
	`image_uri` text,
	`product_url` text,
	`target_amount` real DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'IDR' NOT NULL,
	`target_date` integer,
	`linked_account_id` text,
	`allocation_percent` real DEFAULT 100 NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`purchased_at` integer,
	`created_at` text,
	`updated_at` text,
	`deleted_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_goals_linked_account_id` ON `goals` (`linked_account_id`);--> statement-breakpoint
CREATE INDEX `idx_goals_status` ON `goals` (`status`);