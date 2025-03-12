import { describe, expect, test } from "bun:test";
import { generateCancellationToken, highlightText } from "./utils.svelte";

describe.skip("highlightText", () => {
	test("returns full text as non-highlighted when search is empty", () => {
		const result = highlightText("Hello World", "");
		expect(result).toEqual([{ text: "Hello World", highlight: false }]);
	});

	test("highlights exact matches case-insensitively", () => {
		const result = highlightText("Hello World", "hello");
		expect(result).toEqual([
			{ text: "Hello", highlight: true },
			{ text: " World", highlight: false },
		]);
	});

	test("highlights multiple occurrences", () => {
		const result = highlightText("hello hello world", "hello");
		expect(result).toEqual([
			{ text: "hello", highlight: true },
			{ text: " ", highlight: false },
			{ text: "hello", highlight: true },
			{ text: " world", highlight: false },
		]);
	});

	test("handles special regex characters in search term", () => {
		const result = highlightText("hello (world)", "(world)");
		expect(result).toEqual([
			{ text: "hello ", highlight: false },
			{ text: "(world)", highlight: true },
		]);
	});
});

describe("generateCancellationToken", () => {
	test("generates a string of expected length", () => {
		const token = generateCancellationToken();
		expect(typeof token).toBe("string");
		expect(token.length).toBe(10);
	});

	test("generates unique tokens", () => {
		const token1 = generateCancellationToken();
		const token2 = generateCancellationToken();
		expect(token1).not.toBe(token2);
	});
});
