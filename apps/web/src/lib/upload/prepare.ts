/**
 * Client-side preparation for every accepted proof upload.
 *
 * Runs as soon as a file is chosen: photos are resized and re-encoded, and a tiny JPEG is produced
 * for the form chip. PDFs pass through if they already fit the size limit. Anything that cannot be
 * processed is rejected rather than sent raw.
 */
import { MAX_PROOF_BYTES } from './constants.ts';

const MAX_IMAGE_EDGE = 1920;
const JPEG_QUALITY = 0.85;
const THUMB_EDGE = 112;
const THUMB_QUALITY = 0.7;

export type PreparedProof = {
	file: File;
	thumb: File | null;
};

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(result) => (result ? resolve(result) : reject(new Error('Could not prepare image.'))),
			'image/jpeg',
			quality
		);
	});
}

function drawScaled(bitmap: ImageBitmap, maxEdge: number): HTMLCanvasElement {
	const longest = Math.max(bitmap.width, bitmap.height);
	const scale = longest > maxEdge ? maxEdge / longest : 1;
	const canvas = document.createElement('canvas');
	canvas.width = Math.round(bitmap.width * scale);
	canvas.height = Math.round(bitmap.height * scale);
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Could not prepare image.');
	ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
	return canvas;
}

async function prepareImageUpload(file: File): Promise<PreparedProof> {
	const bitmap = await createImageBitmap(file);
	try {
		const fullCanvas = drawScaled(bitmap, MAX_IMAGE_EDGE);
		const thumbCanvas = drawScaled(bitmap, THUMB_EDGE);
		const [fullBlob, thumbBlob] = await Promise.all([
			canvasToJpeg(fullCanvas, JPEG_QUALITY),
			canvasToJpeg(thumbCanvas, THUMB_QUALITY)
		]);
		const base = file.name.replace(/\.[^.]+$/, '') || 'proof';
		const now = Date.now();
		return {
			file: new File([fullBlob], `${base}.jpg`, { type: 'image/jpeg', lastModified: now }),
			thumb: new File([thumbBlob], `${base}.thumb.jpg`, { type: 'image/jpeg', lastModified: now })
		};
	} finally {
		bitmap.close();
	}
}

function isPdf(file: File): boolean {
	return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}

function isRasterImage(file: File): boolean {
	return file.type.startsWith('image/') && file.type !== 'image/gif';
}

/** Prepare one proof file for upload. Every accepted type goes through here. */
export async function prepareFileUpload(file: File): Promise<PreparedProof> {
	const prepared = isRasterImage(file)
		? await prepareImageUpload(file)
		: { file, thumb: null };

	if (prepared.file.size > MAX_PROOF_BYTES) {
		throw new Error(
			isPdf(file)
				? 'File is too large. Try a smaller photo or PDF under 5 MB.'
				: 'File is too large after preparation. Try a smaller photo or PDF under 5 MB.'
		);
	}

	return prepared;
}
