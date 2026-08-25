/**
 * Deposit and interest by risk band only — never per phone. Band A (18–30) carries the highest
 * interest because it is the thinnest credit history; B is the middle band; C (51–65) takes a
 * larger deposit because the 360-day term can run past retirement age.
 *
 * The rates live on a row, not in code, on purpose: phase 5 replaces this module with a
 * `phone_pricing` table read and nothing else in the app moves — `quote()` still takes a row
 * shaped like this.
 */
import type { PricingRow, RiskGroup } from '@yellow/domain';

export const pricingRows: readonly PricingRow[] = [
	{ riskGroup: 'A', depositBps: 1500, interestBps: 2400 },
	{ riskGroup: 'B', depositBps: 1500, interestBps: 2000 },
	{ riskGroup: 'C', depositBps: 2000, interestBps: 2800 }
];

export function pricingFor(riskGroup: RiskGroup): PricingRow {
	// Non-null because the three rows above cover every RiskGroup the domain package can produce —
	// this throwing would mean the two packages have drifted, which is a bug worth a loud failure.
	return pricingRows.find((row) => row.riskGroup === riskGroup)!;
}
