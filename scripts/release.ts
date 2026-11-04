#!/usr/bin/env bun
// Usage:
//   bun run release [desktop|mobile] <version|major|minor|patch> [--dry-run] [--any-branch]
//
//   Bumps the version files, commits + pushes the bump, then creates and pushes
//   the tags through scripts/tag.ts.
//
//   platform : desktop | mobile  (omit to release both with the same version)
//   version  : x.y.z, x.y.z-beta.N, or major | minor | patch
//
//   A prerelease (e.g. 2.0.0-beta.1) keeps the base version (2.0.0) in the files
//   and only the tag carries the suffix — the same way earlier betas were made.
//   With both platforms, major/minor/patch bump from the higher of the two
//   current versions so desktop and mobile stay aligned.
//
// Examples:
//   bun run release 2.0.0               -> both to 2.0.0, tags desktop/v2.0.0 + mobile/v2.0.0
//   bun run release 2.0.0-beta.1        -> files at 2.0.0, tags desktop/v2.0.0-beta.1 + mobile/v2.0.0-beta.1
//   bun run release minor               -> both to the next minor version
//   bun run release mobile patch        -> mobile only
//   bun run release 2.0.0 --dry-run     -> print the plan, change nothing

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const FILES = {
	desktopPkg: "apps/desktop/package.json",
	nativePkg: "apps/native/package.json",
	nativeAppJson: "apps/native/app.json",
	nativeGradle: "apps/native/android/app/build.gradle",
};

const PLATFORMS = ["desktop", "mobile"] as const;
type Platform = (typeof PLATFORMS)[number];
type Semver = [number, number, number];

function fail(message: string): never {
	console.error(`✗ ${message}`);
	process.exit(1);
}

function git(args: string[]) {
	const result = spawnSync("git", args, { cwd: ROOT, encoding: "utf-8" });
	if (result.status !== 0) {
		fail(`git ${args.join(" ")} failed:\n${result.stderr}`);
	}
	return result.stdout.trim();
}

function run(cmd: string, args: string[]) {
	const result = spawnSync(cmd, args, { cwd: ROOT, stdio: "inherit" });
	if (result.status !== 0) process.exit(result.status ?? 1);
}

function read(file: string) {
	return readFileSync(resolve(ROOT, file), "utf-8");
}

