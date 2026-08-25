/**
 * Turning a schema failure into one message per field. Shared by the browser and by the server
 * actions, and deliberately free of any UI import so a `+page.server.ts` can use it without
 * dragging a toast library into the server bundle.
 */

/**
 * The shape of a schema failure, described structurally rather than imported.
 *
 * Zod is a dependency of `@yellow/domain` and of nothing else — the web app consumes schemas, it
 * does not build them, so it has no business installing a second copy to name a type with.
 */
export type SchemaError = { issues: readonly { path: PropertyKey[]; message: string }[] };

export type Parser<T> = {
	safeParse(value: unknown): { success: true; data: T } | { success: false; error: SchemaError };
};

/** What a failed action hands back. Field errors bind to inputs; a bare message becomes a toast. */
export type ActionFailure = { errors?: Record<string, string>; message?: string };

/**
 * Keyed by the first path segment — which is exactly the key the `FieldError` components are
 * already pointed at by `aria-describedby`.
 *
 * First issue wins. A field with two things wrong shows the first; fixing it reveals the next,
 * which reads better than a stack of red under one input.
 */
export function fieldErrors(error: SchemaError) {
	const errors: Record<string, string> = {};
	for (const issue of error.issues) {
		const key = String(issue.path[0] ?? '');
		if (key && !(key in errors)) errors[key] = issue.message;
	}
	return errors;
}
