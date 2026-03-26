#!/usr/bin/env bun
// Usage:
//   bun run tag [platform] <version> [--reset|--delete]
//
//   platform : desktop | mobile  (omit to tag both)
//   version  : e.g. 1.0.0  (no "v" prefix needed)
//
// Examples:
//   bun run tag 1.0.0                  -> create desktop/v1.0.0 and mobile/v1.0.0
//   bun run tag desktop 1.0.1          -> create desktop/v1.0.1
//   bun run tag mobile 1.0.0           -> create mobile/v1.0.0
//   bun run tag desktop 1.0.1 --reset  -> delete then recreate desktop/v1.0.1
//   bun run tag desktop 1.0.1 --delete -> delete desktop/v1.0.1 locally and remotely
//   bun run tag 1.0.0 --reset          -> reset both desktop/v1.0.0 and mobile/v1.0.0

import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);

const PLATFORMS = ["desktop", "mobile"] as const;
type Platform = (typeof PLATFORMS)[number];

let platforms: Platform[];
let version: string;
let mode: string | undefined;

if (args[0] && PLATFORMS.includes(args[0] as Platform)) {
	platforms = [args[0] as Platform];
	version = args[1] ?? "";
	mode = args[2];
} else {
	platforms = ["desktop", "mobile"];
	version = args[0] ?? "";
	mode = args[1];
}

if (!version) {
	console.error(
		"Usage: bun run tag [desktop|mobile] <version> [--reset|--delete]",
	);
	process.exit(1);
}

function run(cmd: string, args: string[], { ignoreError = false } = {}) {
	const result = spawnSync(cmd, args, { stdio: "inherit" });
	if (!ignoreError && result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

function deleteTag(tag: string) {
	console.log(`Deleting local tag '${tag}' (if exists)...`);
	run("git", ["tag", "-d", tag], { ignoreError: true });

	console.log(`Deleting remote tag '${tag}' (if exists)...`);
	run("git", ["push", "origin", "--delete", tag], { ignoreError: true });
}

function createTag(tag: string) {
	console.log(`Creating tag '${tag}'...`);
	run("git", ["tag", tag]);
	run("git", ["push", "origin", tag]);
	console.log(`Done. Tag '${tag}' created and pushed.`);
}

if (mode !== undefined && mode !== "--delete" && mode !== "--reset") {
	console.error(`Unknown option: ${mode}`);
	console.error("Valid options: --reset, --delete");
	process.exit(1);
}

for (const platform of platforms) {
	const tag = `${platform}/v${version}`;
	switch (mode) {
		case "--delete":
			deleteTag(tag);
			console.log(`Done. Tag '${tag}' deleted.`);
			break;
		case "--reset":
			deleteTag(tag);
			createTag(tag);
			console.log(`Done. Tag '${tag}' reset and pushed.`);
			break;
		default:
			createTag(tag);
	}
}
