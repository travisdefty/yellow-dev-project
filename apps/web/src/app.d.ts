// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { Draft } from '$lib/server/draft';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			// Only set by hooks.server.ts for pathnames under /apply — everywhere else it is genuinely
			// absent, not just unused. Marking it optional says that honestly instead of making every
			// route outside the wizard assert a value that was never populated.
			draft?: Draft;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
