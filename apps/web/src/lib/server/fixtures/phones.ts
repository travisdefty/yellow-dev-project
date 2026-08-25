/**
 * The catalogue, as the API will one day return it: one object per device, in integer cents.
 * Under `$lib/server/` so importing it from client code is a build error rather than a review
 * comment — the client must never see a rate or compute a price.
 *
 * `cashPriceCents` is the only money field here. Deposit, principal, loan amount and daily price
 * are no longer literals — they are computed by `quote()` from `@yellow/domain` against a pricing
 * row (`./pricing`) chosen by the applicant's risk band, because that is now knowable at request
 * time. In phase 4 this module is deleted and `+page.server.ts` fetches the catalogue over HTTP
 * instead; the shape does not change, so neither does the card.
 */
import type { Phone } from '$lib/catalogue';

export const phoneFixtures: readonly Phone[] = [
	{
		phoneId: 1,
		sku: 'APL-IP15-128-BLK',
		brand: 'Apple',
		model: 'iPhone 15',
		colour: 'Black',
		storageGb: 128,
		cashPriceCents: 1699900
	},
	{
		phoneId: 2,
		sku: 'APL-IP14-128-BLU',
		brand: 'Apple',
		model: 'iPhone 14',
		colour: 'Blue',
		storageGb: 128,
		cashPriceCents: 1299900
	},
	{
		phoneId: 3,
		sku: 'APL-IPSE-064-MID',
		brand: 'Apple',
		model: 'iPhone SE',
		colour: 'Midnight',
		storageGb: 64,
		cashPriceCents: 849900
	},
	{
		phoneId: 4,
		sku: 'SAM-S24-256-ONX',
		brand: 'Samsung',
		model: 'Galaxy S24',
		colour: 'Onyx Black',
		storageGb: 256,
		cashPriceCents: 1899900
	},
	{
		phoneId: 5,
		sku: 'SAM-A55-128-NVY',
		brand: 'Samsung',
		model: 'Galaxy A55',
		colour: 'Awesome Navy',
		storageGb: 128,
		cashPriceCents: 899900
	},
	{
		phoneId: 6,
		sku: 'SAM-A15-064-BLU',
		brand: 'Samsung',
		model: 'Galaxy A15',
		colour: 'Blue Black',
		storageGb: 64,
		cashPriceCents: 379900
	},
	{
		phoneId: 7,
		sku: 'XIA-RN13-128-MID',
		brand: 'Xiaomi',
		model: 'Redmi Note 13',
		colour: 'Midnight Black',
		storageGb: 128,
		cashPriceCents: 429900
	},
	{
		phoneId: 8,
		sku: 'XIA-R13C-064-NVY',
		brand: 'Xiaomi',
		model: 'Redmi 13C',
		colour: 'Navy Blue',
		storageGb: 64,
		cashPriceCents: 249900
	},
	{
		phoneId: 9,
		sku: 'OPP-R11F-256-OCN',
		brand: 'Oppo',
		model: 'Reno 11F',
		colour: 'Ocean Blue',
		storageGb: 256,
		cashPriceCents: 799900
	},
	{
		phoneId: 10,
		sku: 'OPP-A78-128-AQA',
		brand: 'Oppo',
		model: 'A78',
		colour: 'Aqua Green',
		storageGb: 128,
		cashPriceCents: 499900
	},
	{
		phoneId: 11,
		sku: 'NOK-G42-128-PRP',
		brand: 'Nokia',
		model: 'G42',
		colour: 'So Purple',
		storageGb: 128,
		cashPriceCents: 399900
	},
	{
		phoneId: 12,
		sku: 'NOK-C32-064-CHR',
		brand: 'Nokia',
		model: 'C32',
		colour: 'Charcoal',
		storageGb: 64,
		cashPriceCents: 219900
	}
];
