import { afterEach, describe, expect, mock, test } from "bun:test";
import { fetchExchangeRateHistory } from "./exchange-rate";

const realFetch = globalThis.fetch;

function mockFetch(response: Response) {
	const fn = mock(async (_url: string) => response);
	globalThis.fetch = fn as unknown as typeof fetch;
	return fn;
}

afterEach(() => {
	globalThis.fetch = realFetch;
});

describe("fetchExchangeRateHistory", () => {
	test("requests EUR-based rates for every other currency over the range", async () => {
		const fn = mockFetch(Response.json([]));

		await fetchExchangeRateHistory({ from: "2026-05-01", to: "2026-05-10" });

		const url = new URL(fn.mock.calls[0]?.[0] ?? "");
		expect(url.origin + url.pathname).toBe(
			"https://api.frankfurter.dev/v2/rates",
		);
		expect(url.searchParams.get("base")).toBe("EUR");
		expect(url.searchParams.get("quotes")).toBe("IDR,USD,SGD,MYR,GBP,JPY,AUD");
		expect(url.searchParams.get("from")).toBe("2026-05-01");
		expect(url.searchParams.get("to")).toBe("2026-05-10");
	});

	test("maps each row to target, date and rate", async () => {
		mockFetch(
			Response.json([
				{ date: "2026-05-01", base: "EUR", quote: "USD", rate: 1.13 },
				{ date: "2026-05-01", base: "EUR", quote: "IDR", rate: 18_700 },
				{ date: "2026-05-04", base: "EUR", quote: "USD", rate: 1.12 },
			]),
		);

		expect(
			await fetchExchangeRateHistory({ from: "2026-05-01", to: "2026-05-04" }),
		).toEqual([
			{ target: "USD", date: "2026-05-01", rate: 1.13 },
			{ target: "IDR", date: "2026-05-01", rate: 18_700 },
			{ target: "USD", date: "2026-05-04", rate: 1.12 },
		]);
	});

	test("throws on a non-OK response", async () => {
		mockFetch(new Response("error", { status: 503 }));

		await expect(
			fetchExchangeRateHistory({ from: "2026-05-01", to: "2026-05-04" }),
		).rejects.toThrow("503");
	});
});
