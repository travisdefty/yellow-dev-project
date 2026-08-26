import type { LayoutServerLoad } from './$types';

/**
 * What the wizard's inputs need in order to come back filled in — and nothing else.
 *
 * This is what makes refresh work with no client state at all: every step's values are already in
 * the server-rendered HTML, read from the record on each request rather than restored in the
 * browser.
 *
 * Listed field by field rather than handed the whole application, because this payload is
 * serialised to the client. The record also carries `riskGroup`, the stored quote and the
 * application id; none of them belong in a page's data just because they happened to be on the
 * same row. `riskGroup` in particular is a server-derived fact the client has no business seeing.
 *
 * `locals.draft` is typed optional because it is genuinely absent outside the wizard — including
 * on confirmation, which shares this layout but never starts or resumes an application.
 */
export const load: LayoutServerLoad = ({ locals }) => {
	const draft = locals.draft;
	return {
		draft: {
			firstName: draft?.firstName,
			lastName: draft?.lastName,
			mobile: draft?.mobile,
			idNumber: draft?.idNumber,
			dob: draft?.dob,
			identityAcceptedAt: draft?.identityAcceptedAt,
			consented: Boolean(draft?.consentAt),
			monthlyIncomeCents: draft?.monthlyIncomeCents,
			proofFilename: draft?.proofFilename,
			proofIsImage: Boolean(draft?.proofMime?.startsWith('image/'))
		}
	};
};
