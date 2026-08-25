/**
 * The client half of talking to a step's server action.
 *
 * The same schema runs in both places: here, so a mistake is visible before a round trip, and
 * again in the action, because a browser is not a trust boundary. Neither call is the "real" one.
 */
import { toast } from 'svelte-sonner';
import type { SubmitFunction } from '@sveltejs/kit';
import { fieldErrors, type ActionFailure, type Parser } from '$lib/field-errors';

/**
 * A `use:enhance` submit function that validates on the client first and cancels the submission if
 * the values do not parse, so field errors appear without touching the network.
 *
 * `values()` is a thunk rather than a value because it is read at submit time, not at setup time.
 */
export function validatedSubmit<T>(
	schema: Parser<T>,
	values: () => unknown,
	setErrors: (errors: Record<string, string>) => void
): SubmitFunction {
	return ({ cancel }) => {
		const parsed = schema.safeParse(values());
		if (!parsed.success) {
			setErrors(fieldErrors(parsed.error));
			cancel();
			return;
		}
		setErrors({});

		return async ({ result, update }) => {
			if (result.type === 'failure') {
				const failure = result.data as ActionFailure | undefined;
				if (failure?.errors) setErrors(failure.errors);
				// A non-field error — affordability, say, whose input lives two steps back. There is no
				// input to hang it on, so it is announced instead.
				if (failure?.message) toast.error(failure.message);
				return;
			}
			// `reset: false` because a step that fails server-side must not blank what was typed.
			await update({ reset: false });
		};
	};
}
