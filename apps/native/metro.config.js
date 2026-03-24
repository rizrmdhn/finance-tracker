const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");
const {
	wrapWithReanimatedMetroConfig,
} = require("react-native-reanimated/metro-config");

const monorepoRoot = path.resolve(__dirname, "../..");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Watch the entire monorepo so Metro picks up packages from root node_modules
config.watchFolders = [monorepoRoot];

// Resolve modules from both the app's and the monorepo root's node_modules
config.resolver.nodeModulesPaths = [
	path.resolve(__dirname, "node_modules"),
	path.resolve(monorepoRoot, "node_modules"),
];

const uniwindConfig = withUniwindConfig(wrapWithReanimatedMetroConfig(config), {
	cssEntryFile: "./global.css",
	dtsFile: "./uniwind-types.d.ts",
});

uniwindConfig.resolver.sourceExts.push("sql");

// lucide-react-native 1.0.1 has broken exports pointing to non-existent files
uniwindConfig.resolver.extraNodeModules = {
	...uniwindConfig.resolver.extraNodeModules,
	"lucide-react-native": path.resolve(
		monorepoRoot,
		"node_modules/lucide-react-native/dist/esm/lucide-react-native/src/lucide-react-native.js",
	),
};

module.exports = uniwindConfig;
