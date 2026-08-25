/**
 * One outline is reused for every device, tinted per brand. Falls back to the muted ink tone for a
 * brand not in the map, so a new catalogue entry never renders untinted.
 */
const BRAND_TINTS: Record<string, string> = {
	apple: 'var(--foreground)',
	samsung: 'var(--foreground)',
	xiaomi: 'var(--destructive)',
	oppo: 'var(--color-positive)',
	nokia: 'var(--accent-foreground)'
};

export function tintForBrand(brand: string): string {
	return BRAND_TINTS[brand.trim().toLowerCase()] ?? 'var(--muted-foreground)';
}
