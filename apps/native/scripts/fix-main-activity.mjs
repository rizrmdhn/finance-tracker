import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const filePath = resolve(
	import.meta.dirname,
	"../android/app/src/main/java/com/rizrmdhn/finance_tracker/MainActivity.kt",
);

let content;
try {
	content = readFileSync(filePath, "utf8");
} catch {
	// android directory doesn't exist yet, nothing to fix
	process.exit(0);
}

const lines = content.split("\n");
const packageIndex = lines.findIndex((l) => l.startsWith("package "));

// Already correct or no package declaration found
if (packageIndex <= 0) process.exit(0);

// Move package declaration to the top
const packageLine = lines.splice(packageIndex, 1)[0];
lines.unshift(packageLine);

// Remove any blank lines that ended up at the top after the package line
while (lines[1] === "") lines.splice(1, 1);

writeFileSync(filePath, lines.join("\n"), "utf8");
console.log("✓ Fixed MainActivity.kt import order");
