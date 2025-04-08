import { describe, expect, it, mock } from "bun:test";

import {
	parseCurrencyConversion,
	parseFraction,
	parseMathExpression,
	parseRelativeTime,
	parseTextMathExpression,
	parseUnitConversion,
} from "./nlp";
import { COMMAND_HANDLER, APP_MODE, SettingsSchema } from "@getgrinta/core";
import { PluginContext } from "@getgrinta/plugin";

function createContextMock(): PluginContext {
    const fetchMock = mock();
    const execMock = mock();
    const tMock = mock();
    const failMock = mock()
    return {
        fetch: fetchMock,
        exec: execMock,
        t: tMock,
        fail: failMock,
        app: {
            query: "",
            appMode: APP_MODE.INITIAL,
        },
        settings: SettingsSchema.parse({}),
        notes: [],
    };
}

describe("parseTextMathExpression", () => {
	// Basic operations
	it("handles simple addition", () => {
		const result = parseTextMathExpression("one plus one");
		expect(result[0].value).toEqual("2");
	});

	it("handles chained addition", () => {
		const result = parseTextMathExpression("one plus one plus one");
		expect(result[0].value).toEqual("3");
	});

	it("handles multiplication", () => {
		const result = parseTextMathExpression("five times five times two");
		expect(result[0].value).toEqual("50");
	});

	it("handles division", () => {
		const result = parseTextMathExpression("ten divided by two");
		expect(result[0].value).toEqual("5");
	});

	it("handles subtraction", () => {
		const result = parseTextMathExpression("ten minus three");
		expect(result[0].value).toEqual("7");
	});

	// Special cases
	it("handles square root", () => {
		const result = parseTextMathExpression("square root of sixteen");
		expect(result[0].value).toEqual("4");
	});

	it("handles complex math expressions with functions", () => {
		const result = parseTextMathExpression(
			"square root of ten times log seven",
		);
		expect(result[0].value).toEqual("2.67");
	});

	// Special cases
	it("handles square root", () => {
		const result = parseTextMathExpression("square root of sixteen");
		expect(result[0].value).toEqual("4");
	});

	it("handles complex math expressions with functions", () => {
		const result = parseTextMathExpression(
			"square root of ten times log seven",
		);
		expect(result[0].value).toEqual("2.67");
	});

	it("handles percentage", () => {
		const result = parseTextMathExpression("fifty percent of one hundred");
		expect(result[0].value).toEqual("50");
	});

	it("handles squared numbers", () => {
		const result = parseTextMathExpression("five squared");
		expect(result[0].value).toEqual("25");
	});

	it("handles cubed numbers", () => {
		const result = parseTextMathExpression("three cubed");
		expect(result[0].value).toEqual("27");
	});

	it("handles factorial", () => {
		const result = parseTextMathExpression("four factorial");
		expect(result[0].value).toEqual("24");
	});

	it("handles complex expressions with factorial, square root and log", () => {
		const result = parseTextMathExpression(
			"eight factorial times square root of five times log seven",
		);
		expect(result[0].value).toEqual("76192.57");
	});

	it("handles complex expressions with factorial, square root and log in different order", () => {
		const result = parseTextMathExpression(
			"square root of five times log seven times eight factorial",
		);
		expect(result[0].value).toEqual("76192.57");
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
		expect(result[0].value).toEqual("0.5");
	});

	it("handles fraction of number", () => {
		const result = parseFraction("two thirds of ninety");
		expect(result[0].value).toEqual("60");
	});

	it("returns empty array for invalid fraction", () => {
		const result = parseFraction("invalid fraction");
		expect(result).toEqual([]);
	});
});

describe("parseMathExpression", () => {
	it("handles numeric expressions", () => {
		const result = parseMathExpression("1 + 1");
		expect(result[0].value).toEqual("2");
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
			expect(Number(result[0].value)).toBeCloseTo(25.85, 1); // 57 pounds is approximately 25.85 kg
		});

		it("suggests lbs when kg is entered", () => {
			const result = parseUnitConversion("25kg");
			expect(result.length).toBeGreaterThan(0);
			expect(Number(result[0].value)).toBeCloseTo(55.12, 1); // 25 kg is approximately 55.12 lbs
		});

		it("suggests miles when km is entered", () => {
			const result = parseUnitConversion("10km");
			expect(result.length).toBeGreaterThan(0);
			expect(Number(result[0].value)).toBeCloseTo(6.21, 1); // 10 km is approximately 6.21 miles
		});

		it("suggests kilometers when miles is entered", () => {
			const result = parseUnitConversion("5miles");
			expect(result.length).toBeGreaterThan(0);
			expect(Number(result[0].value)).toBeCloseTo(8.05, 1); // 5 miles is approximately 8.05 km
		});

		it("suggests feet when meters is entered", () => {
			const result = parseUnitConversion("2m");
			expect(result.length).toBeGreaterThan(0);
			expect(Number(result[0].value)).toBeCloseTo(6.56, 1); // 2 meters is approximately 6.56 feet
		});

		it("suggests fahrenheit when celsius is entered", () => {
			const result = parseUnitConversion("20c");
			expect(result.length).toBeGreaterThan(0);
			expect(Number(result[0].value)).toBeCloseTo(68, 0); // 20°C is approximately 68°F
		});

		it("suggests celsius when fahrenheit is entered", () => {
			const result = parseUnitConversion("68f");
			expect(result.length).toBeGreaterThan(0);
			expect(Number(result[0].value)).toBeCloseTo(20, 0); // 68°F is approximately 20°C
		});

		it("suggests gallons when liters is entered", () => {
			const result = parseUnitConversion("5liters");
			expect(result.length).toBeGreaterThan(0);
			expect(Number(result[0].value)).toBeCloseTo(1.32, 1); // 5 liters is approximately 1.32 gallons
		});
	});
});

describe.skip("parseCurrencyConversion", () => {
	// Basic currency conversion tests
	it("handles basic currency conversion format", async () => {
		const result = await parseCurrencyConversion("10 pln to usd", createContextMock());
		expect(result.length).toBeGreaterThan(0);
		expect(result[0].handler).toBe(COMMAND_HANDLER.COPY_TO_CLIPBOARD);
		expect(result[0].smartMatch).toBe(true);
	});

	it("handles currency conversion without spaces", async () => {
		const result = await parseCurrencyConversion("50eur to jpy", createContextMock());
		expect(result.length).toBeGreaterThan(0);
	});

	it("handles currency conversion without 'to'", async () => {
		const result = await parseCurrencyConversion("25 pln usd", createContextMock());
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

		const result = await parseCurrencyConversion("100usd", createContextMock());
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
		const result = await parseCurrencyConversion("200 pln", createContextMock());
		expect(result.length).toBeGreaterThan(0);
	});

	it("returns empty array for invalid currency input", async () => {
		const result = await parseCurrencyConversion("invalid currency", createContextMock());
		expect(result).toEqual([]);
	});

	it("handles decimal values in currency conversion", async () => {
		const result = await parseCurrencyConversion("123.45 gbp to cad", createContextMock());
		expect(result.length).toBeGreaterThan(0);
	});
});
