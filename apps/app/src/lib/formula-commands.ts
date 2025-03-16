// Cursor: Do not include original expressions in the label ffs.
import nlp from "compromise";
import convert from "convert";
import dayjs from "dayjs";
import { parse } from "equation-parser";
import { resolve } from "equation-resolver";
import { match } from "ts-pattern";
import {
	COMMAND_HANDLER,
	type ExecutableCommand,
} from "./store/commands.svelte";
import { settingsStore } from "./store/settings.svelte";
import { formatCurrency, getApiClient } from "./utils.svelte";

type TimeUnit =
	| "minute"
	| "minutes"
	| "hour"
	| "hours"
	| "day"
	| "days"
	| "week"
	| "weeks"
	| "month"
	| "months"
	| "year"
	| "years";

export function parseMathExpression(query: string): ExecutableCommand[] {
	// Check if the query is just a simple number without operations
	if (/^\d+(\.\d+)?$/.test(query.trim())) {
		return [];
	}

	const parsed = parse(query);
	const resolved = resolve(parsed);
	if (resolved.type === "number") {
		const value = resolved.value.toString();
		return [
			{
				label: value,
				value,
				handler: COMMAND_HANDLER.COPY_TO_CLIPBOARD,
				smartMatch: true,
			},
		];
	}
	return [];
}