function parseSemver(version: string): Semver {
	const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
	if (!match) fail(`Invalid version: ${version}`);
	return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compare(a: Semver, b: Semver) {
	return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

function bump([major, minor, patch]: Semver, kind: string): Semver {
	if (kind === "major") return [major + 1, 0, 0];
	if (kind === "minor") return [major, minor + 1, 0];
	return [major, minor, patch + 1];
}

/** Replace exactly one match, keeping the file's formatting and line endings. */
function replaceOnce(text: string, pattern: RegExp, replacement: string) {
	if (!pattern.test(text)) fail(`Pattern ${pattern} not found`);
	return text.replace(pattern, replacement);
}

// ── Arguments ────────────────────────────────────────────────────────────────

const flags = process.argv.slice(2).filter((a) => a.startsWith("--"));
const positional = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const dryRun = flags.includes("--dry-run");
const anyBranch = flags.includes("--any-branch");

for (const flag of flags) {
	if (flag !== "--dry-run" && flag !== "--any-branch") {
		fail(`Unknown option: ${flag} (valid: --dry-run, --any-branch)`);
	}
}

const platformArg = PLATFORMS.includes(positional[0] as Platform)
	? (positional.shift() as Platform)
	: undefined;
const platforms: Platform[] = platformArg ? [platformArg] : [...PLATFORMS];
const versionArg = positional[0];

if (!versionArg) {
	fail(
		"Usage: bun run release [desktop|mobile] <version|major|minor|patch> [--dry-run] [--any-branch]",
	);
}

// ── Current state ────────────────────────────────────────────────────────────

const current: Record<Platform, Semver> = {
	desktop: parseSemver(JSON.parse(read(FILES.desktopPkg)).version),
	mobile: parseSemver(JSON.parse(read(FILES.nativeAppJson)).expo.version),
};
const currentVersionCode: number = JSON.parse(read(FILES.nativeAppJson)).expo
	.android.versionCode;

let base: Semver;
let suffix = "";
if (["major", "minor", "patch"].includes(versionArg)) {
	const from = platforms
		.map((p) => current[p])
		.reduce((a, b) => (compare(a, b) >= 0 ? a : b));
	base = bump(from, versionArg);
} else {
	const match = /^(\d+\.\d+\.\d+)(-[0-9A-Za-z.-]+)?$/.exec(versionArg);
	if (!match) fail(`Invalid version: ${versionArg}`);
	base = parseSemver(match[1] as string);
	suffix = match[2] ?? "";
}

const baseStr = base.join(".");
const tagVersion = `${baseStr}${suffix}`;

for (const p of platforms) {
	if (compare(base, current[p]) < 0) {
		fail(
			`${p} is at ${current[p].join(".")}, refusing to go back to ${baseStr}`,
		);
	}
}

// ── Safety checks ────────────────────────────────────────────────────────────

/** Abort on a failed check — in a dry run, only warn so the plan still prints. */
function check(ok: boolean, message: string) {
	if (ok) return;
	if (dryRun) console.warn(`! ${message}`);
	else fail(message);
}

check(
	!git(["status", "--porcelain"]),
	"Working tree is not clean — commit or stash first.",
);

const branch = git(["branch", "--show-current"]);
check(
	branch === "main" || anyBranch,
	`On branch '${branch}'. Release from 'main' or pass --any-branch.`,
);

git(["fetch", "origin", "--tags", "--quiet"]);
const upstream = spawnSync(
	"git",
	["rev-list", "--count", `HEAD..origin/${branch}`],
	{ cwd: ROOT, encoding: "utf-8" },
);
check(
	upstream.status !== 0 || Number(upstream.stdout.trim()) === 0,
	`Branch '${branch}' is behind origin — pull first.`,
);

const tags = platforms.map((p) => `${p}/v${tagVersion}`);
for (const tag of tags) {
	if (git(["tag", "-l", tag])) fail(`Tag '${tag}' already exists.`);
}

// ── Plan ─────────────────────────────────────────────────────────────────────

const edits: { file: string; content: string }[] = [];

if (platforms.includes("desktop") && compare(base, current.desktop) !== 0) {
	edits.push({
		file: FILES.desktopPkg,
		content: replaceOnce(
			read(FILES.desktopPkg),
			/"version":\s*"[^"]+"/,
			`"version": "${baseStr}"`,
		),
	});
}

const mobileChanges =
	platforms.includes("mobile") && compare(base, current.mobile) !== 0;
const nextVersionCode = mobileChanges
	? currentVersionCode + 1
	: currentVersionCode;

if (mobileChanges) {
	edits.push(
		{
			file: FILES.nativePkg,
			content: replaceOnce(
				read(FILES.nativePkg),
				/"version":\s*"[^"]+"/,
				`"version": "${baseStr}"`,
			),
		},
		{
			file: FILES.nativeAppJson,
			content: replaceOnce(
				replaceOnce(
					read(FILES.nativeAppJson),
					/"version":\s*"[^"]+"/,
					`"version": "${baseStr}"`,
				),
				/"versionCode":\s*\d+/,
				`"versionCode": ${nextVersionCode}`,
			),
		},
		{
			file: FILES.nativeGradle,
			content: replaceOnce(
				replaceOnce(
					read(FILES.nativeGradle),
					/versionCode \d+/,
					`versionCode ${nextVersionCode}`,
				),
				/versionName "[^"]+"/,
				`versionName "${baseStr}"`,
			),
		},
	);
}

console.log(`Release ${tagVersion} on '${branch}'`);
for (const p of platforms) {
	const from = current[p].join(".");
	const note =
		p === "mobile" && mobileChanges
			? ` (versionCode ${currentVersionCode} → ${nextVersionCode})`
			: "";
	console.log(
		`  ${p}: ${from === baseStr ? `${from} (unchanged)` : `${from} → ${baseStr}`}${note}`,
	);
}
console.log(`  tags: ${tags.join(", ")}`);

if (dryRun) {
	console.log("Dry run — nothing changed.");
	process.exit(0);
}

// ── Apply ────────────────────────────────────────────────────────────────────

if (edits.length > 0) {
	for (const edit of edits) {
		writeFileSync(resolve(ROOT, edit.file), edit.content);
	}
	const bumped = platforms
		.filter((p) => compare(base, current[p]) !== 0)
		.join(" and ");
	git(["add", ...edits.map((e) => e.file)]);
	git(["commit", "-m", `build: bump ${bumped} to ${baseStr}`]);
	run("git", ["push", "origin", branch]);
}

run("bun", [
	"scripts/tag.ts",
	...(platformArg ? [platformArg] : []),
	tagVersion,
]);
