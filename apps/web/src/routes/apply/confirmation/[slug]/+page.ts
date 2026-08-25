import type { PageLoad } from './$types';

/**
 * The reference is the route. Not prerendered and not held in state: this is the one URL an
 * applicant might bookmark or send to someone, so it has to render from the address alone.
 */
export const load: PageLoad = ({ params }) => ({ slug: params.slug });
