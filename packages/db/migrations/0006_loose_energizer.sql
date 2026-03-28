CREATE TABLE `sync_peers` (
	`device_id` text PRIMARY KEY NOT NULL,
	`site_id` text,
	`last_synced_version` integer DEFAULT 0 NOT NULL,
	`last_seen_at` integer,
	FOREIGN KEY (`device_id`) REFERENCES `trusted_peers`(`device_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `trusted_peers` (
	`id` text PRIMARY KEY NOT NULL,
	`device_id` text NOT NULL,
	`device_name` text NOT NULL,
	`platform` text NOT NULL,
	`public_key` text NOT NULL,
	`paired_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `trusted_peers_device_id_unique` ON `trusted_peers` (`device_id`);