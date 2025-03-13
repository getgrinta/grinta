import { describe, expect, it } from "vitest";
import {
	parseFraction,
	parseMathExpression,
	parseRelativeTime,
	parseTextMathExpression,
} from "./formula-commands";
import { COMMAND_HANDLER } from "./store/commands.svelte";

describe("parseTextMathExpression", () => {
	// Basic operations
	it("handles simple addition", () => {
		const result = parseTextMathExpression("one plus one");
		expect(result).toEqual([
			{
				label: "2",
				value: "2",
				handler: COMMAND_HANDLER.FORMULA_RESULT,
				smartMatch: true,
			},
		]);
	});

	it("handles chained addition", () => {
		const result = parseTextMathExpression("one plus one plus one");
		expect(result).toEqual([
			{
				label: "3",
				value: "3",
				handler: COMMAND_HANDLER.FORMULA_RESULT,
				smartMatch: true,
			},
		]);
	});

	it("handles multiplication", () => {
		const result = parseTextMathExpression("five times five times two");
		expect(result).toEqual([
			{
				label: "50",
				value: "50",
				handler: COMMAND_HANDLER.FORMULA_RESULT,
				smartMatch: true,
			},
		]);
	});

	it("handles division", () => {
		const result = parseTextMathExpression("ten divided by two");
		expect(result).toEqual([
			{
				label: "5",
				value: "5",
				handler: COMMAND_HANDLER.FORMULA_RESULT,
				smartMatch: true,
			},
		]);
	});

	it("handles subtraction", () => {
		const result = parseTextMathExpression("ten minus three");
		expect(result).toEqual([
			{
				label: "7",
				value: "7",
				handler: COMMAND_HANDLER.FORMULA_RESULT,
				smartMatch: true,
			},
		]);
	});

	// Special cases
	it("handles square root", () => {
		const result = parseTextMathExpression("square root of sixteen");
		expect(result).toEqual([
			{
				label: "4",
				value: "4",
				handler: COMMAND_HANDLER.FORMULA_RESULT,
				smartMatch: true,
			},
		]);
	});

	it("handles complex math expressions with functions", () => {
		const result = parseTextMathExpression(
			"square root of ten times log seven",
		);
		expect(result).toEqual([
			{
				label: "2.67",
				value: "2.67",
				handler: COMMAND_HANDLER.FORMULA_RESULT,
				smartMatch: true,
			},
		]);
	});

	it("handles percentage", () => {
		const result = parseTextMathExpression("fifty percent of one hundred");
		expect(result).toEqual([
			{
				label: "50",
				value: "50",
				handler: COMMAND_HANDLER.FORMULA_RESULT,
				smartMatch: true,
			},
		]);
	});

	it("handles squared numbers", () => {
		const result = parseTextMathExpression("five squared");
		expect(result).toEqual([
			{
				label: "25",
				value: "25",
				handler: COMMAND_HANDLER.FORMULA_RESULT,
				smartMatch: true,
			},
		]);
	});

	it("handles cubed numbers", () => {
		const result = parseTextMathExpression("three cubed");
		expect(result).toEqual([
			{
				label: "27",
				value: "27",
				handler: COMMAND_HANDLER.FORMULA_RESULT,
				smartMatch: true,
			},
		]);
	});

	it("handles factorial", () => {
		const result = parseTextMathExpression("four factorial");
		expect(result).toEqual([
			{
				label: "24",
				value: "24",
				handler: COMMAND_HANDLER.FORMULA_RESULT,
				smartMatch: true,
			},
		]);
	});

	it("handles complex expressions with factorial, square root and log", () => {
		const result = parseTextMathExpression(
			"eight factorial times square root of five times log seven",
		);
		expect(result).toEqual([
			{
				label: "76192.57",
				value: "76192.57",
				handler: COMMAND_HANDLER.FORMULA_RESULT,
				smartMatch: true,
			},
		]);
	});

	it("handles complex expressions with factorial, square root and log in different order", () => {
		const result = parseTextMathExpression(
			"square root of five times log seven times eight factorial",
		);
		expect(result).toEqual([
			{
				label: "76192.57",
				value: "76192.57",
				handler: COMMAND_HANDLER.FORMULA_RESULT,
				smartMatch: true,
			},
		]);
	});

	// Edge cases
	it("returns empty array for invalid input", () => {
		const result = parseTextMathExpression("invalid input");
		expect(result).toEqual([]);
	});

	it("handles division by zero", () => {
		const result = parseTextMathExpression("ten divided by zero");
		expect(result).toEqual([]);
	});

	it("handles negative square root", () => {
		const result = parseTextMathExpression("square root of negative one");
		expect(result).toEqual([]);
	});
});

describe("parseFraction", () => {
	it("handles basic fractions", () => {
		const result = parseFraction("one half");
		expect(result).toEqual([
			{
				label: "0.5",
				value: "0.5",
				handler: COMMAND_HANDLER.FORMULA_RESULT,
				smartMatch: true,
			},
		]);
	});

	it("handles fraction of number", () => {
		const result = parseFraction("two thirds of ninety");
		expect(result).toEqual([
			{
				label: "60",
				value: "60",
				handler: COMMAND_HANDLER.FORMULA_RESULT,
				smartMatch: true,
			},
		]);
	});

	it("returns empty array for invalid fraction", () => {
		const result = parseFraction("invalid fraction");
		expect(result).toEqual([]);
	});
});

describe("parseMathExpression", () => {
	it("handles numeric expressions", () => {
		const result = parseMathExpression("1 + 1");
		expect(result).toEqual([
			{
				label: "2",
				value: "2",
				handler: COMMAND_HANDLER.FORMULA_RESULT,
				smartMatch: true,
			},
		]);
	});

	it("returns empty array for invalid expression", () => {
		const result = parseMathExpression("invalid");
		expect(result).toEqual([]);
	});
});

describe("parseRelativeTime", () => {
	it("handles future time", () => {
		const result = parseRelativeTime("2 days from now");
		expect(result[0].handler).toBe(COMMAND_HANDLER.FORMULA_RESULT);
		expect(result[0].value).toBeDefined();
		expect(result[0].label).toBeDefined();
		expect(result[0].smartMatch).toBe(true);
	});

	it("handles 'after' keyword for future time", () => {
		const result = parseRelativeTime("2 days after easter");
		expect(result[0].handler).toBe(COMMAND_HANDLER.FORMULA_RESULT);
		expect(result[0].value).toBeDefined();
		expect(result[0].label).toBeDefined();
		expect(result[0].smartMatch).toBe(true);
	});

	it("handles past time", () => {
		const result = parseRelativeTime("2 days ago");
		expect(result[0].handler).toBe(COMMAND_HANDLER.FORMULA_RESULT);
		expect(result[0].value).toBeDefined();
		expect(result[0].label).toBeDefined();
		expect(result[0].smartMatch).toBe(true);
	});

	it("returns empty array for invalid time", () => {
		const result = parseRelativeTime("invalid time");
		expect(result).toEqual([]);
	});
});