export function parseTextMathExpression(query: string): ExecutableCommand[] {
	const doc = nlp(query.toLowerCase());

	// Try to match complex expressions with factorial, square root and log in any order
	const complexMatch = doc.match(
		"((square root|sqrt) of [<sqrtNumber>#Value+] (times|multiply by|multiplied by) log [<logNumber>#Value+] (times|multiply by|multiplied by) [<factNumber>#Value+] factorial)|([<firstNumber>#Value+] factorial (times|multiply by|multiplied by) (square root|sqrt) of [<sqrtNumber>#Value+] (times|multiply by|multiplied by) log [<logNumber>#Value+])",
	);

	if (complexMatch.found) {
		try {
			const firstNumberGroup = complexMatch.groups("firstNumber") as unknown;
			const factNumberGroup = complexMatch.groups("factNumber") as unknown;
			const sqrtNumberGroup = complexMatch.groups("sqrtNumber") as unknown;
			const logNumberGroup = complexMatch.groups("logNumber") as unknown;

			// Get the factorial number from either firstNumber or factNumber group
			let factorialNumber: number | undefined;

			if (
				firstNumberGroup &&
				typeof firstNumberGroup === "object" &&
				"text" in firstNumberGroup &&
				typeof (firstNumberGroup as { text: () => string }).text === "function"
			) {
				const numberText = (firstNumberGroup as { text: () => string }).text();
				const numberDoc = nlp(numberText);
				try {
					const numbersObj = numberDoc.numbers();
					if (
						numbersObj &&
						typeof numbersObj === "object" &&
						"toNumber" in numbersObj
					) {
						const numberObj = (
							numbersObj as { toNumber: () => unknown }
						).toNumber();
						if (
							numberObj &&
							typeof numberObj === "object" &&
							"out" in numberObj
						) {
							factorialNumber = Number(
								(numberObj as { out: () => string }).out(),
							);
						}
					}
				} catch (error) {
					console.error("Error converting factorial number:", error);
				}
			} else if (
				factNumberGroup &&
				typeof factNumberGroup === "object" &&
				"text" in factNumberGroup &&
				typeof (factNumberGroup as { text: () => string }).text === "function"
			) {
				const numberText = (factNumberGroup as { text: () => string }).text();
				const numberDoc = nlp(numberText);
				try {
					const numbersObj = numberDoc.numbers();
					if (
						numbersObj &&
						typeof numbersObj === "object" &&
						"toNumber" in numbersObj
					) {
						const numberObj = (
							numbersObj as { toNumber: () => unknown }
						).toNumber();
						if (
							numberObj &&
							typeof numberObj === "object" &&
							"out" in numberObj
						) {
							factorialNumber = Number(
								(numberObj as { out: () => string }).out(),
							);
						}
					}
				} catch (error) {
					console.error("Error converting factorial number:", error);
				}
			}

			if (
				sqrtNumberGroup &&
				typeof sqrtNumberGroup === "object" &&
				"text" in sqrtNumberGroup &&
				typeof (sqrtNumberGroup as { text: () => string }).text ===
					"function" &&
				logNumberGroup &&
				typeof logNumberGroup === "object" &&
				"text" in logNumberGroup &&
				typeof (logNumberGroup as { text: () => string }).text === "function"
			) {
				const sqrtNumberText = (
					sqrtNumberGroup as { text: () => string }
				).text();
				const logNumberText = (logNumberGroup as { text: () => string }).text();

				// Extract numbers
				const sqrtNumberDoc = nlp(sqrtNumberText);
				const logNumberDoc = nlp(logNumberText);

				let sqrtNumber: number | undefined;
				let logNumber: number | undefined;

				try {
					// Get sqrt number
					const sqrtNumbersObj = sqrtNumberDoc.numbers();
					if (
						sqrtNumbersObj &&
						typeof sqrtNumbersObj === "object" &&
						"toNumber" in sqrtNumbersObj
					) {
						const numberObj = (
							sqrtNumbersObj as { toNumber: () => unknown }
						).toNumber();
						if (
							numberObj &&
							typeof numberObj === "object" &&
							"out" in numberObj
						) {
							sqrtNumber = Number((numberObj as { out: () => string }).out());
						}
					}

					// Get log number
					const logNumbersObj = logNumberDoc.numbers();
					if (
						logNumbersObj &&
						typeof logNumbersObj === "object" &&
						"toNumber" in logNumbersObj
					) {
						const numberObj = (
							logNumbersObj as { toNumber: () => unknown }
						).toNumber();
						if (
							numberObj &&
							typeof numberObj === "object" &&
							"out" in numberObj
						) {
							logNumber = Number((numberObj as { out: () => string }).out());
						}
					}
				} catch (error) {
					console.error("Error converting numbers:", error);
					return [];
				}

				if (
					factorialNumber !== undefined &&
					!Number.isNaN(factorialNumber) &&
					sqrtNumber !== undefined &&
					!Number.isNaN(sqrtNumber) &&
					logNumber !== undefined &&
					!Number.isNaN(logNumber)
				) {
					// Calculate factorial
					if (factorialNumber < 0 || !Number.isInteger(factorialNumber)) {
						return [];
					}
					let factorial = 1;
					for (let i = 2; i <= factorialNumber; i++) {
						factorial *= i;
					}

					// Calculate square root
					if (sqrtNumber < 0) return [];
					const sqrtValue = Math.sqrt(sqrtNumber);

					// Calculate log (base 10)
					if (logNumber <= 0) return [];
					const logValue = Math.log(logNumber) / Math.log(10);

					// Calculate final result
					const result = factorial * sqrtValue * logValue;
					const roundedResult = Math.round(result * 100) / 100;
					const value = roundedResult.toString();

					return [
						{
							label: value,
							value,
							handler: COMMAND_HANDLER.COPY_TO_CLIPBOARD,
							smartMatch: true,
						},
					];
				}
			}
		} catch (error) {
			console.error("Error in complex expression:", error);
		}
	}

	// Try to match chainable math operations with special functions
	try {
		// Get all numbers and operations in sequence
		const numbers: number[] = [];
		const operations: string[] = [];
		const text = doc.text().toLowerCase();
		const parts = text.split(/\s+(times|multiply by|multiplied by)\s+/);

		for (const part of parts) {
			// Check for factorial
			if (part.includes("factorial")) {
				const factMatch = nlp(part).match("[<number>#Value+] factorial");
				if (factMatch.found) {
					const numberGroup = factMatch.groups("number") as unknown;
					if (
						numberGroup &&
						typeof numberGroup === "object" &&
						"text" in numberGroup
					) {
						const numberText = (numberGroup as { text: () => string }).text();
						const numberDoc = nlp(numberText);
						const numbersObj = numberDoc.numbers();
						if (
							numbersObj &&
							typeof numbersObj === "object" &&
							"toNumber" in numbersObj
						) {
							const numberObj = (
								numbersObj as { toNumber: () => unknown }
							).toNumber();
							if (
								numberObj &&
								typeof numberObj === "object" &&
								"out" in numberObj
							) {
								const num = Number((numberObj as { out: () => string }).out());
								if (!Number.isNaN(num) && Number.isInteger(num) && num >= 0) {
									let factorial = 1;
									for (let i = 2; i <= num; i++) {
										factorial *= i;
									}
									numbers.push(factorial);
								}
							}
						}
					}
				}
			} // Check for square root
			else if (part.includes("square root of") || part.includes("sqrt of")) {
				const sqrtMatch = nlp(part).match(
					"(square root|sqrt) of [<number>#Value+]",
				);
				if (sqrtMatch.found) {
					const numberGroup = sqrtMatch.groups("number") as unknown;
					if (
						numberGroup &&
						typeof numberGroup === "object" &&
						"text" in numberGroup
					) {
						const numberText = (numberGroup as { text: () => string }).text();
						const numberDoc = nlp(numberText);
						const numbersObj = numberDoc.numbers();
						if (
							numbersObj &&
							typeof numbersObj === "object" &&
							"toNumber" in numbersObj
						) {
							const numberObj = (
								numbersObj as { toNumber: () => unknown }
							).toNumber();
							if (
								numberObj &&
								typeof numberObj === "object" &&
								"out" in numberObj
							) {
								const num = Number((numberObj as { out: () => string }).out());
								if (!Number.isNaN(num) && num >= 0) {
									numbers.push(Math.sqrt(num));
								}
							}
						}
					}
				}
			} // Check for log
			else if (part.includes("log")) {
				const logMatch = nlp(part).match("log [<number>#Value+]");
				if (logMatch.found) {
					const numberGroup = logMatch.groups("number") as unknown;
					if (
						numberGroup &&
						typeof numberGroup === "object" &&
						"text" in numberGroup
					) {
						const numberText = (numberGroup as { text: () => string }).text();
						const numberDoc = nlp(numberText);
						const numbersObj = numberDoc.numbers();
						if (
							numbersObj &&
							typeof numbersObj === "object" &&
							"toNumber" in numbersObj
						) {
							const numberObj = (
								numbersObj as { toNumber: () => unknown }
							).toNumber();
							if (
								numberObj &&
								typeof numberObj === "object" &&
								"out" in numberObj
							) {
								const num = Number((numberObj as { out: () => string }).out());
								if (!Number.isNaN(num) && num > 0) {
									numbers.push(Math.log(num) / Math.log(10));
								}
							}
						}
					}
				}
			} // Regular number
			else {
				const numDoc = nlp(part);
				if (numDoc.numbers().length > 0) {
					const value = Number(numDoc.numbers().toNumber().out());
					if (!Number.isNaN(value)) {
						numbers.push(value);
					}
				}
			}

			if (part.includes("times") || part.includes("multiply")) {
				operations.push("times");
			}
		}

		// If we have the right number of values and operations
		if (numbers.length >= 2 && operations.length === numbers.length - 1) {
			// Calculate result
			let result = numbers[0];
			for (let i = 1; i < numbers.length; i++) {
				result *= numbers[i];
			}

			const roundedResult = Math.round(result * 100) / 100;
			const value = roundedResult.toString();

			return [
				{
					label: value,
					value,
					handler: COMMAND_HANDLER.COPY_TO_CLIPBOARD,
					smartMatch: true,
				},
			];
		}
	} catch (error) {
		console.error("Error in chainable special operations:", error);
	}

	// Try to match square root pattern first
	const squareRootMatch = doc.match(
		"(square root|sqrt) of [<number>#Value+] (times|multiply by|multiplied by) log [<logNumber>#Value+]",
	);

	if (squareRootMatch.found) {
		try {
			const numberGroup = squareRootMatch.groups("number") as unknown;
			const logNumberGroup = squareRootMatch.groups("logNumber") as unknown;

			if (
				numberGroup &&
				typeof numberGroup === "object" &&
				"text" in numberGroup &&
				typeof (numberGroup as { text: () => string }).text === "function" &&
				logNumberGroup &&
				typeof logNumberGroup === "object" &&
				"text" in logNumberGroup &&
				typeof (logNumberGroup as { text: () => string }).text === "function"
			) {
				const numberText = (numberGroup as { text: () => string }).text();
				const logNumberText = (logNumberGroup as { text: () => string }).text();

				// Extract the numbers
				const numberDoc = nlp(numberText);
				const logNumberDoc = nlp(logNumberText);
				let number: number | undefined;
				let logNumber: number | undefined;

				try {
					const numbersObj = numberDoc.numbers();
					const logNumbersObj = logNumberDoc.numbers();

					if (
						numbersObj &&
						typeof numbersObj === "object" &&
						"toNumber" in numbersObj
					) {
						const numberObj = (
							numbersObj as { toNumber: () => unknown }
						).toNumber();
						if (
							numberObj &&
							typeof numberObj === "object" &&
							"out" in numberObj
						) {
							number = Number((numberObj as { out: () => string }).out());
						}
					}

					if (
						logNumbersObj &&
						typeof logNumbersObj === "object" &&
						"toNumber" in logNumbersObj
					) {
						const logNumberObj = (
							logNumbersObj as { toNumber: () => unknown }
						).toNumber();
						if (
							logNumberObj &&
							typeof logNumberObj === "object" &&
							"out" in logNumberObj
						) {
							logNumber = Number((logNumberObj as { out: () => string }).out());
						}
					}
				} catch (error) {
					console.error("Error converting numbers:", error);
					return [];
				}

				if (
					number !== undefined &&
					!Number.isNaN(number) &&
					logNumber !== undefined &&
					!Number.isNaN(logNumber)
				) {
					if (number < 0) return []; // Can't take square root of negative number
					if (logNumber <= 0) return []; // Can't take log of non-positive number

					// Calculate square root first, then multiply by natural log
					const sqrtValue = Math.sqrt(number);
					const logValue = Math.log(logNumber) / Math.log(10); // Use log base 10 instead of natural log
					const result = sqrtValue * logValue;
					const roundedResult = Math.round(result * 100) / 100;
					const value = roundedResult.toString();

					return [
						{
							label: value,
							value,
							handler: COMMAND_HANDLER.COPY_TO_CLIPBOARD,
							smartMatch: true,
						},
					];
				}
			}
		} catch (error) {
			console.error("Error parsing complex expression:", error);
		}
	}

	// Try to match square root pattern without additional operations
	const simpleSquareRootMatch = doc.match(
		"(square root|sqrt) of [<number>#Value+]",
	);

	if (simpleSquareRootMatch.found) {
		try {
			const numberGroup = simpleSquareRootMatch.groups("number") as unknown;

			if (
				numberGroup &&
				typeof numberGroup === "object" &&
				"text" in numberGroup &&
				typeof (numberGroup as { text: () => string }).text === "function"
			) {
				const numberText = (numberGroup as { text: () => string }).text();

				// Extract the number
				const numberDoc = nlp(numberText);
				let number: number | undefined;

				try {
					const numbersObj = numberDoc.numbers();
					if (
						numbersObj &&
						typeof numbersObj === "object" &&
						"toNumber" in numbersObj
					) {
						const numberObj = (
							numbersObj as { toNumber: () => unknown }
						).toNumber();
						if (
							numberObj &&
							typeof numberObj === "object" &&
							"out" in numberObj
						) {
							number = Number((numberObj as { out: () => string }).out());
						}
					}
				} catch (error) {
					console.error("Error converting number:", error);
					return [];
				}

				if (number !== undefined && !Number.isNaN(number)) {
					// Calculate square root
					if (number < 0) {
						// Can't take square root of negative number in real domain
						return [];
					}

					const result = Math.sqrt(number);
					const roundedResult = Math.round(result * 100) / 100;
					const value = roundedResult.toString();

					return [
						{
							label: value,
							value,
							handler: COMMAND_HANDLER.COPY_TO_CLIPBOARD,
							smartMatch: true,
						},
					];
				}
			}
		} catch (error) {
			console.error("Error parsing square root:", error);
		}
	}

	// Try to match percent pattern
	const percentMatch = doc.match(
		"[<percentage>#Value+] percent of [<number>#Value+]",
	);

	if (percentMatch.found) {
		try {
			const percentageGroup = percentMatch.groups("percentage") as unknown;
			const numberGroup = percentMatch.groups("number") as unknown;

			if (
				percentageGroup &&
				typeof percentageGroup === "object" &&
				"text" in percentageGroup &&
				typeof (percentageGroup as { text: () => string }).text ===
					"function" &&
				numberGroup &&
				typeof numberGroup === "object" &&
				"text" in numberGroup &&
				typeof (numberGroup as { text: () => string }).text === "function"
			) {
				const percentageText = (
					percentageGroup as { text: () => string }
				).text();
				const numberText = (numberGroup as { text: () => string }).text();

				// Extract percentage
				const percentageDoc = nlp(percentageText);
				let percentage: number | undefined;

				try {
					const numbersObj = percentageDoc.numbers();
					if (
						numbersObj &&
						typeof numbersObj === "object" &&
						"toNumber" in numbersObj
					) {
						const numberObj = (
							numbersObj as { toNumber: () => unknown }
						).toNumber();
						if (
							numberObj &&
							typeof numberObj === "object" &&
							"out" in numberObj
						) {
							percentage = Number((numberObj as { out: () => string }).out());
						}
					}
				} catch (error) {
					console.error("Error converting percentage:", error);
					return [];
				}

				// Extract number
				const numberDoc = nlp(numberText);
				let number: number | undefined;

				try {
					const numbersObj = numberDoc.numbers();
					if (
						numbersObj &&
						typeof numbersObj === "object" &&
						"toNumber" in numbersObj
					) {
						const numberObj = (
							numbersObj as { toNumber: () => unknown }
						).toNumber();
						if (
							numberObj &&
							typeof numberObj === "object" &&
							"out" in numberObj
						) {
							number = Number((numberObj as { out: () => string }).out());
						}
					}
				} catch (error) {
					console.error("Error converting number:", error);
					return [];
				}

				if (
					percentage !== undefined &&
					!Number.isNaN(percentage) &&
					number !== undefined &&
					!Number.isNaN(number)
				) {
					// Calculate percentage
					const result = (percentage / 100) * number;
					const roundedResult = Math.round(result * 100) / 100;
					const value = roundedResult.toString();

					return [
						{
							label: value,
							value,
							handler: COMMAND_HANDLER.COPY_TO_CLIPBOARD,
							smartMatch: true,
						},
					];
				}
			}
		} catch (error) {
			console.error("Error parsing percentage:", error);
		}
	}

	// Try to match "number squared" pattern
	const squaredMatch = doc.match("[<number>#Value+] squared");

	if (squaredMatch.found) {
		try {
			const numberGroup = squaredMatch.groups("number") as unknown;

			if (
				numberGroup &&
				typeof numberGroup === "object" &&
				"text" in numberGroup &&
				typeof (numberGroup as { text: () => string }).text === "function"
			) {
				const numberText = (numberGroup as { text: () => string }).text();

				// Extract the number
				const numberDoc = nlp(numberText);
				let number: number | undefined;

				try {
					const numbersObj = numberDoc.numbers();
					if (
						numbersObj &&
						typeof numbersObj === "object" &&
						"toNumber" in numbersObj
					) {
						const numberObj = (
							numbersObj as { toNumber: () => unknown }
						).toNumber();
						if (
							numberObj &&
							typeof numberObj === "object" &&
							"out" in numberObj
						) {
							number = Number((numberObj as { out: () => string }).out());
						}
					}
				} catch (error) {
					console.error("Error converting number:", error);
					return [];
				}

				if (number !== undefined && !Number.isNaN(number)) {
					// Calculate squared value
					const result = number * number;
					const roundedResult = Math.round(result * 100) / 100;
					const value = roundedResult.toString();

					return [
						{
							label: value,
							value,
							handler: COMMAND_HANDLER.COPY_TO_CLIPBOARD,
							smartMatch: true,
						},
					];
				}
			}
		} catch (error) {
			console.error("Error parsing squared value:", error);
		}
	}

	// Try to match "number cubed" pattern
	const cubedMatch = doc.match("[<number>#Value+] cubed");

	if (cubedMatch.found) {
		try {
			const numberGroup = cubedMatch.groups("number") as unknown;

			if (
				numberGroup &&
				typeof numberGroup === "object" &&
				"text" in numberGroup &&
				typeof (numberGroup as { text: () => string }).text === "function"
			) {
				const numberText = (numberGroup as { text: () => string }).text();

				// Extract the number
				const numberDoc = nlp(numberText);
				let number: number | undefined;

				try {
					const numbersObj = numberDoc.numbers();
					if (
						numbersObj &&
						typeof numbersObj === "object" &&
						"toNumber" in numbersObj
					) {
						const numberObj = (
							numbersObj as { toNumber: () => unknown }
						).toNumber();
						if (
							numberObj &&
							typeof numberObj === "object" &&
							"out" in numberObj
						) {
							number = Number((numberObj as { out: () => string }).out());
						}
					}
				} catch (error) {
					console.error("Error converting number:", error);
					return [];
				}

				if (number !== undefined && !Number.isNaN(number)) {
					// Calculate cubed value
					const result = number * number * number;
					const roundedResult = Math.round(result * 100) / 100;
					const value = roundedResult.toString();

					return [
						{
							label: value,
							value,
							handler: COMMAND_HANDLER.COPY_TO_CLIPBOARD,
							smartMatch: true,
						},
					];
				}
			}
		} catch (error) {
			console.error("Error parsing cubed value:", error);
		}
	}

	// Try to match "number factorial" pattern
	const factorialMatch = doc.match("[<number>#Value+] factorial");

	if (factorialMatch.found) {
		try {
			const numberGroup = factorialMatch.groups("number") as unknown;

			if (
				numberGroup &&
				typeof numberGroup === "object" &&
				"text" in numberGroup &&
				typeof (numberGroup as { text: () => string }).text === "function"
			) {
				const numberText = (numberGroup as { text: () => string }).text();

				// Extract the number
				const numberDoc = nlp(numberText);
				let number: number | undefined;

				try {
					const numbersObj = numberDoc.numbers();
					if (
						numbersObj &&
						typeof numbersObj === "object" &&
						"toNumber" in numbersObj
					) {
						const numberObj = (
							numbersObj as { toNumber: () => unknown }
						).toNumber();
						if (
							numberObj &&
							typeof numberObj === "object" &&
							"out" in numberObj
						) {
							number = Number((numberObj as { out: () => string }).out());
						}
					}
				} catch (error) {
					console.error("Error converting number:", error);
					return [];
				}

				if (number !== undefined && !Number.isNaN(number)) {
					// Check if number is non-negative integer
					if (number < 0 || !Number.isInteger(number)) {
						return [];
					}

					// Calculate factorial
					let result = 1;
					for (let i = 2; i <= number; i++) {
						result *= i;
					}

					const value = result.toString();

					return [
						{
							label: value,
							value,
							handler: COMMAND_HANDLER.COPY_TO_CLIPBOARD,
							smartMatch: true,
						},
					];
				}
			}
		} catch (error) {
			console.error("Error parsing factorial:", error);
		}
	}

	// Try to match chainable math operations
	try {
		// Get all numbers in sequence by splitting on operations first
		const numbers: number[] = [];
		const text = doc.text().toLowerCase();
		const parts = text.split(
			/\s+(plus|minus|times|multiply|multiplied|divided|divide)\s+/,
		);

		// Extract numbers from each part
		for (const part of parts) {
			const numDoc = nlp(part);
			if (numDoc.numbers().length > 0) {
				const value = Number(numDoc.numbers().toNumber().out());
				if (!Number.isNaN(value)) {
					numbers.push(value);
				}
			}
		}

		// Get all operations in sequence
		const operations: string[] = [];
		const words = text.split(" ");
		for (const word of words) {
			if (word === "plus" || word === "add") {
				operations.push("plus");
			} else if (
				word === "minus" ||
				word === "subtract" ||
				word === "subtracted" ||
				word === "less"
			) {
				operations.push("minus");
			} else if (
				word === "times" ||
				word === "multiply" ||
				word === "multiplied"
			) {
				operations.push("times");
			} else if (word === "divided" || word === "divide") {
				operations.push("divide");
			}
		}

		// Validate we have the right sequence
		if (numbers.length >= 2 && operations.length === numbers.length - 1) {
			// Process operations in sequence
			let result = numbers[0];
			for (let i = 0; i < operations.length; i++) {
				const op = operations[i];
				const nextNum = numbers[i + 1];

				switch (op) {
					case "plus":
						result += nextNum;
						break;
					case "minus":
						result -= nextNum;
						break;
					case "times":
						result *= nextNum;
						break;
					case "divide":
						if (nextNum === 0) return [];
						result /= nextNum;
						break;
				}
			}

			const roundedResult = Math.round(result * 100) / 100;
			const value = roundedResult.toString();

			return [
				{
					label: value,
					value,
					handler: COMMAND_HANDLER.COPY_TO_CLIPBOARD,
					smartMatch: true,
				},
			];
		}
	} catch (error) {
		console.error("Error in chainable math:", error);
	}

	return trySimpleMathMatch(doc);

	// Helper function to try the simple math match as a fallback
	function trySimpleMathMatch(doc: {
		match: (pattern: string) => {
			found: boolean;
			groups: (name: string) => unknown;
			has: (text: string) => boolean;
		};
		text: () => string;
	}) {
		// Match patterns like "five times seven", "ten minus two", etc.
		const mathMatch = doc.match(
			"[<firstNumber>#Value+] [<operation>(plus|add|minus|subtract|times|multiply by|multiplied by|divided by|divide by)] [<secondNumber>#Value+]",
		);

		if (mathMatch.found) {
			try {
				// Extract the components safely with type guards
				const firstNumberGroup = mathMatch.groups("firstNumber") as unknown;
				const operationGroup = mathMatch.groups("operation") as unknown;
				const secondNumberGroup = mathMatch.groups("secondNumber") as unknown;

				// Type guards for all extracted components
				if (
					firstNumberGroup &&
					typeof firstNumberGroup === "object" &&
					"text" in firstNumberGroup &&
					typeof (firstNumberGroup as { text: () => string }).text ===
						"function" &&
					operationGroup &&
					typeof operationGroup === "object" &&
					"text" in operationGroup &&
					typeof (operationGroup as { text: () => string }).text ===
						"function" &&
					secondNumberGroup &&
					typeof secondNumberGroup === "object" &&
					"text" in secondNumberGroup &&
					typeof (secondNumberGroup as { text: () => string }).text ===
						"function"
				) {
					const firstNumberText = (
						firstNumberGroup as { text: () => string }
					).text();
					const operationText = (
						operationGroup as { text: () => string }
					).text();
					const secondNumberText = (
						secondNumberGroup as { text: () => string }
					).text();

					// Extract first number
					const firstNumberDoc = nlp(firstNumberText);
					let firstNumber: number | undefined;

					try {
						const numbersObj = firstNumberDoc.numbers();
						if (
							numbersObj &&
							typeof numbersObj === "object" &&
							"toNumber" in numbersObj
						) {
							const numberObj = (
								numbersObj as { toNumber: () => unknown }
							).toNumber();
							if (
								numberObj &&
								typeof numberObj === "object" &&
								"out" in numberObj
							) {
								firstNumber = Number(
									(numberObj as { out: () => string }).out(),
								);
							}
						}
					} catch (error) {
						console.error("Error converting first number:", error);
						return [];
					}

					// Extract second number
					const secondNumberDoc = nlp(secondNumberText);
					let secondNumber: number | undefined;

					try {
						const numbersObj = secondNumberDoc.numbers();
						if (
							numbersObj &&
							typeof numbersObj === "object" &&
							"toNumber" in numbersObj
						) {
							const numberObj = (
								numbersObj as { toNumber: () => unknown }
							).toNumber();
							if (
								numberObj &&
								typeof numberObj === "object" &&
								"out" in numberObj
							) {
								secondNumber = Number(
									(numberObj as { out: () => string }).out(),
								);
							}
						}
					} catch (error) {
						console.error("Error converting second number:", error);
						return [];
					}

					// Verify we have valid numbers
					if (
						firstNumber !== undefined &&
						!Number.isNaN(firstNumber) &&
						secondNumber !== undefined &&
						!Number.isNaN(secondNumber)
					) {
						// Perform the calculation based on the operation
						let result: number;

						if (
							operationText.includes("plus") ||
							operationText.includes("add")
						) {
							result = firstNumber + secondNumber;
						} else if (
							operationText.includes("minus") ||
							operationText.includes("subtract")
						) {
							result = firstNumber - secondNumber;
						} else if (
							operationText.includes("times") ||
							operationText.includes("multiply")
						) {
							result = firstNumber * secondNumber;
						} else if (operationText.includes("divide")) {
							// Check for division by zero
							if (secondNumber === 0) {
								return [];
							}
							result = firstNumber / secondNumber;
						} else {
							// Unknown operation
							return [];
						}

						// Round to 2 decimal places if needed
						const roundedResult = Math.round(result * 100) / 100;
						const value = roundedResult.toString();

						return [
							{
								label: value,
								value,
								handler: COMMAND_HANDLER.COPY_TO_CLIPBOARD,
								smartMatch: true,
							},
						];
					}
				}
			} catch (error) {
				console.error("Error parsing text math expression:", error);
			}
		}

		return [];
	}
}

