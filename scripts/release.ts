#!/usr/bin/env bun
// Usage:
//   bun run release [desktop|mobile] <version|bump [pre]|pre|stable> [--dry-run] [--any-branch]
//
//   Bumps the version files, commits + pushes the bump, then creates and pushes
//   the tags through scripts/tag.ts.
//
//   platform : desktop | mobile  (omit to release both with the same version)
//   version  : an explicit x.y.z or x.y.z-beta.N
//   bump     : major | minor | patch — needs a stable current version
//   pre      : alpha | beta | rc — after a bump, starts that prerelease at .1;
//              alone, continues the current prerelease (beta.1 -> beta.2, or
//              beta.2 -> rc.1). Going back (beta -> alpha) is refused.
//   stable   : finalizes the current prerelease (2.0.0-rc.1 -> 2.0.0)
//
//   A prerelease (e.g. 2.0.0-beta.1) is written to the files as-is, so an
//   installed beta can tell it is older than the final 2.0.0 and update to it.
//   Keywords work from the higher of the current versions, so desktop and
//   mobile stay aligned.
//
// Examples:
//   bun run release 2.0.0               -> both to 2.0.0, tags desktop/v2.0.0 + mobile/v2.0.0
//   bun run release 2.0.0-beta.1        -> both to 2.0.0-beta.1, tags desktop/v2.0.0-beta.1 + mobile/v2.0.0-beta.1
//   bun run release minor               -> both to the next minor version
//   bun run release mobile patch        -> mobile only
//   bun run release desktop minor beta  -> 2.3.2 -> 2.4.0-beta.1
//   bun run release desktop beta        -> 2.4.0-beta.1 -> 2.4.0-beta.2
//   bun run release desktop rc          -> 2.4.0-beta.2 -> 2.4.0-rc.1
//   bun run release desktop stable      -> 2.4.0-rc.1 -> 2.4.0
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
const BUMPS = ["major", "minor", "patch"];
const PRE_IDS = ["alpha", "beta", "rc"];
const USAGE =
	"Usage: bun run release [desktop|mobile] <version|major|minor|patch [alpha|beta|rc]|alpha|beta|rc|stable> [--dry-run] [--any-branch]";
type Semver = [number, number, number];
/** `pre` is the prerelease suffix without its dash ("beta.1"), "" for a release. */
type Version = { base: Semver; pre: string };

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

function parseVersion(version: string): Version {
	const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(version);
	if (!match) fail(`Invalid version: ${version}`);
	return {
		base: [Number(match[1]), Number(match[2]), Number(match[3])],
		pre: match[4] ?? "",
	};
}

function format({ base, pre }: Version) {
	return pre ? `${base.join(".")}-${pre}` : base.join(".");
}

/** Semver precedence: 2.0.0-beta.1 < 2.0.0-beta.2 < 2.0.0 */
function compare(a: Version, b: Version): number {
	const baseDiff =
		a.base[0] - b.base[0] || a.base[1] - b.base[1] || a.base[2] - b.base[2];
	if (baseDiff !== 0 || a.pre === b.pre) return baseDiff;
	if (!a.pre) return 1;
	if (!b.pre) return -1;
	const aIds = a.pre.split(".");
	const bIds = b.pre.split(".");
	for (let i = 0; i < Math.max(aIds.length, bIds.length); i++) {
		const x = aIds[i];
		const y = bIds[i];
		if (x === undefined) return -1;
		if (y === undefined) return 1;
		if (x === y) continue;
		const xNum = /^\d+$/.test(x);
		const yNum = /^\d+$/.test(y);
		if (xNum && yNum) return Number(x) - Number(y);
		if (xNum !== yNum) return xNum ? -1 : 1;
		return x < y ? -1 : 1;
	}
	return 0;
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
const [versionArg, preArg, ...extra] = positional;

if (!versionArg || extra.length > 0) fail(USAGE);
if (
	preArg !== undefined &&
	!(BUMPS.includes(versionArg) && PRE_IDS.includes(preArg))
) {
	fail(USAGE);
}

// ── Current state ────────────────────────────────────────────────────────────

const current: Record<Platform, Version> = {
	desktop: parseVersion(JSON.parse(read(FILES.desktopPkg)).version),
	mobile: parseVersion(JSON.parse(read(FILES.nativeAppJson)).expo.version),
};
const currentVersionCode: number = JSON.parse(read(FILES.nativeAppJson)).expo
	.android.versionCode;

const from = platforms
	.map((p) => current[p])
	.reduce((a, b) => (compare(a, b) >= 0 ? a : b));

let next: Version;
if (BUMPS.includes(versionArg)) {
	if (from.pre) {
		fail(
			`Current version is the prerelease ${format(from)} — continue it with alpha|beta|rc, or finish it with 'stable'.`,
		);
	}
	next = {
		base: bump(from.base, versionArg),
		pre: preArg ? `${preArg}.1` : "",
	};
} else if (PRE_IDS.includes(versionArg)) {
	if (!from.pre) {
		fail(
			`Current version ${format(from)} is stable — pick the base first, e.g. 'minor ${versionArg}'.`,
		);
	}
	const [id, num] = from.pre.split(".");
	next = {
		base: from.base,
		pre:
			id === versionArg && /^\d+$/.test(num ?? "")
				? `${id}.${Number(num) + 1}`
				: `${versionArg}.1`,
	};
} else if (versionArg === "stable") {
	if (!from.pre) fail(`Current version ${format(from)} is already stable.`);
	next = { base: from.base, pre: "" };
} else {
	next = parseVersion(versionArg);
}

const tagVersion = format(next);

for (const p of platforms) {
	if (compare(next, current[p]) < 0) {
		fail(
			`${p} is at ${format(current[p])}, refusing to go back to ${tagVersion}`,
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

if (platforms.includes("desktop") && compare(next, current.desktop) !== 0) {
	edits.push({
		file: FILES.desktopPkg,
		content: replaceOnce(
			read(FILES.desktopPkg),
			/"version":\s*"[^"]+"/,
			`"version": "${tagVersion}"`,
		),
	});
}

const mobileChanges =
	platforms.includes("mobile") && compare(next, current.mobile) !== 0;
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
				`"version": "${tagVersion}"`,
			),
		},
		{
			file: FILES.nativeAppJson,
			content: replaceOnce(
				replaceOnce(
					read(FILES.nativeAppJson),
					/"version":\s*"[^"]+"/,
					`"version": "${tagVersion}"`,
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
				`versionName "${tagVersion}"`,
			),
		},
	);
}

console.log(`Release ${tagVersion} on '${branch}'`);
for (const p of platforms) {
	const from = format(current[p]);
	const note =
		p === "mobile" && mobileChanges
			? ` (versionCode ${currentVersionCode} → ${nextVersionCode})`
			: "";
	console.log(
		`  ${p}: ${from === tagVersion ? `${from} (unchanged)` : `${from} → ${tagVersion}`}${note}`,
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
		.filter((p) => compare(next, current[p]) !== 0)
		.join(" and ");
	git(["add", ...edits.map((e) => e.file)]);
	git(["commit", "-m", `build: bump ${bumped} to ${tagVersion}`]);
	run("git", ["push", "origin", branch]);
}

run("bun", [
	"scripts/tag.ts",
	...(platformArg ? [platformArg] : []),
	tagVersion,
]);
