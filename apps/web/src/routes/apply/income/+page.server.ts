import { fail, redirect } from '@sveltejs/kit';
import { parseRandsToCents } from '@yellow/domain';
import { MAX_THUMB_BYTES, proofMimeFromFilename } from '$lib/server/proof-storage';
import type { ProofUpload } from '$lib/server/api/applications';
import { nextStepAfter, requireStep, writeIncomeWithProof } from '$lib/server/draft';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	requireStep(locals.draft!, 'income');
	return {};
};

export const actions = {
	default: async (event) => {
		const { request, locals, url } = event;
		const before = locals.draft!;
		requireStep(before, 'income');

		const form = await request.formData();
		const monthlyIncomeCents = parseRandsToCents(String(form.get('income') ?? ''));

		if (monthlyIncomeCents === null) {
			return fail(400, { errors: { income: 'Enter an amount, for example R 12 500.' } });
		}

		const proofEntry = form.get('proof');
		let proof: ProofUpload | 'keep';

		if (proofEntry instanceof File && proofEntry.size > 0) {
			const mime = proofEntry.type || proofMimeFromFilename(proofEntry.name) || 'application/octet-stream';
			proof = {
				data: Buffer.from(await proofEntry.arrayBuffer()),
				mime,
				filename: proofEntry.name,
				thumb: await optionalJpegThumb(form.get('proofThumb'))
			};
		} else if (before.proofFilename) {
			proof = 'keep';
		} else {
			return fail(400, { errors: { proof: 'Upload a payslip or bank statement.' } });
		}

		const result = await writeIncomeWithProof(event, monthlyIncomeCents, proof);
		if (!result.ok) {
			const errors = result.failure.errors;
			return fail(result.status, {
				...result.failure,
				errors: errors?.monthlyIncomeCents ? { income: errors.monthlyIncomeCents, ...errors } : errors
			});
		}

		if (before.phoneId != null && result.draft.phoneId == null) {
			redirect(303, '/apply/phone?repick=1');
		}

		redirect(303, nextStepAfter(result.draft, url, '/apply/phone'));
	}
} satisfies Actions;

async function optionalJpegThumb(entry: FormDataEntryValue | null): Promise<Buffer | undefined> {
	if (!(entry instanceof File) || entry.size === 0 || entry.size > MAX_THUMB_BYTES) return undefined;
	if (entry.type !== 'image/jpeg') return undefined;
	return Buffer.from(await entry.arrayBuffer());
}