export function parseFraction(query: string): ExecutableCommand[] {
	const fractionWords = {
		half: 1 / 2,
		halves: 1 / 2,
		third: 1 / 3,
		thirds: 1 / 3,
		quarter: 1 / 4,
		quarters: 1 / 4,
		fourth: 1 / 4,
		fourths: 1 / 4,
		fifth: 1 / 5,
		fifths: 1 / 5,
		sixth: 1 / 6,
		sixths: 1 / 6,
		seventh: 1 / 7,
		sevenths: 1 / 7,
		eighth: 1 / 8,
		eighths: 1 / 8,
		ninth: 1 / 9,
		ninths: 1 / 9,
		tenth: 1 / 10,
		tenths: 1 / 10,
	};

	// Handle patterns like "two thirds" or "one half"
	const doc = nlp(query.toLowerCase());

	// First, try to match "X fraction of Y" pattern
	const fractionOfMatch = doc.match(
		"[<numerator>#Value+] [<denominator>(half|halves|third|thirds|quarter|quarters|fourth|fourths|fifth|fifths|sixth|sixths|seventh|sevenths|eighth|eighths|ninth|ninths|tenth|tenths)] of [<base>#Value+]",
	);

	if (fractionOfMatch.found) {
		try {
			// Using unknown as intermediate type to avoid direct any usage
			const numeratorGroup = fractionOfMatch.groups("numerator") as unknown;
			const denominatorGroup = fractionOfMatch.groups("denominator") as unknown;
			const baseGroup = fractionOfMatch.groups("base") as unknown;

			// Type guard to ensure these objects have text() method
			if (
				numeratorGroup &&
				typeof numeratorGroup === "object" &&
				"text" in numeratorGroup &&
				typeof (numeratorGroup as { text: () => string }).text === "function" &&
				denominatorGroup &&
				typeof denominatorGroup === "object" &&
				"text" in denominatorGroup &&
				typeof (denominatorGroup as { text: () => string }).text ===
					"function" &&
				baseGroup &&
				typeof baseGroup === "object" &&
				"text" in baseGroup &&
				typeof (baseGroup as { text: () => string }).text === "function"
			) {
				const numeratorText = (numeratorGroup as { text: () => string }).text();
				const denominatorText = (
					denominatorGroup as { text: () => string }
				).text();
				const baseText = (baseGroup as { text: () => string }).text();

				// Convert text number to actual number
				const numeratorDoc = nlp(numeratorText);
				let numerator: number | undefined;

				// Safe access to the numbers API
				// Convert string number words to numeric value
				try {
					const numbersObj = numeratorDoc.numbers();
					if (
						numbersObj &&
						typeof numbersObj === "object" &&
						"toNumber" in numbersObj
					) {
						const numberObj = (
							numbersObj as { toNumber: () => unknown }
						).toNumber();
						if (
							numberObj &&
							typeof numberObj === "object" &&
							"out" in numberObj
						) {
							numerator = Number((numberObj as { out: () => string }).out());
						}
					}
				} catch (error) {
					console.error("Error converting text number:", error);
					return [];
				}

				// Get the base number
				const baseDoc = nlp(baseText);
				let base: number | undefined;

				// Safe access to the numbers API for base value
				try {
					const baseNumbersObj = baseDoc.numbers();
					if (
						baseNumbersObj &&
						typeof baseNumbersObj === "object" &&
						"toNumber" in baseNumbersObj
					) {
						const baseNumberObj = (
							baseNumbersObj as { toNumber: () => unknown }
						).toNumber();
						if (
							baseNumberObj &&
							typeof baseNumberObj === "object" &&
							"out" in baseNumberObj
						) {
							base = Number((baseNumberObj as { out: () => string }).out());
							// If it's still NaN, try parsing it directly
							if (Number.isNaN(base)) {
								base = Number(baseText);
							}
						}
					}
				} catch (error) {
					// Try parsing it directly
					base = Number(baseText);
					if (Number.isNaN(base)) {
						console.error("Error converting base number:", error);
						return [];
					}
				}

				// Get the denominator fraction value
				const denominator =
					fractionWords[denominatorText as keyof typeof fractionWords];

				if (
					numerator !== undefined &&
					!Number.isNaN(numerator) &&
					denominator !== undefined &&
					base !== undefined &&
					!Number.isNaN(base)
				) {
					const fractionValue = numerator * denominator;
					const result = fractionValue * base;
					const roundedResult = Math.round(result * 100) / 100;
					const value = roundedResult.toString();

					return [
						{
							label: value,
							value,
							handler: COMMAND_HANDLER.COPY_TO_CLIPBOARD,
							smartMatch: true,
						},
					];
				}
			}
		} catch (error) {
			console.error("Error parsing fraction:", error);
		}
	}

	// If "fraction of X" pattern didn't match, try the simple fraction pattern
	const fractionMatch = doc.match(
		"[<numerator>#Value+] [<denominator>(half|halves|third|thirds|quarter|quarters|fourth|fourths|fifth|fifths|sixth|sixths|seventh|sevenths|eighth|eighths|ninth|ninths|tenth|tenths)]",
	);

	if (fractionMatch.found) {
		try {
			// Using unknown as intermediate type to avoid direct any usage
			const numeratorGroup = fractionMatch.groups("numerator") as unknown;
			const denominatorGroup = fractionMatch.groups("denominator") as unknown;

			// Type guard to ensure these objects have text() method
			if (
				numeratorGroup &&
				typeof numeratorGroup === "object" &&
				"text" in numeratorGroup &&
				typeof (numeratorGroup as { text: () => string }).text === "function" &&
				denominatorGroup &&
				typeof denominatorGroup === "object" &&
				"text" in denominatorGroup &&
				typeof (denominatorGroup as { text: () => string }).text === "function"
			) {
				const numeratorText = (numeratorGroup as { text: () => string }).text();
				const denominatorText = (
					denominatorGroup as { text: () => string }
				).text();

				// Convert text number to actual number
				const numeratorDoc = nlp(numeratorText);
				let numerator: number | undefined;

				// Safe access to the numbers API
				// Convert string number words to numeric value
				try {
					const numbersObj = numeratorDoc.numbers();
					if (
						numbersObj &&
						typeof numbersObj === "object" &&
						"toNumber" in numbersObj
					) {
						const numberObj = (
							numbersObj as { toNumber: () => unknown }
						).toNumber();
						if (
							numberObj &&
							typeof numberObj === "object" &&
							"out" in numberObj
						) {
							numerator = Number((numberObj as { out: () => string }).out());
						}
					}
				} catch (error) {
					console.error("Error converting text number:", error);
					return [];
				}

				// Get the denominator fraction value
				const denominator =
					fractionWords[denominatorText as keyof typeof fractionWords];

				if (
					numerator !== undefined &&
					!Number.isNaN(numerator) &&
					denominator !== undefined
				) {
					const result = numerator * denominator;
					const roundedResult = Math.round(result * 100) / 100;
					const value = roundedResult.toString();

					return [
						{
							label: value,
							value,
							handler: COMMAND_HANDLER.COPY_TO_CLIPBOARD,
							smartMatch: true,
						},
					];
				}
			}
		} catch (error) {
			console.error("Error parsing fraction:", error);
		}
	}

	return [];
}

