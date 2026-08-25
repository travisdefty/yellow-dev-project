/**
 * The one way a handler refuses.
 *
 * Handlers throw this; the `+server.ts` adapters catch it and turn it into a response. That is the
 * whole reason it exists rather than each handler returning a status alongside its data: it keeps
 * the handler signatures honest (they return the thing, or they throw) and it keeps every
 * framework-specific concern — `json()`, `Response`, status codes on the wire — on the adapter side
 * of the line. Nothing in `lib/server/api/` imports from `@sveltejs/kit`, and this class is most of
 * the reason nothing needs to.
 *
 * The body deliberately mirrors what a form action hands back (`ActionFailure`): `errors` keyed by
 * field for anything that binds to an input, `message` for anything that does not and becomes a
 * toast. So an API refusal can be forwarded to the browser unchanged instead of translated.
 */
import type { ActionFailure } from '$lib/field-errors';

export class ApiError extends Error {
	constructor(
		readonly status: number,
		readonly body: ActionFailure
	) {
		super(body.message ?? JSON.stringify(body.errors ?? {}));
		this.name = 'ApiError';
	}
}

/** A refusal that binds to specific inputs. */
export function fieldError(status: number, errors: Record<string, string>): ApiError {
	return new ApiError(status, { errors });
}

/** A refusal with nowhere to point — a toast, not a red line under a field. */
export function messageError(status: number, message: string): ApiError {
	return new ApiError(status, { message });
}

export function isApiError(error: unknown): error is ApiError {
	return error instanceof ApiError;
}
