import { useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";

interface GithubRelease {
	isUpToDate: boolean;
	version: string;
	downloadUrl: string;
	body: string | null;
}

function isNewerVersion(latest: string, current: string): boolean {
	const parse = (v: string) => v.split(".").map(Number);
	const [lMaj, lMin, lPat] = parse(latest);
	const [cMaj, cMin, cPat] = parse(current);
	if (lMaj !== cMaj) return lMaj > cMaj;
	if (lMin !== cMin) return lMin > cMin;
	return lPat > cPat;
}

export function useGithubRelease(repo: string) {
	const currentVersion = Constants.expoConfig?.version;

	const { data, isFetching, isError, error, refetch } = useQuery<GithubRelease>(
		{
			queryKey: ["github-release", repo],
			queryFn: async () => {
				const res = await fetch(
					`https://api.github.com/repos/${repo}/releases?per_page=20`,
				);
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const json = (await res.json()) as {
					tag_name: string;
					html_url: string;
					body: string | null;
					assets: { name: string; browser_download_url: string }[];
				}[];

				const release = json[0];
				if (!release) throw new Error("No release found");

				const latestVersion = release.tag_name.replace(/^mobile\/v/, "");
				const apkAsset =
					release.assets.find((a) => a.name.includes("arm64-v8a")) ??
					release.assets.find((a) => a.name.endsWith(".apk"));

				// If current version is unknown, assume up to date to avoid false positives
				const isUpToDate =
					!currentVersion || !isNewerVersion(latestVersion, currentVersion);

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
