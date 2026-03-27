#!/usr/bin/env node
/**
 * Usage:
 *   bun run scripts/bump-version.mjs minor   -> 1.1.0 => 1.2.0
 *   bun run scripts/bump-version.mjs patch   -> 1.1.0 => 1.1.1
 *   bun run scripts/bump-version.mjs major   -> 1.1.0 => 2.0.0
 *   bun run scripts/bump-version.mjs 2.0.0   -> explicit version
 */

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const appJsonPath = resolve(root, "app.json");
const pkgJsonPath = resolve(root, "package.json");

const appJson = JSON.parse(readFileSync(appJsonPath, "utf-8"));
const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));

const current = appJson.expo.version;
const [major, minor, patch] = current.split(".").map(Number);

const bump = process.argv[2];
let next;

if (!bump) {
	console.error("Usage: bump-version.mjs <major|minor|patch|x.y.z>");
	process.exit(1);
} else if (bump === "major") {
	next = `${major + 1}.0.0`;
} else if (bump === "minor") {
	next = `${major}.${minor + 1}.0`;
} else if (bump === "patch") {
	next = `${major}.${minor}.${patch + 1}`;
} else if (/^\d+\.\d+\.\d+$/.test(bump)) {
	next = bump;
} else {
	console.error(`Invalid argument: ${bump}`);
	process.exit(1);
}

const nextVersionCode = appJson.expo.android.versionCode + 1;

appJson.expo.version = next;
appJson.expo.android.versionCode = nextVersionCode;
pkgJson.version = next;

writeFileSync(appJsonPath, `${JSON.stringify(appJson, null, "\t")}\n`);
writeFileSync(pkgJsonPath, `${JSON.stringify(pkgJson, null, "\t")}\n`);

console.log(`✓ ${current} → ${next} (versionCode ${nextVersionCode})`);
console.log("Running expo prebuild...");

const result = spawnSync("bunx", ["expo", "prebuild", "--platform", "android"], {
	stdio: "inherit",
	cwd: root,
});

if (result.status !== 0) {
	console.error("Prebuild failed.");
	process.exit(result.status ?? 1);
}

console.log("Done. Rebuild to apply: bun run android");
