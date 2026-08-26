/**
 * Income-proof files on disk beside the database — same Fly volume, different path.
 *
 * Locally: `./data/proofs/{applicationId}`. In production: `/data/proofs/{applicationId}` on the
 * mounted volume. The row stores mime type and original filename; bytes live in one file per
 * application, replaced on re-upload. Image proofs also write a sibling `{id}.thumb.jpg` for the
 * form chip.
 */
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	ACCEPTED_PROOF_MIME_SET,
	MAX_PROOF_BYTES,
	PROOF_TYPE_ERROR,
	proofMimeFromFilename
} from '$lib/upload/constants';
import { PROOF_DIR } from './data-paths.ts';

export { MAX_PROOF_BYTES, PROOF_TYPE_ERROR, proofMimeFromFilename };
export { PROOF_DIR };

/** Cap on the client-generated chip JPEG. Anything larger is ignored, not rejected. */
export const MAX_THUMB_BYTES = 64 * 1024;

/** Same set as the income-step UI — re-exported for callers that already import proof-storage. */
export { ACCEPTED_PROOF_MIME_SET as ACCEPTED_PROOF_MIMES } from '$lib/upload/constants';

export function proofPath(applicationId: string): string {
	return join(PROOF_DIR, applicationId);
}

export function proofThumbPath(applicationId: string): string {
	return join(PROOF_DIR, `${applicationId}.thumb.jpg`);
}

function ensureProofDir(): void {
	if (!existsSync(PROOF_DIR)) mkdirSync(PROOF_DIR, { recursive: true });
}

function deleteIfExists(path: string): void {
	if (existsSync(path)) unlinkSync(path);
}

export function saveProof(applicationId: string, data: Buffer, thumb?: Buffer | null): void {
	ensureProofDir();
	writeFileSync(proofPath(applicationId), data);

	const thumbPath = proofThumbPath(applicationId);
	if (thumb && thumb.length > 0 && thumb.length <= MAX_THUMB_BYTES) {
		writeFileSync(thumbPath, thumb);
	} else {
		deleteIfExists(thumbPath);
	}
}

export function deleteProof(applicationId: string): void {
	deleteIfExists(proofPath(applicationId));
	deleteIfExists(proofThumbPath(applicationId));
}

export function readProofThumb(applicationId: string): Buffer | null {
	const path = proofThumbPath(applicationId);
	if (!existsSync(path)) return null;
	return readFileSync(path);
}