export function parseRelativeTime(query: string): ExecutableCommand[] {
	const doc = nlp(query);
	// Initialize unit with a default value to fix "used before assignment" error
	let unit: TimeUnit = "day";
	let date: Date;

	const simpleDateMatch = doc.match("(next|last|past) [<reference>#Date+]?");

	if (simpleDateMatch.found) {
		// Using type guards to fix the date property access
		const referenceGroups = simpleDateMatch.groups("reference") as unknown;
		if (
			referenceGroups &&
			typeof referenceGroups === "object" &&
			"dates" in referenceGroups &&
			typeof (referenceGroups as { dates: () => unknown }).dates === "function"
		) {
			const datesObj = (referenceGroups as { dates: () => unknown }).dates();
			if (
				datesObj &&
				typeof datesObj === "object" &&
				"get" in datesObj &&
				typeof (datesObj as { get: () => unknown[] }).get === "function"
			) {
				const referenceDates = (
					datesObj as { get: () => { start: string }[] }
				).get();
				if (referenceDates.length === 0) {
					return [];
				}
				date = new Date(referenceDates[0].start);
			} else {
				return [];
			}
		} else {
			return [];
		}
	} else {
		const nlpMatch = doc.match(
			"[<ordinal>#Value+] (minute|minutes|hour|hours|day|days|week|weeks|month|months|year|years) (ago|from|after) [<reference>#Date+]?",
		);

		if (!nlpMatch.found) {
			return [];
		}

		// Safe access to ordinal text value
		const ordinalGroup = nlpMatch.groups("ordinal") as unknown;
		if (
			!(
				ordinalGroup &&
				typeof ordinalGroup === "object" &&
				"text" in ordinalGroup &&
				typeof (ordinalGroup as { text: () => string }).text === "function"
			)
		) {
			return [];
		}
		const numberText = Number((ordinalGroup as { text: () => string }).text());

		unit = nlpMatch
			.match(
				"(minute|minutes|hour|hours|day|days|week|weeks|month|months|year|years)",
			)
			.text() as TimeUnit;
		const direction = nlpMatch.has("ago") ? -1 : 1;

		const msPerDay = 24 * 60 * 60 * 1000;
		const ms = match(unit)
			.with("minute", "minutes", () => 60 * 1000)
			.with("hour", "hours", () => 60 * 60 * 1000)
			.with("day", "days", () => msPerDay)
			.with("week", "weeks", () => msPerDay * 7)
			.with("month", "months", () => msPerDay * 30)
			.with("year", "years", () => msPerDay * 365)
			.exhaustive();

		let referenceDate: number;

		if (direction === -1) {
			referenceDate = Date.now();
		} else {
			// Safe access to reference date values
			const referenceGroup = nlpMatch.groups("reference") as unknown;
			if (
				referenceGroup &&
				typeof referenceGroup === "object" &&
				"dates" in referenceGroup &&
				typeof (referenceGroup as { dates: () => unknown }).dates === "function"
			) {
				const datesObj = (referenceGroup as { dates: () => unknown }).dates();
				if (
					datesObj &&
					typeof datesObj === "object" &&
					"get" in datesObj &&
					typeof (datesObj as { get: () => unknown[] }).get === "function"
				) {
					const referenceGroups = (
						datesObj as { get: () => { start: string }[] }
					).get();
					if (referenceGroups.length > 0) {
						referenceDate = Number(new Date(referenceGroups[0].start));
					} else {
						referenceDate = Date.now();
					}
				} else {
					referenceDate = Date.now();
				}
			} else {
				referenceDate = Date.now();
			}
		}

		date = new Date(referenceDate + ms * numberText * direction);
	}
	const value = date.toISOString();
	const label = match(unit)
		.with("minute", "minutes", "hour", "hours", () =>
			dayjs(value).format("YYYY-MM-DD HH:mm"),
		)
		.otherwise(() => dayjs(value).format("YYYY-MM-DD"));

	return [
		{
			label,
			value,
			handler: COMMAND_HANDLER.COPY_TO_CLIPBOARD,
			smartMatch: true,
		},
	];
}

