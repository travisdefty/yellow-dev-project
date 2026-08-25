/**
 * The catalogue and its rates, as seed data.
 *
 * This was `$lib/server/fixtures/` — imported at request time and priced in the route handler.
 * Now it is written into the database once, at boot, and nothing imports it to serve a request.
 * That is the actual difference between phase 2 and phase 3: the numbers stopped being code.
 *
 * Seeding is idempotent and only fills an empty catalogue, so a restart never duplicates rows and
 * never overwrites a rate someone changed in the database — which is what makes it safe to run on
 * every boot, including on the Fly volume where the file survives the deploy.
 */
import type { RiskGroup } from '@yellow/domain';

type PhoneSeed = {
	phoneId: number;
	sku: string;
	brand: string;
	model: string;
	colour: string;
	storageGb: number;
	cashPriceCents: number;
};

export const phoneSeed: readonly PhoneSeed[] = [
	{ phoneId: 1, sku: 'APL-IP15-128-BLK', brand: 'Apple', model: 'iPhone 15', colour: 'Black', storageGb: 128, cashPriceCents: 1699900 },
	{ phoneId: 2, sku: 'APL-IP14-128-BLU', brand: 'Apple', model: 'iPhone 14', colour: 'Blue', storageGb: 128, cashPriceCents: 1299900 },
	{ phoneId: 3, sku: 'APL-IPSE-064-MID', brand: 'Apple', model: 'iPhone SE', colour: 'Midnight', storageGb: 64, cashPriceCents: 849900 },
	{ phoneId: 4, sku: 'SAM-S24-256-ONX', brand: 'Samsung', model: 'Galaxy S24', colour: 'Onyx Black', storageGb: 256, cashPriceCents: 1899900 },
	{ phoneId: 5, sku: 'SAM-A55-128-NVY', brand: 'Samsung', model: 'Galaxy A55', colour: 'Awesome Navy', storageGb: 128, cashPriceCents: 899900 },
	{ phoneId: 6, sku: 'SAM-A15-064-BLU', brand: 'Samsung', model: 'Galaxy A15', colour: 'Blue Black', storageGb: 64, cashPriceCents: 379900 },
	{ phoneId: 7, sku: 'XIA-RN13-128-MID', brand: 'Xiaomi', model: 'Redmi Note 13', colour: 'Midnight Black', storageGb: 128, cashPriceCents: 429900 },
	{ phoneId: 8, sku: 'XIA-R13C-064-NVY', brand: 'Xiaomi', model: 'Redmi 13C', colour: 'Navy Blue', storageGb: 64, cashPriceCents: 249900 },
	{ phoneId: 9, sku: 'OPP-R11F-256-OCN', brand: 'Oppo', model: 'Reno 11F', colour: 'Ocean Blue', storageGb: 256, cashPriceCents: 799900 },
	{ phoneId: 10, sku: 'OPP-A78-128-AQA', brand: 'Oppo', model: 'A78', colour: 'Aqua Green', storageGb: 128, cashPriceCents: 499900 },
	{ phoneId: 11, sku: 'NOK-G42-128-PRP', brand: 'Nokia', model: 'G42', colour: 'So Purple', storageGb: 128, cashPriceCents: 399900 },
	{ phoneId: 12, sku: 'NOK-C32-064-CHR', brand: 'Nokia', model: 'C32', colour: 'Charcoal', storageGb: 64, cashPriceCents: 219900 }
];

/**
 * Deposit and interest by risk band. Band A (18-30) carries the highest interest because it is the
 * thinnest credit history; B is the middle band; C (51-65) takes a larger deposit because the
 * 360-day term can run past retirement age.
 *
 * Applied to every phone, so all twelve currently share a band's rates — but they are stored per
 * phone per band, so a single handset can be repriced later with an UPDATE and no schema change.
 */
export const bandRates: readonly { riskGroup: RiskGroup; depositBps: number; interestBps: number }[] = [
	{ riskGroup: 'A', depositBps: 1500, interestBps: 2400 },
	{ riskGroup: 'B', depositBps: 1500, interestBps: 2000 },
	{ riskGroup: 'C', depositBps: 2000, interestBps: 2800 }
];

/** The 36 rows, expanded: every phone against every band. */
export const pricingSeed = phoneSeed.flatMap((phone) =>
	bandRates.map((rate) => ({ phoneId: phone.phoneId, ...rate }))
);
