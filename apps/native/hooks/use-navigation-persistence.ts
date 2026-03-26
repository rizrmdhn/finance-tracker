import { router, usePathname } from "expo-router";
import { useEffect, useRef } from "react";
import { createMMKV } from "react-native-mmkv";

const STORAGE_KEY = "dev:pathname";
const storage = __DEV__ ? createMMKV({ id: "nav-persistence" }) : null;

export function useNavigationPersistence() {
	const pathname = usePathname();
	const hasRestored = useRef(false);

	// Restore once on mount
	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(() => {
		if (!__DEV__ || !storage || hasRestored.current) return;
		hasRestored.current = true;

		const saved = storage.getString(STORAGE_KEY);
		if (saved && saved !== pathname) {
			router.replace(saved as never);
		}
	}, [pathname]);

	// Save on every navigation
	useEffect(() => {
		if (!__DEV__ || !storage) return;
		storage.set(STORAGE_KEY, pathname);
	}, [pathname]);
}
