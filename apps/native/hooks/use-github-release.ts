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
					`https://api.github.com/repos/${repo}/releases/latest`,
				);
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const json = await res.json();

				const latestVersion = (json.tag_name as string)?.replace(/^v/, "");
				const apkAsset = (
					json.assets as { name: string; browser_download_url: string }[]
				)?.find((a) => a.name.endsWith(".apk"));

				// If current version is unknown, assume up to date to avoid false positives
				const isUpToDate =
					!currentVersion || !isNewerVersion(latestVersion, currentVersion);

				return {
					isUpToDate,
					version: json.tag_name as string,
					downloadUrl:
						apkAsset?.browser_download_url ?? (json.html_url as string),
					body: (json.body as string) ?? null,
				};
			},
			enabled: false,
			retry: false,
			staleTime: 5 * 60 * 1000, // 5 min — skip re-fetch if checked recently
		},
	);

	return { data, isFetching, isError, error, check: refetch };
}
