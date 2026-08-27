/**
 * Input filters for fields that are digits (or a tight money charset) rather than free text.
 * Schema still rejects a letter that arrives without JavaScript; this is the progressive half.
 */

export function onlyDigits(value: string, max: number): string {
	return value.replace(/\D/g, '').slice(0, max);
}

export function onDigitsInput(assign: (value: string) => void, max: number) {
	return (event: Event) => {
		const input = event.currentTarget as HTMLInputElement;
		const next = onlyDigits(input.value, max);
		if (input.value !== next) input.value = next;
		assign(next);
	};
}

const INCOME_CHARS = /^[0-9Rr\s,.]*$/;

/**
 * Live income typing: digits, R, spaces, and one decimal (`.` or `,`) with at most two cents
 * digits. Spaces remain the thousands grouping — a third digit after the last separator is
 * blocked rather than reinterpreted as thousands.
 */
export function isAllowedIncomeInput(value: string): boolean {
	if (!INCOME_CHARS.test(value)) return false;
	const stripped = value.replace(/[Rr\s]/g, '');
	const lastDot = stripped.lastIndexOf('.');
	const lastComma = stripped.lastIndexOf(',');
	const lastSep = Math.max(lastDot, lastComma);
	if (lastSep === -1) return true;
	const after = stripped.slice(lastSep + 1);
	if (after !== '' && !/^\d+$/.test(after)) return false;
	return after.length <= 2;
}

function nextIncomeValue(input: HTMLInputElement, data: string): string {
	const start = input.selectionStart ?? input.value.length;
	const end = input.selectionEnd ?? start;
	return input.value.slice(0, start) + data + input.value.slice(end);
}

/** Block a keystroke or paste that would introduce a letter or a third cents digit. */
export function onIncomeBeforeInput(event: InputEvent) {
	if (event.data == null) return;
	const input = event.currentTarget as HTMLInputElement;
	if (!isAllowedIncomeInput(nextIncomeValue(input, event.data))) event.preventDefault();
}
