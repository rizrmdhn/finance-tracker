#!/usr/bin/env bun
// Usage:
//   bun run tag <platform> <version> [--reset|--delete]
//
//   platform : desktop | mobile
//   version  : e.g. 1.0.0  (no "v" prefix needed)
//
// Examples:
//   bun run tag desktop 1.0.1          -> create desktop/v1.0.1
//   bun run tag mobile 1.0.0           -> create mobile/v1.0.0
//   bun run tag desktop 1.0.1 --reset  -> delete then recreate desktop/v1.0.1
//   bun run tag desktop 1.0.1 --delete -> delete desktop/v1.0.1 locally and remotely

import { spawnSync } from "node:child_process";

const [platform, version, mode] = process.argv.slice(2);

if (!platform || !version) {
	console.error(
		"Usage: bun run tag <desktop|mobile> <version> [--reset|--delete]",
	);
	process.exit(1);
}

if (platform !== "desktop" && platform !== "mobile") {
	console.error("Error: platform must be 'desktop' or 'mobile'");
	process.exit(1);
}

const tag = `${platform}/v${version}`;

function run(cmd: string, args: string[], { ignoreError = false } = {}) {
	const result = spawnSync(cmd, args, { stdio: "inherit" });
	if (!ignoreError && result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

function deleteTag() {
	console.log(`Deleting local tag '${tag}' (if exists)...`);
	run("git", ["tag", "-d", tag], { ignoreError: true });

	console.log(`Deleting remote tag '${tag}' (if exists)...`);
	run("git", ["push", "origin", "--delete", tag], { ignoreError: true });
}

function createTag() {
	console.log(`Creating tag '${tag}'...`);
	run("git", ["tag", tag]);
	run("git", ["push", "origin", tag]);
	console.log(`Done. Tag '${tag}' created and pushed.`);
}

switch (mode) {
	case "--delete":
		deleteTag();
		console.log(`Done. Tag '${tag}' deleted.`);
		break;
	case "--reset":
		deleteTag();
		createTag();
		console.log(`Done. Tag '${tag}' reset and pushed.`);
		break;
	case undefined:
		createTag();
		break;
	default:
		console.error(`Unknown option: ${mode}`);
		console.error("Valid options: --reset, --delete");
		process.exit(1);
}
