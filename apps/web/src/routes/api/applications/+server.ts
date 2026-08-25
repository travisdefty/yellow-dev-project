import type { RequestHandler } from './$types';
import { createApplication } from '$lib/server/api/applications';
import { respond } from '$lib/server/respond';

/** Start an application. Takes no body — there is nothing to say yet, only an id to be given. */
export const POST: RequestHandler = () => respond(() => createApplication());
