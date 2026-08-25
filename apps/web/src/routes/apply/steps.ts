/**
 * One place owns step numbering, so adding or reordering a step does not mean hunting for
 * hardcoded "Step 2 of 4" strings. Keyed by the route segment under `/apply`.
 */
export const STEPS = [
	{ slug: 'details', title: 'Your details' },
	{ slug: 'income', title: 'Your income' },
	{ slug: 'phone', title: 'Choose your phone' },
	{ slug: 'review', title: 'Check and submit' }
] as const;

export const STEP_TOTAL = STEPS.length;

/** Returns undefined for anything that is not a numbered step — the confirmation, for instance. */
export function stepFor(pathname: string): { step: number; title: string } | undefined {
	const index = STEPS.findIndex(({ slug }) => pathname === `/apply/${slug}`);
	return index === -1 ? undefined : { step: index + 1, title: STEPS[index].title };
}
