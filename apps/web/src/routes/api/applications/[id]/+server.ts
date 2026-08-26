import type { RequestHandler } from './$types';
import { getApplication, patchApplication } from '$lib/server/api/applications';
import { messageError } from '$lib/server/api/errors';
import { requireAppSession } from '$lib/server/app-session';
import { errorResponse, respond } from '$lib/server/respond';

export const GET: RequestHandler = (event) =>
	respond(() => {
		requireAppSession(event, event.params.id);
		return getApplication(event.params.id);
	});

/**
 * Every step writes through here, submit included. `patchApplication` owns the rules; this only
 * has to get the body out of the request without letting a malformed one become a 500 — which is
 * why the parse failure is turned into a response here rather than thrown past `respond`, whose
 * try/catch is long finished by the time an awaited parse rejects.
 */
export const PATCH: RequestHandler = async (event) => {
	const { params, request } = event;
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return errorResponse(messageError(400, 'Expected a JSON body.'));
	}
	return respond(() => {
		requireAppSession(event, params.id);
		return patchApplication(params.id, body);
	});
};
