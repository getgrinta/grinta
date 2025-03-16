import { beforeEach, describe, expect, it, mock } from "bun:test";

import {
	parseCurrencyConversion,
	parseFraction,
	parseMathExpression,
	parseRelativeTime,
	parseTextMathExpression,
	parseUnitConversion,
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
				handler: COMMAND_HANDLER.COPY_TO_CLIPBOARD,
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
				handler: COMMAND_HANDLER.COPY_TO_CLIPBOARD,
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
				handler: COMMAND_HANDLER.COPY_TO_CLIPBOARD,
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
				handler: COMMAND_HANDLER.COPY_TO_CLIPBOARD,
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
				handler: COMMAND_HANDLER.COPY_TO_CLIPBOARD,
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
				handler: COMMAND_HANDLER.COPY_TO_CLIPBOARD,
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
				handler: COMMAND_HANDLER.COPY_TO_CLIPBOARD,
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
				handler: COMMAND_HANDLER.COPY_TO_CLIPBOARD,
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
				handler: COMMAND_HANDLER.COPY_TO_CLIPBOARD,
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
				handler: COMMAND_HANDLER.COPY_TO_CLIPBOARD,
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
				handler: COMMAND_HANDLER.COPY_TO_CLIPBOARD,
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
				handler: COMMAND_HANDLER.COPY_TO_CLIPBOARD,
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
				handler: COMMAND_HANDLER.COPY_TO_CLIPBOARD,
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
				handler: COMMAND_HANDLER.COPY_TO_CLIPBOARD,
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
				handler: COMMAND_HANDLER.COPY_TO_CLIPBOARD,
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
				handler: COMMAND_HANDLER.COPY_TO_CLIPBOARD,
				smartMatch: true,
			},
		]);
	});

	it("doesn't match plain numbers without operations", () => {
		const result = parseMathExpression("23412");
		expect(result).toEqual([]);
	});

	it("returns empty array for invalid expression", () => {
		const result = parseMathExpression("invalid");
		expect(result).toEqual([]);
	});
});

describe("parseRelativeTime", () => {
	it("handles future time", () => {
		const result = parseRelativeTime("2 days from now");
		expect(result[0].handler).toBe(COMMAND_HANDLER.COPY_TO_CLIPBOARD);
		expect(result[0].value).toBeDefined();
		expect(result[0].label).toBeDefined();
		expect(result[0].smartMatch).toBe(true);
	});

	it("handles 'after' keyword for future time", () => {
		const result = parseRelativeTime("2 days after easter");
		expect(result[0].handler).toBe(COMMAND_HANDLER.COPY_TO_CLIPBOARD);
		expect(result[0].value).toBeDefined();
		expect(result[0].label).toBeDefined();
		expect(result[0].smartMatch).toBe(true);
	});

	it("handles past time", () => {
		const result = parseRelativeTime("2 days ago");
		expect(result[0].handler).toBe(COMMAND_HANDLER.COPY_TO_CLIPBOARD);
		expect(result[0].value).toBeDefined();
		expect(result[0].label).toBeDefined();
		expect(result[0].smartMatch).toBe(true);
	});

	it("returns empty array for invalid time", () => {
		const result = parseRelativeTime("invalid time");
		expect(result).toEqual([]);
	});
});

