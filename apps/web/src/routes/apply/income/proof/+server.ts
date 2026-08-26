import { error } from '@sveltejs/kit';
import { readProofThumb } from '$lib/server/proof-storage';
import type { RequestHandler } from './$types';

/**
 * The 56px chip on the income form. Cookie-authenticated via the /apply hook — never hung off
 * GET /api/applications/:id, which is reachable by anyone who has the id.
 */
export const GET: RequestHandler = ({ locals }) => {
	const applicationId = locals.draft?.applicationId;
	if (!applicationId) error(404);

	const thumb = readProofThumb(applicationId);
	if (!thumb) error(404);

	return new Response(new Uint8Array(thumb), {
		headers: {
			'Content-Type': 'image/jpeg',
			'Cache-Control': 'private, no-store',
			'Content-Disposition': 'inline'
		}
	});
};
