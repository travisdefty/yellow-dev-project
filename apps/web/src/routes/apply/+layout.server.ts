import { readDraft } from '$lib/server/draft';
import type { LayoutServerLoad } from './$types';

// This is what makes refresh work with no client state at all: every step's inputs come back
// server-rendered with their values already sitting in the HTML, because the draft is read from
// the cookie on every request rather than reconstructed in the browser.
//
// `locals.draft` is typed optional because it is genuinely absent outside `/apply`. Under this
// layout the hook has always populated it, and the fallback both proves that to the type system
// and keeps the whole wizard from having to optional-chain a value that is never missing.
export const load: LayoutServerLoad = ({ locals, cookies }) => ({
	draft: locals.draft ?? readDraft(cookies)
});