describe("parseUnitConversion", () => {
	// Length conversions
	it("handles kilometers to miles conversion", () => {
		const result = parseUnitConversion("10 kilometers to miles");
		expect(result.length).toBeGreaterThan(0);

		if (result.length > 0) {
			expect(result[0].handler).toBe(COMMAND_HANDLER.COPY_TO_CLIPBOARD);
			expect(result[0].smartMatch).toBe(true);
			expect(result[0].value).toBeDefined();
			expect(result[0].label).toBeDefined();
		}
	});

	it("handles meters to feet conversion", () => {
		const result = parseUnitConversion("5 meters to feet");
		expect(result.length).toBeGreaterThan(0);
	});

	// Weight conversions
	it("handles kilograms to pounds conversion", () => {
		const result = parseUnitConversion("75 kilograms to pounds");
		expect(result.length).toBeGreaterThan(0);
	});

	it("handles pounds to kilograms conversion", () => {
		const result = parseUnitConversion("160 pounds to kilograms");
		expect(result.length).toBeGreaterThan(0);
	});

	// Temperature conversions
	it("handles celsius to fahrenheit conversion", () => {
		const result = parseUnitConversion("25 celsius to fahrenheit");
		expect(result.length).toBeGreaterThan(0);
	});

	it("handles fahrenheit to celsius conversion", () => {
		const result = parseUnitConversion("98.6 fahrenheit to celsius");
		expect(result.length).toBeGreaterThan(0);
	});

	// Volume conversions
	it("handles liters to gallons conversion", () => {
		const result = parseUnitConversion("5 liters to gallons");
		expect(result.length).toBeGreaterThan(0);
	});

	it("handles milliliters to ounces conversion", () => {
		const result = parseUnitConversion("500 milliliters to ounces");
		expect(result.length).toBeGreaterThan(0);
	});

	// Area conversions
	it("handles square meters to square feet conversion", () => {
		const result = parseUnitConversion("50 square meters to square feet");
		expect(result.length).toBeGreaterThan(0);
	});

	// Speed conversions
	it("handles kilometers per hour to miles per hour conversion", () => {
		const result = parseUnitConversion(
			"100 kilometers per hour to miles per hour",
		);
		expect(result.length).toBeGreaterThan(0);
	});

	// Digital conversions
	it("handles megabytes to gigabytes conversion", () => {
		const result = parseUnitConversion("1024 megabytes to gigabytes");
		expect(result.length).toBeGreaterThan(0);
	});

	// Edge cases and invalid inputs
	it("handles conversion with abbreviations", () => {
		const result = parseUnitConversion("10 km to mi");
		expect(result.length).toBeGreaterThan(0);
	});

	it("returns empty array for invalid unit conversion", () => {
		const result = parseUnitConversion("convert something invalid");
		expect(result).toEqual([]);
	});

	it("returns empty array for unsupported unit conversion", () => {
		const result = parseUnitConversion("10 lightyears to parsecs");
		expect(result).toEqual([]);
	});

	it("handles temperature without space format (10c to f)", () => {
		const result = parseUnitConversion("10c to f");
		expect(result.length).toBeGreaterThan(0);
		expect(Number(result[0].value)).toBeCloseTo(50, 0); // 10°C is approximately 50°F
	});

	it("handles temperature without space format (100f to c)", () => {
		const result = parseUnitConversion("100f to c");
		expect(result.length).toBeGreaterThan(0);
		expect(Number(result[0].value)).toBeCloseTo(37.8, 1); // 100°F is approximately 37.8°C
	});

	it("handles length without space format (5in to cm)", () => {
		const result = parseUnitConversion("5in to cm");
		expect(result.length).toBeGreaterThan(0);
		expect(Number(result[0].value)).toBeCloseTo(12.7, 1); // 5 inches is approximately 12.7 cm
	});

	it("handles weight without space format (10lb to kg)", () => {
		const result = parseUnitConversion("10lb to kg");
		expect(result.length).toBeGreaterThan(0);
		expect(Number(result[0].value)).toBeCloseTo(4.54, 1); // 10 pounds is approximately 4.54 kg
	});

	it("handles temperature without space format with degree symbol (30°c to f)", () => {
		const result = parseUnitConversion("30°c to f");
		expect(result.length).toBeGreaterThan(0);
		expect(Number(result[0].value)).toBeCloseTo(86, 0); // 30°C is approximately 86°F
	});

	it("handles temperature without space format with degree symbol before letter (30°c to °f)", () => {
		const result = parseUnitConversion("30°c to °f");
		expect(result.length).toBeGreaterThan(0);
		expect(Number(result[0].value)).toBeCloseTo(86, 0); // 30°C is approximately 86°F
	});

	it("handles feet format with apostrophe (5' to cm)", () => {
		const result = parseUnitConversion("5' to cm");
		expect(result.length).toBeGreaterThan(0);
		expect(Number(result[0].value)).toBeCloseTo(152.4, 0); // 5 feet is approximately 152.4 cm
	});

	it("handles feet format with macOS right single quotation mark (5' to cm)", () => {
		// Create the input with explicit U+2019 right single quotation mark
		const macOsApostrophe = String.fromCodePoint(0x2019);
		const macOsInput = `5${macOsApostrophe} to cm`;

		const result = parseUnitConversion(macOsInput);
		expect(result.length).toBeGreaterThan(0);
		expect(Number(result[0].value)).toBeCloseTo(152.4, 0); // 5 feet is approximately 152.4 cm
	});

	it('handles inches format with quote (10" to cm)', () => {
		const result = parseUnitConversion('10" to cm');
		expect(result.length).toBeGreaterThan(0);
		expect(Number(result[0].value)).toBeCloseTo(25.4, 0); // 10 inches is approximately 25.4 cm
	});

	it("handles combined feet and inches (5'10\" to cm)", () => {
		const result = parseUnitConversion("5'10\" to cm");
		expect(result.length).toBeGreaterThan(0);
		expect(Number(result[0].value)).toBeCloseTo(177.8, 0); // 5'10" is approximately 177.8 cm
	});

	it("handles combined feet and inches (6'2\" to m)", () => {
		const result = parseUnitConversion("6'2\" to m");
		expect(result.length).toBeGreaterThan(0);
		expect(Number(result[0].value)).toBeCloseTo(1.88, 2); // 6'2" is approximately 1.88 meters
	});

	it("handles combined feet and inches with macOS right single quotation mark (5'10\" to cm)", () => {
		// Create the input with explicit U+2019 right single quotation mark
		const macOsApostrophe = String.fromCodePoint(0x2019);
		const macOsInput = `5${macOsApostrophe}10" to cm`;

		const result = parseUnitConversion(macOsInput);
		expect(result.length).toBeGreaterThan(0);
		expect(Number(result[0].value)).toBeCloseTo(177.8, 0); // 5'10" is approximately 177.8 cm
	});

	// Tests for automatic conversion suggestions
	describe("automatic conversion suggestions", () => {
		it("suggests kg when lbs is entered", () => {
			const result = parseUnitConversion("57lbs");
			expect(result.length).toBeGreaterThan(0);
			expect(result[0].label).toContain("kilograms");
			expect(Number(result[0].value)).toBeCloseTo(25.85, 1); // 57 pounds is approximately 25.85 kg
		});

		it("suggests lbs when kg is entered", () => {
			const result = parseUnitConversion("25kg");
			expect(result.length).toBeGreaterThan(0);
			expect(result[0].label).toContain("pounds");
			expect(Number(result[0].value)).toBeCloseTo(55.12, 1); // 25 kg is approximately 55.12 lbs
		});

		it("suggests miles when km is entered", () => {
			const result = parseUnitConversion("10km");
			expect(result.length).toBeGreaterThan(0);
			expect(result[0].label).toContain("miles");
			expect(Number(result[0].value)).toBeCloseTo(6.21, 1); // 10 km is approximately 6.21 miles
		});

		it("suggests kilometers when miles is entered", () => {
			const result = parseUnitConversion("5miles");
			expect(result.length).toBeGreaterThan(0);
			expect(result[0].label).toContain("kilometers");
			expect(Number(result[0].value)).toBeCloseTo(8.05, 1); // 5 miles is approximately 8.05 km
		});

		it("suggests feet when meters is entered", () => {
			const result = parseUnitConversion("2m");
			expect(result.length).toBeGreaterThan(0);
			expect(result[0].label).toContain("feet");
			expect(Number(result[0].value)).toBeCloseTo(6.56, 1); // 2 meters is approximately 6.56 feet
		});

		it("suggests fahrenheit when celsius is entered", () => {
			const result = parseUnitConversion("20c");
			expect(result.length).toBeGreaterThan(0);
			expect(result[0].label).toContain("fahrenheit");
			expect(Number(result[0].value)).toBeCloseTo(68, 0); // 20°C is approximately 68°F
		});

		it("suggests celsius when fahrenheit is entered", () => {
			const result = parseUnitConversion("68f");
			expect(result.length).toBeGreaterThan(0);
			expect(result[0].label).toContain("celsius");
			expect(Number(result[0].value)).toBeCloseTo(20, 0); // 68°F is approximately 20°C
		});

		it("suggests gallons when liters is entered", () => {
			const result = parseUnitConversion("5liters");
			expect(result.length).toBeGreaterThan(0);
			expect(result[0].label).toContain("gallons");
			expect(Number(result[0].value)).toBeCloseTo(1.32, 1); // 5 liters is approximately 1.32 gallons
		});
	});
});

