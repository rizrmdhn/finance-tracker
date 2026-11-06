// Tables in CRDT_TABLES are cr-sqlite CRRs, synced between devices. Their schema must:
// - have no UNIQUE constraints besides the primary key
// - give every NOT NULL column a DEFAULT
// - not rely on foreign keys: they are not enforced across sync
// Migrations of these tables are wrapped in crsql_begin_alter/commit_alter (see ../migrate.ts).
export * from "./accounts";
export * from "./app-settings";
export * from "./budgets";
export * from "./categories";
export * from "./exchange-rate-history";
export * from "./exchange-rates";
export * from "./goal-contributions";
export * from "./goals";
export * from "./peers";
export * from "./recurrences";
export * from "./transactions";
