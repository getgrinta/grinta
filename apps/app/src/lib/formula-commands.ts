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
			},
		];
	}
	return [];
}

export function parseRelativeTime(query: string): ExecutableCommand[] {
	const doc = nlp(query);
	const nlpMatch = doc.match(
		"[<have>#Value+] (minute|minutes|hour|hours|day|days|week|weeks|month|months|year|years) (ago|from now)",
	);

	if (!nlpMatch.found) {
		return [];
	}

	const numberText = Number(nlpMatch.groups("have").text());
	const unit = nlpMatch
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

	const date = new Date(Date.now() + ms * numberText * direction);
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
		},
	];
}