describe("parseCurrencyConversion", () => {
	// Mock the settingsStore
	beforeEach(() => {
		// Mock the settingsStore
		mock.module("./store/settings.svelte", () => {
			return {
				settingsStore: {
					data: {
						baseCurrency: "usd",
					},
				},
			};
		});
	});

	// Mock the getApiClient function from utils.svelte.ts
	const mockApiGet = mock(async ({ param }: { param: { ticker: string } }) => {
		// This mimics the format seen in the data.router.ts
		// format is like {"1inch":1.33103711,"aave":0.0015770061,"ada":0.35355113}
		const currencyMappings: Record<string, Record<string, number>> = {
			// Mock data for Polish Zloty (PLN)
			pln: {
				usd: 0.25,
				eur: 0.23,
				gbp: 0.2,
				jpy: 38.5,
				cad: 0.34,
				aud: 0.38,
				chf: 0.22,
				cny: 1.82,
				inr: 20.8,
			},
			// Mock data for US Dollar (USD)
			usd: {
				pln: 4.0,
				eur: 0.92, // Important: Needed for the "100usd" single currency test case
				gbp: 0.8,
				jpy: 154.0,
				cad: 1.36,
				aud: 1.52,
				chf: 0.88,
				cny: 7.25,
				inr: 83.12,
			},
			// Mock data for Euro (EUR)
			eur: {
				usd: 1.09,
				pln: 4.35,
				gbp: 0.87,
				jpy: 168.0,
				cad: 1.47,
				aud: 1.65,
				chf: 0.96,
				cny: 7.9,
				inr: 90.42,
			},
			// Mock data for British Pound (GBP)
			gbp: {
				usd: 1.25,
				pln: 5.0,
				eur: 1.15,
				jpy: 192.5,
				cad: 1.7,
				aud: 1.9,
				chf: 1.1,
				cny: 9.06,
				inr: 103.9,
			},
		};

		// Get the ticker from the parameters
		const ticker = param.ticker.toLowerCase();

		// Create the response JSON method
		const json = async () => {
			return currencyMappings[ticker] || {};
		};

		// Return a fake response object with a json method
		return {
			json,
		};
	});

	// Mock the getApiClient function to return a client with the mocked $get method
	mock.module("./utils.svelte", () => {
		return {
			// Keep original exports that might be used
			getApiClient: () => ({
				api: {
					data: {
						currency: {
							":ticker": {
								$get: mockApiGet,
							},
						},
					},
				},
			}),
			// Make sure formatCurrency is also exported since it's used
			formatCurrency: (amount: number, currency: string) => {
				const symbols: Record<string, string> = {
					usd: "$",
					eur: "€",
					gbp: "£",
					jpy: "¥",
					pln: "zł",
					cad: "C$",
					aud: "A$",
					chf: "CHF",
					cny: "¥",
					inr: "₹",
				};
				// Simple formatting for tests
				return `${symbols[currency] || ""}${amount.toFixed(2)}`;
			},
		};
	});

	// Basic currency conversion tests
	it("handles basic currency conversion format", async () => {
		const result = await parseCurrencyConversion("10 pln to usd");
		expect(result.length).toBeGreaterThan(0);
		expect(result[0].handler).toBe(COMMAND_HANDLER.COPY_TO_CLIPBOARD);
		expect(result[0].label).toContain("$");
		expect(result[0].smartMatch).toBe(true);
	});

	it("handles currency conversion without spaces", async () => {
		const result = await parseCurrencyConversion("50eur to jpy");
		expect(result.length).toBeGreaterThan(0);
	});

	it("handles currency conversion without 'to'", async () => {
		const result = await parseCurrencyConversion("25 pln usd");
		expect(result.length).toBeGreaterThan(0);
	});

	it("handles single currency input with automatic target selection", async () => {
		// For USD as input, the target should be EUR according to the code logic
		// Temporarily change the baseCurrency in the mock
		mock.module("./store/settings.svelte", () => {
			return {
				settingsStore: {
					data: {
						baseCurrency: "eur", // EUR is the default for USD inputs
					},
				},
			};
		});

		const result = await parseCurrencyConversion("100usd");
		expect(result.length).toBeGreaterThan(0);

		// Reset back to USD for other tests
		mock.module("./store/settings.svelte", () => {
			return {
				settingsStore: {
					data: {
						baseCurrency: "usd",
					},
				},
			};
		});
	});

	it("handles non-USD single currency input with USD as default target", async () => {
		const result = await parseCurrencyConversion("200 pln");
		expect(result.length).toBeGreaterThan(0);
	});

	it("returns empty array for invalid currency input", async () => {
		const result = await parseCurrencyConversion("invalid currency");
		expect(result).toEqual([]);
	});

	it("handles decimal values in currency conversion", async () => {
		const result = await parseCurrencyConversion("123.45 gbp to cad");
		expect(result.length).toBeGreaterThan(0);
	});
});