export function parseUnitConversion(query: string): ExecutableCommand[] {
	const doc = nlp(query.toLowerCase());

	// Comprehensive unit mapping
	const unitMap: Record<string, string> = {
		// Length
		kilometer: "kilometers",
		km: "kilometers",
		kilometers: "kilometers",
		meter: "meters",
		m: "meters",
		meters: "meters",
		centimeter: "centimeters",
		cm: "centimeters",
		centimeters: "centimeters",
		millimeter: "millimeters",
		mm: "millimeters",
		millimeters: "millimeters",
		mile: "miles",
		mi: "miles",
		miles: "miles",
		foot: "feet",
		ft: "feet",
		feet: "feet",
		"'": "feet", // Standard apostrophe
		"′": "feet", // Unicode prime symbol
		inch: "inches",
		in: "inches",
		inches: "inches",
		'"': "inches", // Double quote
		"″": "inches", // Unicode double prime symbol
		yard: "yards",
		yd: "yards",
		yards: "yards",
		"nautical mile": "nautical miles",
		nmi: "nautical miles",
		"nautical miles": "nautical miles",

		// Weight/Mass
		kilogram: "kilograms",
		kg: "kilograms",
		kilograms: "kilograms",
		gram: "grams",
		g: "grams",
		grams: "grams",
		milligram: "milligrams",
		mg: "milligrams",
		milligrams: "milligrams",
		pound: "pounds",
		lb: "pounds",
		pounds: "pounds",
		ounce: "ounces",
		oz: "ounces",
		ounces: "ounces",
		stone: "stone",
		st: "stone",

		// Volume
		liter: "liters",
		l: "liters",
		liters: "liters",
		litre: "liters",
		litres: "liters",
		milliliter: "milliliters",
		ml: "milliliters",
		milliliters: "milliliters",
		millilitre: "milliliters",
		millilitres: "milliliters",
		gallon: "gallons",
		gal: "gallons",
		gallons: "gallons",
		quart: "quarts",
		qt: "quarts",
		quarts: "quarts",
		pint: "pints",
		pt: "pints",
		pints: "pints",
		cup: "cups",
		cups: "cups",
		"fluid ounce": "fluid ounces",
		"fl oz": "fluid ounces",
		"fluid ounces": "fluid ounces",

		// Temperature
		celsius: "celsius",
		c: "celsius",
		"°c": "celsius",
		"℃": "celsius",
		fahrenheit: "fahrenheit",
		f: "fahrenheit",
		"°f": "fahrenheit",
		"℉": "fahrenheit",
		kelvin: "kelvin",
		k: "kelvin",

		// Area
		"square meter": "square meters",
		"sq m": "square meters",
		"m²": "square meters",
		"square meters": "square meters",
		m2: "square meters",
		sqm: "square meters",
		"square foot": "square feet",
		"sq ft": "square feet",
		"ft²": "square feet",
		"square feet": "square feet",
		ft2: "square feet",
		sqft: "square feet",
		acre: "acres",
		ac: "acres",
		acres: "acres",
		hectare: "hectares",
		ha: "hectares",
		hectares: "hectares",

		// Speed
		"kilometer per hour": "kilometers per hour",
		kph: "kilometers per hour",
		"kilometers per hour": "kilometers per hour",
		"km/h": "kilometers per hour",
		kmh: "kilometers per hour",
		"mile per hour": "miles per hour",
		mph: "miles per hour",
		"miles per hour": "miles per hour",
		"mi/h": "miles per hour",
		knot: "knots",
		kn: "knots",
		knots: "knots",

		// Data
		byte: "bytes",
		b: "bytes",
		bytes: "bytes",
		kilobyte: "kilobytes",
		kb: "kilobytes",
		kilobytes: "kilobytes",
		megabyte: "megabytes",
		mb: "megabytes",
		megabytes: "megabytes",
		gigabyte: "gigabytes",
		gb: "gigabytes",
		gigabytes: "gigabytes",
		terabyte: "terabytes",
		tb: "terabytes",
		terabytes: "terabytes",
		kibibyte: "kibibytes",
		kib: "kibibytes",
		kibibytes: "kibibytes",
		mebibyte: "mebibytes",
		mib: "mebibytes",
		mebibytes: "mebibytes",
		gibibyte: "gibibytes",
		gib: "gibibytes",
		gibibytes: "gibibytes",
		tebibyte: "tebibytes",
		tib: "tebibytes",
		tebibytes: "tebibytes",

		// Pressure
		pascal: "pascals",
		pa: "pascals",
		pascals: "pascals",
		kilopascal: "kilopascals",
		kpa: "kilopascals",
		kilopascals: "kilopascals",
		megapascal: "megapascals",
		mpa: "megapascals",
		megapascals: "megapascals",
		bar: "bars",
		bars: "bars",
		atmosphere: "atmospheres",
		atm: "atmospheres",
		atmospheres: "atmospheres",
		psi: "psi",

		// Time
		second: "seconds",
		s: "seconds",
		sec: "seconds",
		seconds: "seconds",
		minute: "minutes",
		min: "minutes",
		minutes: "minutes",
		hour: "hours",
		h: "hours",
		hr: "hours",
		hours: "hours",
		day: "days",
		d: "days",
		days: "days",
		week: "weeks",
		w: "weeks",
		weeks: "weeks",
		month: "months",
		mo: "months",
		months: "months",
		year: "years",
		y: "years",
		years: "years",
	};

	// Define metric-imperial unit pairs for automatic conversion suggestions
	const unitConversionPairs: Record<string, string> = {
		// Length
		kilometers: "miles",
		miles: "kilometers",
		meters: "feet",
		feet: "meters",
		centimeters: "inches",
		inches: "centimeters",
		millimeters: "inches",

		// Weight/Mass
		kilograms: "pounds",
		pounds: "kilograms",
		grams: "ounces",
		ounces: "grams",

		// Volume
		liters: "gallons",
		gallons: "liters",
		milliliters: "fluid ounces",
		"fluid ounces": "milliliters",

		// Temperature
		celsius: "fahrenheit",
		fahrenheit: "celsius",

		// Area
		"square meters": "square feet",
		"square feet": "square meters",
		hectares: "acres",
		acres: "hectares",

		// Speed
		"kilometers per hour": "miles per hour",
		"miles per hour": "kilometers per hour",
	};

	// Add a more generic no-space regex for any unit
	const unitNoSpaceRegex =
		/^(\d+(?:\.\d+)?)([a-zA-Z0-9/°²]+)\s+(?:to|in)\s+([a-zA-Z0-9/°²]+)$/;
	const unitMatch = query.match(unitNoSpaceRegex);

	// New pattern to detect single-unit input (like "57lbs" or "10kg")
	const singleUnitRegex = /^(\d+(?:\.\d+)?)([a-zA-Z0-9/°²''′"″""]+)$/;
	const singleUnitMatch = query.match(singleUnitRegex);

	// Handle different types of apostrophes and quotes
	// For feet ('), the MacOS keyboard produces a right single quotation mark (') instead of straight apostrophe (')
	// For inches ("), both straight quote (") and right double quotation mark (") can be used

	// Handle feet format with different apostrophe types: 5' to cm or 5' to cm
	// Use a more inclusive approach with character class and Unicode
	const feetRegex = /^(\d+)(?:'|′|'|'|\u2019)\s+(?:to|in)\s+([a-zA-Z0-9/°²]+)$/;
	const feetMatch = query.match(feetRegex);

	// Handle inches format: 10" to cm
	const inchesRegex =
		/^(\d+)(?:"|″|"|"|\u201D)\s+(?:to|in)\s+([a-zA-Z0-9/°²]+)$/;
	const inchesMatch = query.match(inchesRegex);

	// Handle combined feet and inches format with different apostrophe and quote types
	const feetInchesRegex =
		/^(\d+)(?:'|′|'|'|\u2019)(\d+)(?:"|″|"|"|\u201D)\s+(?:to|in)\s+([a-zA-Z0-9/°²]+)$/;
	const feetInchesMatch = query.match(feetInchesRegex);

	// Handle the specific case of temperature format like "10c to f" directly with regex
	const tempNoSpaceRegex =
		/^(\d+(?:\.\d+)?)([cCfFkK]°?|°[cCfFkK])\s+(?:to|in)\s+([cCfFkK]°?|°[cCfFkK])$/;
	const tempMatch = query.match(tempNoSpaceRegex);

	// Special single-unit temperature pattern
	const singleTempRegex = /^(\d+(?:\.\d+)?)([cCfFkK]°?|°[cCfFkK])$/;
	const singleTempMatch = query.match(singleTempRegex);

	// Special conversion cases that the library doesn't support natively
	const specialConversions: Record<
		string,
		Record<string, (value: number) => number>
	> = {
		milliliters: {
			ounces: (value) => value * 0.033814, // milliliters to fluid ounces
			"fluid ounces": (value) => value * 0.033814,
		},
		ounces: {
			milliliters: (value) => value * 29.5735, // fluid ounces to milliliters
		},
		"fluid ounces": {
			milliliters: (value) => value * 29.5735,
		},
		"kilometers per hour": {
			"miles per hour": (value) => value * 0.621371, // km/h to mph
		},
		"miles per hour": {
			"kilometers per hour": (value) => value * 1.60934, // mph to km/h
		},
	};

	// Helper function to get standardized unit handling different apostrophe and quote types
	function getStandardUnit(unit: string): string {
		return unitMap[unit.toLowerCase()] || unit;
	}

	// Handle single temperature unit input (automatically suggest conversion)
	if (singleTempMatch) {
		const value = Number(singleTempMatch[1]);
		let unit = singleTempMatch[2].toLowerCase().replace(/°/g, "");

		// Map temperature abbreviations to full names
		if (unit === "c") unit = "celsius";
		if (unit === "f") unit = "fahrenheit";
		if (unit === "k") unit = "kelvin";

		// Get corresponding unit to suggest
		const targetUnit = unitConversionPairs[unit];
		if (targetUnit) {
			return performConversion(value, unit, targetUnit);
		}
	}

	// Handle single unit input (automatically suggest conversion)
	if (singleUnitMatch) {
		const value = Number(singleUnitMatch[1]);
		const unitText = singleUnitMatch[2].toLowerCase();

		// Get the standard unit
		const standardUnit = getStandardUnit(unitText);

		// If the standard unit is mapped in unitConversionPairs, use it directly
		if (unitConversionPairs[standardUnit]) {
			const targetUnit = unitConversionPairs[standardUnit];
			return performConversion(value, standardUnit, targetUnit);
		}

		// Special case for "lbs" -> convert to "pounds" first
		if (unitText === "lbs" || unitText === "lb") {
			return performConversion(value, "pounds", "kilograms");
		}

		// Try to find any matching unit in the unitConversionPairs
		for (const [sourceUnit, targetUnit] of Object.entries(
			unitConversionPairs,
		)) {
			// Check if our unit is contained in the source unit name (e.g., "lb" in "pounds")
			if (sourceUnit.includes(unitText) || unitText.includes(sourceUnit)) {
				return performConversion(value, sourceUnit, targetUnit);
			}
		}
	}

	if (tempMatch) {
		const value = Number(tempMatch[1]);
		let fromUnit = tempMatch[2].toLowerCase().replace(/°/g, "");
		let toUnit = tempMatch[3].toLowerCase().replace(/°/g, "");

		// Map temperature abbreviations to full names
		if (fromUnit === "c") fromUnit = "celsius";
		if (fromUnit === "f") fromUnit = "fahrenheit";
		if (fromUnit === "k") fromUnit = "kelvin";

		if (toUnit === "c") toUnit = "celsius";
		if (toUnit === "f") toUnit = "fahrenheit";
		if (toUnit === "k") toUnit = "kelvin";

		if (!Number.isNaN(value)) {
			return performConversion(value, fromUnit, toUnit);
		}
	}

	// Check for feet and inches format: 5'10" to cm
	if (feetInchesMatch) {
		const feet = Number(feetInchesMatch[1]);
		const inches = Number(feetInchesMatch[2]);
		const toUnit = feetInchesMatch[3].toLowerCase();

		// Convert to total inches
		const totalInches = feet * 12 + inches;

		// Handle the conversion from inches to the target unit
		return performConversion(totalInches, "inches", getStandardUnit(toUnit));
	}

	// Check for feet format: 5' to cm
	if (feetMatch) {
		const value = Number(feetMatch[1]);
		const toUnit = feetMatch[2].toLowerCase();

		return performConversion(value, "feet", getStandardUnit(toUnit));
	}

	// Check for inches format: 10" to cm
	if (inchesMatch) {
		const value = Number(inchesMatch[1]);
		const toUnit = inchesMatch[2].toLowerCase();

		return performConversion(value, "inches", getStandardUnit(toUnit));
	}

	// Check for other units with no space pattern (like "5in to cm")
	if (unitMatch && !tempMatch) {
		const value = Number(unitMatch[1]);
		const fromUnit = unitMatch[2].toLowerCase();
		const toUnit = unitMatch[3].toLowerCase();

		// Map to standardized units
		const standardFromUnit = getStandardUnit(fromUnit);
		const standardToUnit = getStandardUnit(toUnit);

		if (!Number.isNaN(value)) {
			return performConversion(value, standardFromUnit, standardToUnit);
		}
	}

	// Try standard pattern first: "5 kilometers to miles"
	const standardPattern = doc.match(
		"[<value>#Value+] [<fromUnit>.+] (to|in) [<toUnit>.+]",
	);

	// Try temperature pattern without space: "10c to f"
	const temperaturePattern = doc.match(
		"(convert)? [<valueAndTemp>\\d+[cCfFkK]°?] (to|in) [<toTemp>[cCfFkK]°?]",
	);

	// Try abbreviated pattern with space: "5 km to mi"
	const abbreviatedPatternWithSpace = doc.match(
		"(convert)? [<value>#Value+] [<fromUnit>[a-zA-Z0-9/°²]+] (to|in) [<toUnit>[a-zA-Z0-9/°²]+]",
	);

	// Try abbreviated pattern without space: "10km to mi" or "5C to F"
	const abbreviatedPatternNoSpace = doc.match(
		"(convert)? [<valueAndFromUnit>#Value+[a-zA-Z0-9/°²]+] (to|in) [<toUnit>[a-zA-Z0-9/°²]+]",
	);

	// Process the temperature pattern first (special case for temperature units without spaces)
	if (temperaturePattern.found) {
		try {
			const valueAndTempGroup = temperaturePattern.groups(
				"valueAndTemp",
			) as unknown;
			const toTempGroup = temperaturePattern.groups("toTemp") as unknown;

			if (
				valueAndTempGroup &&
				typeof valueAndTempGroup === "object" &&
				"text" in valueAndTempGroup &&
				typeof (valueAndTempGroup as { text: () => string }).text ===
					"function" &&
				toTempGroup &&
				typeof toTempGroup === "object" &&
				"text" in toTempGroup &&
				typeof (toTempGroup as { text: () => string }).text === "function"
			) {
				const valueAndTempText = (valueAndTempGroup as { text: () => string })
					.text()
					.trim();
				const toTempText = (toTempGroup as { text: () => string })
					.text()
					.trim()
					.toLowerCase();

				// Extract the value and unit from valueAndTempText
				const valueMatch = valueAndTempText.match(/^(\d+(?:\.\d+)?)/);
				const tempUnitMatch = valueAndTempText.match(/([cCfFkK])°?$/);

				if (valueMatch && tempUnitMatch) {
					const value = Number(valueMatch[1]);
					let fromUnit = tempUnitMatch[1].toLowerCase();
					let toUnit = toTempText.replace(/°/, "");

					// Map temperature abbreviations to full names
					if (fromUnit === "c") fromUnit = "celsius";
					if (fromUnit === "f") fromUnit = "fahrenheit";
					if (fromUnit === "k") fromUnit = "kelvin";

					if (toUnit === "c") toUnit = "celsius";
					if (toUnit === "f") toUnit = "fahrenheit";
					if (toUnit === "k") toUnit = "kelvin";

					if (!Number.isNaN(value)) {
						return performConversion(value, fromUnit, toUnit);
					}
				}
			}
		} catch (error) {
			console.error("Error parsing temperature conversion:", error);
		}
	}

	// Process the standard pattern
	if (standardPattern.found) {
		try {
			const valueGroup = standardPattern.groups("value") as unknown;
			const fromUnitGroup = standardPattern.groups("fromUnit") as unknown;
			const toUnitGroup = standardPattern.groups("toUnit") as unknown;

			if (
				valueGroup &&
				typeof valueGroup === "object" &&
				"text" in valueGroup &&
				typeof (valueGroup as { text: () => string }).text === "function" &&
				fromUnitGroup &&
				typeof fromUnitGroup === "object" &&
				"text" in fromUnitGroup &&
				typeof (fromUnitGroup as { text: () => string }).text === "function" &&
				toUnitGroup &&
				typeof toUnitGroup === "object" &&
				"text" in toUnitGroup &&
				typeof (toUnitGroup as { text: () => string }).text === "function"
			) {
				const valueText = (valueGroup as { text: () => string }).text();
				const fromUnitText = (fromUnitGroup as { text: () => string })
					.text()
					.trim();
				const toUnitText = (toUnitGroup as { text: () => string })
					.text()
					.trim();

				// Parse value
				let value: number;
				try {
					const valueDoc = nlp(valueText);
					const numbersObj = valueDoc.numbers();
					if (
						numbersObj &&
						typeof numbersObj === "object" &&
						"toNumber" in numbersObj
					) {
						const numberObj = (
							numbersObj as { toNumber: () => unknown }
						).toNumber();
						if (
							numberObj &&
							typeof numberObj === "object" &&
							"out" in numberObj
						) {
							value = Number((numberObj as { out: () => string }).out());
						} else {
							value = Number(valueText);
						}
					} else {
						value = Number(valueText);
					}
				} catch {
					value = Number(valueText);
				}

				if (Number.isNaN(value)) {
					return [];
				}

				// Map to standardized units
				const fromUnit = unitMap[fromUnitText.toLowerCase()] || fromUnitText;
				const toUnit = unitMap[toUnitText.toLowerCase()] || toUnitText;

				return performConversion(value, fromUnit, toUnit);
			}
		} catch (error) {
			console.error("Error parsing standard unit conversion:", error);
		}
	}

	// Try abbreviated pattern with space if standard pattern doesn't match
	if (abbreviatedPatternWithSpace.found && !standardPattern.found) {
		try {
			const valueGroup = abbreviatedPatternWithSpace.groups("value") as unknown;
			const fromUnitGroup = abbreviatedPatternWithSpace.groups(
				"fromUnit",
			) as unknown;
			const toUnitGroup = abbreviatedPatternWithSpace.groups(
				"toUnit",
			) as unknown;

			if (
				valueGroup &&
				typeof valueGroup === "object" &&
				"text" in valueGroup &&
				typeof (valueGroup as { text: () => string }).text === "function" &&
				fromUnitGroup &&
				typeof fromUnitGroup === "object" &&
				"text" in fromUnitGroup &&
				typeof (fromUnitGroup as { text: () => string }).text === "function" &&
				toUnitGroup &&
				typeof toUnitGroup === "object" &&
				"text" in toUnitGroup &&
				typeof (toUnitGroup as { text: () => string }).text === "function"
			) {
				const valueText = (valueGroup as { text: () => string }).text();
				const fromUnitText = (fromUnitGroup as { text: () => string })
					.text()
					.trim();
				const toUnitText = (toUnitGroup as { text: () => string })
					.text()
					.trim();

				// Parse value
				let value: number;
				try {
					const valueDoc = nlp(valueText);
					const numbersObj = valueDoc.numbers();
					if (
						numbersObj &&
						typeof numbersObj === "object" &&
						"toNumber" in numbersObj
					) {
						const numberObj = (
							numbersObj as { toNumber: () => unknown }
						).toNumber();
						if (
							numberObj &&
							typeof numberObj === "object" &&
							"out" in numberObj
						) {
							value = Number((numberObj as { out: () => string }).out());
						} else {
							value = Number(valueText);
						}
					} else {
						value = Number(valueText);
					}
				} catch {
					value = Number(valueText);
				}

				if (Number.isNaN(value)) {
					return [];
				}

				// Map to standardized units
				const fromUnit = unitMap[fromUnitText.toLowerCase()] || fromUnitText;
				const toUnit = unitMap[toUnitText.toLowerCase()] || toUnitText;

				return performConversion(value, fromUnit, toUnit);
			}
		} catch (error) {
			console.error(
				"Error parsing abbreviated unit conversion with space:",
				error,
			);
		}
	}

	// Try abbreviated pattern without space if other patterns don't match
	if (
		abbreviatedPatternNoSpace.found &&
		!standardPattern.found &&
		!abbreviatedPatternWithSpace.found
	) {
		try {
			const valueAndFromUnitGroup = abbreviatedPatternNoSpace.groups(
				"valueAndFromUnit",
			) as unknown;
			const toUnitGroup = abbreviatedPatternNoSpace.groups("toUnit") as unknown;

			if (
				valueAndFromUnitGroup &&
				typeof valueAndFromUnitGroup === "object" &&
				"text" in valueAndFromUnitGroup &&
				typeof (valueAndFromUnitGroup as { text: () => string }).text ===
					"function" &&
				toUnitGroup &&
				typeof toUnitGroup === "object" &&
				"text" in toUnitGroup &&
				typeof (toUnitGroup as { text: () => string }).text === "function"
			) {
				const valueAndFromUnitText = (
					valueAndFromUnitGroup as { text: () => string }
				)
					.text()
					.trim();
				const toUnitText = (toUnitGroup as { text: () => string })
					.text()
					.trim();

				// Extract numeric value from the combined text
				const valueMatch = valueAndFromUnitText.match(/^(\d+(?:\.\d+)?)/);
				if (valueMatch) {
					const value = Number(valueMatch[1]);

					// Extract unit by removing the numeric part
					const fromUnitText = valueAndFromUnitText
						.replace(/^\d+(?:\.\d+)?/, "")
						.trim();

					if (!Number.isNaN(value) && fromUnitText) {
						// Map to standardized units
						const fromUnit =
							unitMap[fromUnitText.toLowerCase()] || fromUnitText;
						const toUnit = unitMap[toUnitText.toLowerCase()] || toUnitText;

						return performConversion(value, fromUnit, toUnit);
					}
				}
			}
		} catch (error) {
			console.error(
				"Error parsing abbreviated unit conversion without space:",
				error,
			);
		}
	}

	return [];

	// Helper function to perform the conversion
	function performConversion(
		value: number,
		fromUnit: string,
		toUnit: string,
		recursionDepth = 0,
	): ExecutableCommand[] {
		// Prevent infinite recursion
		if (recursionDepth > 2) {
			return [];
		}

		// Check for special conversion cases
		if (
			specialConversions[fromUnit] &&
			specialConversions[fromUnit][toUnit] !== undefined
		) {
			try {
				const result = specialConversions[fromUnit][toUnit](value);
				const roundedResult = Math.round(result * 100) / 100;
				const resultValue = roundedResult.toString();
				const resultLabel = `${resultValue} ${toUnit}`;

				return [
					{
						label: resultLabel,
						value: resultValue,
						handler: COMMAND_HANDLER.COPY_TO_CLIPBOARD,
						smartMatch: true,
					},
				];
			} catch (error) {
				console.error("Error in special conversion:", error);
			}
		}

		try {
			// Attempt the standard conversion
			// @ts-ignore: Type issues with the convert library, but it works
			const result = convert(value, fromUnit).to(toUnit);

			// Round the result to 2 decimal places if it's not an integer
			const roundedResult = Number.isInteger(result)
				? result
				: Math.round(Number(result) * 100) / 100;

			const resultValue = roundedResult.toString();
			const resultLabel = `${resultValue} ${toUnit}`;

			return [
				{
					label: resultLabel,
					value: resultValue,
					handler: COMMAND_HANDLER.COPY_TO_CLIPBOARD,
					smartMatch: true,
				},
			];
		} catch {
			// For volume conversions, handle special cases
			if (
				(fromUnit === "milliliters" || fromUnit === "milliliter") &&
				(toUnit === "ounces" || toUnit === "ounce")
			) {
				return performConversion(
					value * 0.033814,
					"fluid ounces",
					toUnit,
					recursionDepth + 1,
				);
			}

			if (
				(fromUnit === "ounces" || fromUnit === "ounce") &&
				(toUnit === "milliliters" || toUnit === "milliliter")
			) {
				return performConversion(
					value * 29.5735,
					"milliliters",
					toUnit,
					recursionDepth + 1,
				);
			}

			// For other conversion errors, try singular/plural variants
			try {
				// Remove 's' if the from unit is plural but to unit is singular
				if (fromUnit.endsWith("s") && !toUnit.endsWith("s")) {
					const singularFromUnit = fromUnit.slice(0, -1);
					return performConversion(
						value,
						singularFromUnit,
						toUnit,
						recursionDepth + 1,
					);
				}

				// Add 's' if the from unit is singular but to unit is plural
				if (!fromUnit.endsWith("s") && toUnit.endsWith("s")) {
					const pluralFromUnit = `${fromUnit}s`;
					return performConversion(
						value,
						pluralFromUnit,
						toUnit,
						recursionDepth + 1,
					);
				}

				// If both are plural or both are singular, try both variations
				if (fromUnit.endsWith("s") && toUnit.endsWith("s")) {
					const singularFromUnit = fromUnit.slice(0, -1);
					const singularToUnit = toUnit.slice(0, -1);
					return performConversion(
						value,
						singularFromUnit,
						singularToUnit,
						recursionDepth + 1,
					);
				}

				if (!fromUnit.endsWith("s") && !toUnit.endsWith("s")) {
					const pluralFromUnit = `${fromUnit}s`;
					const pluralToUnit = `${toUnit}s`;
					return performConversion(
						value,
						pluralFromUnit,
						pluralToUnit,
						recursionDepth + 1,
					);
				}
			} catch {
				// Return empty results after exhausting all conversion attempts
				return [];
			}

			// If we reach here, all conversion attempts failed
			return [];
		}
	}
}

async function fetchCurrencyRates(
	baseCurrency: string,
): Promise<Record<string, number>> {
	const apiClient = getApiClient();
	const response = await apiClient.api.data.currency[":ticker"].$get({
		param: {
			ticker: baseCurrency,
		},
	});
	const data = await response.json();
	return data;
}

export async function parseCurrencyConversion(
	query: string,
): Promise<ExecutableCommand[]> {
	// Handle formats like: "25 pln to usd", "10 eur to jpy", "1usd to cad"
	// Also handle formats without "to": "25 pln usd", "10eur jpy"
	// Also handle formats with currency symbols: "$25 to eur", "25€ to $", "£10 to ¥"

	try {
		// Define currency symbol mapping
		const currencySymbolMap: Record<string, string> = {
			$: "usd",
			"€": "eur",
			"£": "gbp",
			"¥": "jpy",
			"₽": "rub",
			"₹": "inr",
			"₩": "krw",
			"₿": "btc",
			"฿": "thb",
			"₴": "uah",
			"₺": "try",
			"₼": "azn",
			"₾": "gel",
		};

		// Direct pattern match for exactly "$50 to pln" without using regex
		// This is a robust fallback for the most common currency symbol case
		if (query.startsWith("$") && query.includes(" to ")) {
			const parts = query.split(" to ");
			if (parts.length === 2) {
				const amountPart = parts[0].replace("$", "").trim();
				const amount = Number.parseFloat(amountPart);
				const toCurrency = parts[1].trim().toLowerCase();

				if (!Number.isNaN(amount) && toCurrency.length === 3) {
					const fromCurrency = "usd";
					const rates = await fetchCurrencyRates(fromCurrency);
					const rate = rates[toCurrency];

					if (rate) {
						const value = formatCurrency(amount * rate, toCurrency);
						return [
							{
								label: value,
								value,
								handler: COMMAND_HANDLER.COPY_TO_CLIPBOARD,
								smartMatch: true,
							},
						];
					}
				}
			}
		}

		// Replace symbols with their three-letter codes for processing
		let processedQuery = query;

		// Handle direct patterns like "$50 to pln" first
		const directSymbolMatch = processedQuery.match(
			/^([\\$€£¥₽₹₩₿฿₴₺₼₾])\s*(\d+(?:\.\d+)?)\s*to\s*([a-z]{3})$/i,
		);
		if (directSymbolMatch) {
			const symbol = directSymbolMatch[1];
			const amount = directSymbolMatch[2];
			const toCurrency = directSymbolMatch[3].toLowerCase();

			if (currencySymbolMap[symbol]) {
				processedQuery = `${
					currencySymbolMap[symbol]
				} ${amount} to ${toCurrency}`;
			}
		}

		// Simple fallback to handle "$50 to" patterns that might be missed
		for (const [symbol, code] of Object.entries(currencySymbolMap)) {
			// Escape special regex characters if necessary
			const escapedSymbol = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			processedQuery = processedQuery.replace(
				new RegExp(`^${escapedSymbol}\\s*(\\d+(?:\\.\\d+)?)\\s*to`, "i"),
				`${code} $1 to`,
			);
		}

		// First handle symbols before the amount (like $25)
		for (const [symbol, code] of Object.entries(currencySymbolMap)) {
			// Escape special regex characters if necessary
			const escapedSymbol = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			processedQuery = processedQuery.replace(
				new RegExp(`${escapedSymbol}\\s*(\\d+(?:\\.\\d+)?)`, "g"),
				`${code} $1`,
			);
		}

		// Then handle symbols after the amount (like 25$)
		for (const [symbol, code] of Object.entries(currencySymbolMap)) {
			// Escape special regex characters if necessary
			const escapedSymbol = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			processedQuery = processedQuery.replace(
				new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${escapedSymbol}`, "g"),
				`$1 ${code}`,
			);
		}

		// Normalize query, handle different formats
		const normalizedQuery = processedQuery
			.toLowerCase()
			.replace(
				/(\d+(?:\.\d+)?)\s*([a-z]{3})\s*(to)?\s*([a-z]{3})/i,
				"$1 $2 to $4",
			)
			// Also normalize any remaining symbols in the target currency position
			.replace(
				/(\d+(?:\.\d+)?)\s*([a-z]{3})\s*to\s*([$€£¥₽₹₩₿฿₴₺₼₾])/i,
				(_, num, source, symbol) => {
					const code = currencySymbolMap[symbol] || symbol;
					return `${num} ${source} to ${code}`;
				},
			);

		// Match with or without spaces between number and currency
		const currencyRegex = /(\d+(?:\.\d+)?)\s*([a-z]{3})\s*(?:to)\s*([a-z]{3})/i;
		const match = normalizedQuery.match(currencyRegex);

		if (!match) {
			// Check for single currency format like "20usd", "30 eur", "$20", "20€"
			const singleCurrencyRegex = /(\d+(?:\.\d+)?)\s*([a-z]{3})\s*$/i;
			const singleMatch = normalizedQuery
				.toLowerCase()
				.match(singleCurrencyRegex);

			if (singleMatch) {
				const amount = Number.parseFloat(singleMatch[1]);
				const fromCurrency = singleMatch[2].toLowerCase();

				// For single currency, use the configured base currency as target
				const toCurrency = settingsStore.data.baseCurrency.toLowerCase();

				const rates = await fetchCurrencyRates(fromCurrency);
				const rate = rates[toCurrency];

				if (!rate) {
					return [];
				}

				const value = formatCurrency(amount * rates[toCurrency], toCurrency);

				// Return a command that will trigger the conversion when executed
				return [
					{
						label: value,
						value,
						handler: COMMAND_HANDLER.COPY_TO_CLIPBOARD,
						smartMatch: true,
					},
				];
			}

			return [];
		}

		const amount = Number.parseFloat(match[1]);
		const fromCurrency = match[2].toLowerCase();
		const toCurrency = match[3].toLowerCase();

		const rates = await fetchCurrencyRates(fromCurrency);
		const rate = rates[toCurrency];

		if (!rate) {
			return [];
		}

		const value = formatCurrency(amount * rate, toCurrency);
		// Return a command that will trigger the conversion when executed
		return [
			{
				label: value,
				value,
				handler: COMMAND_HANDLER.COPY_TO_CLIPBOARD,
				smartMatch: true,
			},
		];
	} catch (error) {
		console.error("Error in currency conversion:", error);
		return [];
	}
}
