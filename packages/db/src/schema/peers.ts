import { createId } from "@paralleldrive/cuid2";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Devices we've successfully paired with (our trust store) */
export const trustedPeers = sqliteTable("trusted_peers", {
	id: text("id")
		.primaryKey()
		.$default(() => createId()),
	deviceId: text("device_id").notNull().unique(), // remote app's UUID
	deviceName: text("device_name").notNull(),
	platform: text("platform", { enum: ["desktop", "mobile"] }).notNull(),
	publicKey: text("public_key").notNull(), // long-term P-256 public key (hex)
	pairedAt: integer("paired_at").notNull(), // epoch ms
});

/** Per-peer CRDT sync state */
export const syncPeers = sqliteTable("sync_peers", {
	deviceId: text("device_id") // FK to trustedPeers.deviceId
		.primaryKey()
		.references(() => trustedPeers.deviceId, { onDelete: "cascade" }),
	siteId: text("site_id"), // remote crsql_site_id (hex) — set after first sync
	lastSyncedVersion: integer("last_synced_version").notNull().default(0),
	lastSeenAt: integer("last_seen_at"),
});
