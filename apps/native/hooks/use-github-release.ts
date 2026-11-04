import { useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import * as Device from "expo-device";

interface GithubRelease {
	isUpToDate: boolean;
	version: string;
	downloadUrl: string;
	body: string | null;
}

/** Semver precedence: negative if a < b, positive if a > b, 0 if equal. */
function compareVersions(a: string, b: string): number {
	const [aBase, aPre] = a.split(/-(.*)/s);
	const [bBase, bPre] = b.split(/-(.*)/s);
	const aNums = aBase.split(".").map(Number);
	const bNums = bBase.split(".").map(Number);
	for (let i = 0; i < 3; i++) {
		const diff = (aNums[i] ?? 0) - (bNums[i] ?? 0);
		if (diff !== 0) return diff;
	}
	// A release (no suffix) ranks above its prereleases: 2.0.0 > 2.0.0-beta.1
	if (!aPre || !bPre) return (aPre ? -1 : 0) - (bPre ? -1 : 0);
	const aIds = aPre.split(".");
	const bIds = bPre.split(".");
	for (let i = 0; i < Math.max(aIds.length, bIds.length); i++) {
		if (aIds[i] === undefined) return -1;
		if (bIds[i] === undefined) return 1;
		const aNum = /^\d+$/.test(aIds[i]);
		const bNum = /^\d+$/.test(bIds[i]);
		if (aNum && bNum) {
			const diff = Number(aIds[i]) - Number(bIds[i]);
			if (diff !== 0) return diff;
		} else if (aNum !== bNum) {
			return aNum ? -1 : 1;
		} else if (aIds[i] !== bIds[i]) {
			return aIds[i] < bIds[i] ? -1 : 1;
		}
	}
	return 0;
}

export function useGithubRelease(repo: string, includePreRelease = false) {
	const currentVersion = Constants.expoConfig?.version;

	const { data, isFetching, isError, error, refetch } = useQuery<GithubRelease>(
		{
			queryKey: ["github-release", repo, includePreRelease],
			queryFn: async () => {
				const res = await fetch(
					`https://api.github.com/repos/${repo}/releases?per_page=20`,
				);
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const json = (await res.json()) as {
					tag_name: string;
					html_url: string;
					body: string | null;
					prerelease: boolean;
					assets: { name: string; browser_download_url: string }[];
				}[];

				// Pick the highest version rather than trusting the API order:
				// releases sharing a created_at come back in arbitrary order.
				const release = json
					.filter((r) => includePreRelease || !r.prerelease)
					.map((r) => ({ ...r, version: r.tag_name.replace(/^mobile\/v/, "") }))
					.sort((a, b) => compareVersions(b.version, a.version))[0];
				if (!release) throw new Error("No release found");

				const latestVersion = release.version;
				const supportedAbis = Device.supportedCpuArchitectures ?? [];
				const apkAsset =
					supportedAbis
						.map((abi) => release.assets.find((a) => a.name.includes(abi)))
						.find(Boolean) ??
					release.assets.find((a) => a.name.endsWith(".apk"));

				// If current version is unknown, assume up to date to avoid false positives
				const isUpToDate =
					!currentVersion ||
					compareVersions(latestVersion, currentVersion) <= 0;

				return {
					isUpToDate,
					version: latestVersion,
					downloadUrl: apkAsset?.browser_download_url ?? release.html_url,
					body: release.body ?? null,
				};
			},
			enabled: false,
			retry: false,
			staleTime: 5 * 60 * 1000, // 5 min — skip re-fetch if checked recently
		},
	);

	return { data, isFetching, isError, error, check: refetch };
}
