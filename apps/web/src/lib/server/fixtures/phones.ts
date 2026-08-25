/**
 * The catalogue, as the API will one day return it: priced, in integer cents, one object per
 * device. Under `$lib/server/` so importing it from client code is a build error rather than a
 * review comment — the client must never see a rate or compute a price.
 *
 * The numbers are literals, not a calculation, because there is no pricing code yet. They were
 * derived once at a 15% deposit and 24% annual interest over 360 days — the middle risk band,
 * since no age has been collected at this point in the flow. `packages/domain` generates them in
 * phase 2 and the API serves them in phase 4; this module is deleted then, and `+page.server.ts`
 * fetches instead. The shape does not change, so neither does the card.
 */
import type { PhoneItem } from '$lib/catalogue';

export const phoneFixtures: readonly PhoneItem[] = [
	{
		phoneId: 1,
		sku: 'APL-IP15-128-BLK',
		brand: 'Apple',
		model: 'iPhone 15',
		colour: 'Black',
		storageGb: 128,
		cashPriceCents: 1699900,
		depositCents: 254985,
		principalCents: 1444915,
		loanAmountCents: 1791695,
		dailyCents: 4977
	},
	{
		phoneId: 2,
		sku: 'APL-IP14-128-BLU',
		brand: 'Apple',
		model: 'iPhone 14',
		colour: 'Blue',
		storageGb: 128,
		cashPriceCents: 1299900,
		depositCents: 194985,
		principalCents: 1104915,
		loanAmountCents: 1370095,
		dailyCents: 3806
	},
	{
		phoneId: 3,
		sku: 'APL-IPSE-064-MID',
		brand: 'Apple',
		model: 'iPhone SE',
		colour: 'Midnight',
		storageGb: 64,
		cashPriceCents: 849900,
		depositCents: 127485,
		principalCents: 722415,
		loanAmountCents: 895795,
		dailyCents: 2488
	},
	{
		phoneId: 4,
		sku: 'SAM-S24-256-ONX',
		brand: 'Samsung',
		model: 'Galaxy S24',
		colour: 'Onyx Black',
		storageGb: 256,
		cashPriceCents: 1899900,
		depositCents: 284985,
		principalCents: 1614915,
		loanAmountCents: 2002495,
		dailyCents: 5562
	},
	{
		phoneId: 5,
		sku: 'SAM-A55-128-NVY',
		brand: 'Samsung',
		model: 'Galaxy A55',
		colour: 'Awesome Navy',
		storageGb: 128,
		cashPriceCents: 899900,
		depositCents: 134985,
		principalCents: 764915,
		loanAmountCents: 948495,
		dailyCents: 2635
	},
	{
		phoneId: 6,
		sku: 'SAM-A15-064-BLU',
		brand: 'Samsung',
		model: 'Galaxy A15',
		colour: 'Blue Black',
		storageGb: 64,
		cashPriceCents: 379900,
		depositCents: 56985,
		principalCents: 322915,
		loanAmountCents: 400415,
		dailyCents: 1112
	},
	{
		phoneId: 7,
		sku: 'XIA-RN13-128-MID',
		brand: 'Xiaomi',
		model: 'Redmi Note 13',
		colour: 'Midnight Black',
		storageGb: 128,
		cashPriceCents: 429900,
		depositCents: 64485,
		principalCents: 365415,
		loanAmountCents: 453115,
		dailyCents: 1259
	},
	{
		phoneId: 8,
		sku: 'XIA-R13C-064-NVY',
		brand: 'Xiaomi',
		model: 'Redmi 13C',
		colour: 'Navy Blue',
		storageGb: 64,
		cashPriceCents: 249900,
		depositCents: 37485,
		principalCents: 212415,
		loanAmountCents: 263395,
		dailyCents: 732
	},
	{
		phoneId: 9,
		sku: 'OPP-R11F-256-OCN',
		brand: 'Oppo',
		model: 'Reno 11F',
		colour: 'Ocean Blue',
		storageGb: 256,
		cashPriceCents: 799900,
		depositCents: 119985,
		principalCents: 679915,
		loanAmountCents: 843095,
		dailyCents: 2342
	},
	{
		phoneId: 10,
		sku: 'OPP-A78-128-AQA',
		brand: 'Oppo',
		model: 'A78',
		colour: 'Aqua Green',
		storageGb: 128,
		cashPriceCents: 499900,
		depositCents: 74985,
		principalCents: 424915,
		loanAmountCents: 526895,
		dailyCents: 1464
	},
	{
		phoneId: 11,
		sku: 'NOK-G42-128-PRP',
		brand: 'Nokia',
		model: 'G42',
		colour: 'So Purple',
		storageGb: 128,
		cashPriceCents: 399900,
		depositCents: 59985,
		principalCents: 339915,
		loanAmountCents: 421495,
		dailyCents: 1171
	},
	{
		phoneId: 12,
		sku: 'NOK-C32-064-CHR',
		brand: 'Nokia',
		model: 'C32',
		colour: 'Charcoal',
		storageGb: 64,
		cashPriceCents: 219900,
		depositCents: 32985,
		principalCents: 186915,
		loanAmountCents: 231775,
		dailyCents: 644
	}
];
