export function formatCurrency(amount: number, currency: string) {
	const locale = window.navigator.language ?? "en";
	return new Intl.NumberFormat(locale, {
		style: "currency",
		currency,
	}).format(amount);
}
