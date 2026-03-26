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

// lucide-react-native 1.0.1 has broken exports pointing to non-existent files.
// Use resolveRequest (highest priority) instead of extraNodeModules so it isn't
// bypassed by the Reanimated metro wrapper.
const _resolveRequest = uniwindConfig.resolver.resolveRequest;
uniwindConfig.resolver.resolveRequest = (context, moduleName, platform) => {
	if (moduleName === "lucide-react-native") {
		return {
			filePath: path.resolve(
				monorepoRoot,
				"node_modules/lucide-react-native/dist/cjs/lucide-react-native/src/lucide-react-native.js",
			),
			type: "sourceFile",
		};
	}
	if (_resolveRequest) {
		return _resolveRequest(context, moduleName, platform);
	}
	return context.resolveRequest(context, moduleName, platform);
};

module.exports = uniwindConfig;
