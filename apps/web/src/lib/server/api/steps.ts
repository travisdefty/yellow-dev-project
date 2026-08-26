/**
 * Which step an application still owes, expressed as a step *name* rather than a URL.
 *
 * This is the single source of truth for step order, and it lives here — on the API side — rather
 * than in the wizard, because the ordering is a rule about the record, not about the routing. Both
 * consumers need it and neither may disagree with the other: `draft.ts` maps these names onto
 * `/apply/*` paths for redirects, and `patchApplication` uses them to refuse a step that has not
 * been earned. If this logic were duplicated, the copy that drifted would be the one guarding
 * writes, which is the worse half to get wrong.
 */
import type { Application } from './applications.ts';

export const STEP_ORDER = ['details', 'income', 'phone', 'submit'] as const;
export type Step = (typeof STEP_ORDER)[number];

/**
 * Completeness, not correctness: each step is "done" once the field it writes is present. The
 * validity of what was written was settled by the schema at the moment it was written.
 *
 * `== null` rather than `=== undefined` on purpose. These values arrive from the database as
 * `null` for an unset column and from a JSON response as a missing key; a strict check would read
 * a null income as "income already given" and let an applicant walk straight past the step.
 */
export function nextRequiredStep(
	application: Pick<
		Application,
		'identityAcceptedAt' | 'consentAt' | 'monthlyIncomeCents' | 'proofFilename' | 'phoneId'
	>
): Step {
	if (application.identityAcceptedAt == null || application.consentAt == null) return 'details';
	if (application.monthlyIncomeCents == null || application.proofFilename == null) return 'income';
	if (application.phoneId == null) return 'phone';
	return 'submit';
}

/** True when `step` is at or before the step the application currently owes. */
export function isStepUnlocked(
	application: Parameters<typeof nextRequiredStep>[0],
	step: Step
): boolean {
	return STEP_ORDER.indexOf(step) <= STEP_ORDER.indexOf(nextRequiredStep(application));
}
