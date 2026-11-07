// Release-build settings that prebuild would otherwise drop, since android/ is
// generated (not committed):
// - signs release builds with the keystore from the ANDROID_* env vars
//   (falls back to the debug keystore for local builds)
// - one APK per ABI plus a universal APK, for the ABIs in reactNativeArchitectures
// - Gradle properties: ABIs to build, R8 off, daemon heap
const {
	withAppBuildGradle,
	withGradleProperties,
} = require("expo/config-plugins");

const GRADLE_PROPERTIES = {
	// x86_64 is left out: it only serves emulators, and each ABI repeats the
	// whole native (CMake) build in the release workflow.
	reactNativeArchitectures: "armeabi-v7a,arm64-v8a",
	// R8 only runs in release builds, so turn it on in its own change and test
	// a release APK (op-sqlite, mmkv/nitro, ml-kit, tcp-socket, widgets).
	"android.enableMinifyInReleaseBuilds": "false",
	"org.gradle.jvmargs": "-Xmx4096m -XX:MaxMetaspaceSize=512m",
};

const RELEASE_SIGNING_CONFIG = `
        release {
            storeFile file(System.getenv("ANDROID_KEYSTORE_PATH") ?: 'debug.keystore')
            storePassword System.getenv("ANDROID_STORE_PASSWORD") ?: 'android'
            keyAlias System.getenv("ANDROID_KEY_ALIAS") ?: 'androiddebugkey'
            keyPassword System.getenv("ANDROID_KEY_PASSWORD") ?: 'android'
        }`;

const ABI_SPLITS = `
    splits {
        abi {
            enable true
            reset()
            include(*findProperty('reactNativeArchitectures').split(','))
            universalApk true
        }
    }`;

function replaceOnce(contents, search, replacement) {
	if (!contents.includes(search)) {
		throw new Error(
			`with-android-release: app/build.gradle no longer contains:\n${search}`,
		);
	}
	return contents.replace(search, replacement);
}

function withReleaseBuildGradle(config) {
	return withAppBuildGradle(config, (config) => {
		let contents = config.modResults.contents;
		if (contents.includes("signingConfigs.release")) return config;

		const debugSigningConfig = `            keyPassword 'android'
        }`;
		contents = replaceOnce(
			contents,
			debugSigningConfig,
			debugSigningConfig + RELEASE_SIGNING_CONFIG,
		);
		contents = replaceOnce(
			contents,
			`            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug`,
			"            signingConfig signingConfigs.release",
		);
		contents = replaceOnce(
			contents,
			"\n    packagingOptions {",
			`${ABI_SPLITS}\n    packagingOptions {`,
		);

		config.modResults.contents = contents;
		return config;
	});
}

function withReleaseGradleProperties(config) {
	return withGradleProperties(config, (config) => {
		for (const [key, value] of Object.entries(GRADLE_PROPERTIES)) {
			const existing = config.modResults.find(
				(item) => item.type === "property" && item.key === key,
			);
			if (existing) {
				existing.value = value;
			} else {
				config.modResults.push({ type: "property", key, value });
			}
		}
		return config;
	});
}

module.exports = (config) =>
	withReleaseGradleProperties(withReleaseBuildGradle(config));
