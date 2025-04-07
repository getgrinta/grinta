import { createPlugin } from "@getgrinta/plugin";
import { parseCurrencyConversion, parseFraction, parseMathExpression, parseRelativeTime, parseTextMathExpression, parseUnitConversion } from "./lib/nlp";

export const PluginNlp = createPlugin({
    name: "NLP",
    async addSearchResults(query, context) {
        // Try parsing as a mathematical expression first
        const mathCommands = parseMathExpression(query);
        if (mathCommands.length > 0) {
            return mathCommands;
        }

        // Try parsing text-based math expressions like "five times seven"
        const textMathCommands = parseTextMathExpression(query);
        if (textMathCommands.length > 0) {
            return textMathCommands;
        }

        // Try parsing currency conversions like "10 usd to eur"
        const currencyCommands = await parseCurrencyConversion(query, context);
        if (currencyCommands.length > 0) {
            return currencyCommands;
        }

        // Try parsing unit conversions like "5 inches to cm"
        const unitConversionCommands = parseUnitConversion(query);
        if (unitConversionCommands.length > 0) {
            return unitConversionCommands;
        }

        // Try parsing relative time expressions
        const timeCommands = parseRelativeTime(query);
        if (timeCommands.length > 0) {
            return timeCommands;
        }

        // Try parsing text fractions like "two thirds"
        const fractionCommands = parseFraction(query);
        if (fractionCommands.length > 0) {
            return fractionCommands;
        }

        return [];
    },
})