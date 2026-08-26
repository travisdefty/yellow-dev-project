import type { RequestHandler } from './$types';
import { createApplication } from '$lib/server/api/applications';
import { respond } from '$lib/server/respond';

/**
 * Start an application. Takes no body. Returns the DTO plus a one-time `sessionToken` that the
 * wizard stores in the session cookie; later GETs never send the token again.
 */
export const POST: RequestHandler = () => respond(() => createApplication());
