/** Shared between the income-step UI and server proof storage. */

export const ACCEPTED_PROOF_MIMES = [
	'image/jpeg',
	'image/png',
	'image/webp',
	'application/pdf'
] as const;

export type AcceptedProofMime = (typeof ACCEPTED_PROOF_MIMES)[number];

export const ACCEPTED_PROOF_MIME_SET = new Set<string>(ACCEPTED_PROOF_MIMES);

export const MAX_PROOF_BYTES = 5 * 1024 * 1024;

export const PROOF_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';

export const PROOF_TYPE_ERROR = 'Upload a JPG, PNG, WebP or PDF payslip or bank statement.';

export function proofMimeFromFilename(name: string): AcceptedProofMime | null {
	if (/\.pdf$/i.test(name)) return 'application/pdf';
	if (/\.jpe?g$/i.test(name)) return 'image/jpeg';
	if (/\.png$/i.test(name)) return 'image/png';
	if (/\.webp$/i.test(name)) return 'image/webp';
	return null;
}

export function isAcceptedProof(file: File): boolean {
	const mime = file.type || proofMimeFromFilename(file.name);
	return mime != null && ACCEPTED_PROOF_MIME_SET.has(mime);
}
