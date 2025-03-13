// Cursor: Do not include original expressions in the label ffs.
import nlp from "compromise";
import dayjs from "dayjs";
import { parse } from "equation-parser";
import { resolve } from "equation-resolver";
import { match } from "ts-pattern";
import {
	COMMAND_HANDLER,
	type ExecutableCommand,
} from "./store/commands.svelte";

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
	const parsed = parse(query);
	const resolved = resolve(parsed);
	if (resolved.type === "number") {
		const value = resolved.value.toString();
		return [
			{
				label: value,
				value,
				handler: COMMAND_HANDLER.FORMULA_RESULT,
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
							handler: COMMAND_HANDLER.FORMULA_RESULT,
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
			}
			// Check for square root
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
			}
			// Check for log
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
			}
			// Regular number
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
					handler: COMMAND_HANDLER.FORMULA_RESULT,
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
							handler: COMMAND_HANDLER.FORMULA_RESULT,
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
							handler: COMMAND_HANDLER.FORMULA_RESULT,
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
							handler: COMMAND_HANDLER.FORMULA_RESULT,
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
							handler: COMMAND_HANDLER.FORMULA_RESULT,
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
							handler: COMMAND_HANDLER.FORMULA_RESULT,
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
							handler: COMMAND_HANDLER.FORMULA_RESULT,
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
					handler: COMMAND_HANDLER.FORMULA_RESULT,
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
								handler: COMMAND_HANDLER.FORMULA_RESULT,
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
							handler: COMMAND_HANDLER.FORMULA_RESULT,
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
							handler: COMMAND_HANDLER.FORMULA_RESULT,
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
			handler: COMMAND_HANDLER.FORMULA_RESULT,
			smartMatch: true,
		},
	];
}
