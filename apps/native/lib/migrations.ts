const migration0000 = `
CREATE TABLE \`categories\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`name\` text NOT NULL,
	\`icon\` text,
	\`color\` text,
	\`type\` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`transactions\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`type\` text NOT NULL,
	\`amount\` real NOT NULL,
	\`note\` text,
	\`category_id\` text,
	\`tags\` text,
	\`date\` integer NOT NULL,
	\`created_at\` integer,
	FOREIGN KEY (\`category_id\`) REFERENCES \`categories\`(\`id\`) ON UPDATE no action ON DELETE no action
);
`;

const migration0001 = "ALTER TABLE `transactions` DROP COLUMN `type`;";

export const migrations = {
	journal: {
		version: "7",
		dialect: "sqlite" as const,
		entries: [
			{
				idx: 0,
				version: "6",
				when: 1773756681821,
				tag: "0000_clumsy_vin_gonzales",
				breakpoints: true,
			},
			{
				idx: 1,
				version: "6",
				when: 1773921947699,
				tag: "0001_colossal_supernaut",
				breakpoints: true,
			},
		],
	},
	migrations: {
		"0000_clumsy_vin_gonzales": migration0000,
		"0001_colossal_supernaut": migration0001,
	},
};
