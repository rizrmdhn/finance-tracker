declare module "react-native-zeroconf" {
	interface ZeroconfService {
		host: string;
		addresses: string[];
		port: number;
		name: string;
		fullName: string;
		txt: Record<string, string>;
	}

	class Zeroconf {
		scan(type: string, protocol: string, domain: string): void;
		stop(): void;
		publishService(
			type: string,
			protocol: string,
			domain: string,
			name: string,
			port: number,
			txt: Record<string, string>,
		): void;
		unpublishService(name: string): void;
		on(event: "start", listener: () => void): this;
		on(event: "stop", listener: () => void): this;
		on(event: "found", listener: (name: string) => void): this;
		on(event: "resolved", listener: (service: ZeroconfService) => void): this;
		on(event: "removed", listener: (service: ZeroconfService) => void): this;
		on(event: "error", listener: (err: Error) => void): this;
		off(event: string, listener: (...args: unknown[]) => void): this;
		removeAllListeners(): void;
	}

	export default Zeroconf;
}
