/**
 * The three tables the specification names: `phones`, `risk_group_rates`, `applications`.
 *
 * SQLite rather than Postgres is a deliberate trade-off taken under a time budget — one app, one
 * machine, one file on a Fly volume, no second deploy target. The README states it outright. The
 * shape below is portable: integer cents, integer basis points, text dates, no SQLite-specific
 * types, so moving to Postgres is a driver swap and a regenerated migration.
 *
 * Every amount is an integer number of cents and every rate an integer number of basis points.
 * There is no float anywhere in this file, and there must never be one.
 */
import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/** The catalogue. One row per device; `cashPriceCents` is the only money field. */
export const phones = sqliteTable('phones', {
	phoneId: integer('phone_id').primaryKey({ autoIncrement: true }),
	sku: text('sku').notNull().unique(),
	brand: text('brand').notNull(),
	model: text('model').notNull(),
	colour: text('colour').notNull(),
	storageGb: integer('storage_gb').notNull(),
	cashPriceCents: integer('cash_price_cents').notNull()
});

/**
 * Deposit and interest for a risk band. Three rows — one per group — applied to every phone's
 * cash price. Rates belong to the band, not the handset: a phone's only money field is
 * `cashPriceCents`.
 */
export const riskGroupRates = sqliteTable('risk_group_rates', {
	riskGroup: text('risk_group', { enum: ['A', 'B', 'C'] }).primaryKey(),
	depositBps: integer('deposit_bps').notNull(),
	interestBps: integer('interest_bps').notNull()
});

export const applicationStatuses = ['draft', 'submitted'] as const;
export type ApplicationStatus = (typeof applicationStatuses)[number];

export const applications = sqliteTable(
	'applications',
	{
		/** Internal uuid. The applicant-facing reference is `publicReference`, not this. */
		id: text('id').primaryKey(),
		status: text('status', { enum: applicationStatuses }).notNull().default('draft'),

		/**
		 * sha256 of the session token that lives in the `yl_app` cookie. The raw token is never
		 * stored. GET/PATCH refuse unless the cookie's token hashes to this value.
		 */
		sessionTokenHash: text('session_token_hash').notNull(),
		/**
		 * What the applicant reads off review and confirmation — short, unique, and not the
		 * primary key. Confirmation URLs are keyed by this, so the internal id never appears
		 * in a bookmark or a phone call.
		 */
		publicReference: text('public_reference').notNull(),

		firstName: text('first_name'),
		lastName: text('last_name'),
		mobile: text('mobile'),
		idNumber: text('id_number'),
		/** 'YYYY-MM-DD'. Text, not a date type: the domain compares these as strings on purpose. */
		dob: text('dob'),

		/** ISO timestamp. Set once details validate, and the identity lock turns on the moment it is. */
		identityAcceptedAt: text('identity_accepted_at'),
		/**
		 * Derived from age server-side at the instant identity is accepted, then never recomputed —
		 * so a birthday rolling over mid-application cannot reprice a quote already shown. Never
		 * accepted from a client; `patchSchema` rejects a body that tries.
		 */
		riskGroup: text('risk_group', { enum: ['A', 'B', 'C'] }),

		monthlyIncomeCents: integer('monthly_income_cents'),
		/** MIME of the proof file on disk — present once the income step is complete. */
		proofMime: text('proof_mime'),
		/** Original upload name, for display when the applicant returns to this step. */
		proofFilename: text('proof_filename'),
		phoneId: integer('phone_id').references(() => phones.phoneId, { onDelete: 'set null' }),
		consentAt: text('consent_at'),

		// --- The stored quote. Written once, at submit, from server-trusted rows. ---
		//
		// Copied onto the application rather than looked up through phoneId on read, because a
		// quote is a promise made at a moment in time. Re-deriving it later would silently restate
		// the offer every time the catalogue or a pricing row moved. The rates and the cash price
		// are stored alongside the amounts so the arithmetic can be reproduced and audited.
		cashPriceCents: integer('cash_price_cents'),
		depositBps: integer('deposit_bps'),
		interestBps: integer('interest_bps'),
		depositCents: integer('deposit_cents'),
		principalCents: integer('principal_cents'),
		loanAmountCents: integer('loan_amount_cents'),
		dailyCents: integer('daily_cents'),
		totalPayableCents: integer('total_payable_cents'),

		createdAt: text('created_at')
			.notNull()
			.default(sql`(current_timestamp)`),
		updatedAt: text('updated_at')
			.notNull()
			.default(sql`(current_timestamp)`)
	},
	(table) => [
		/**
		 * "One application per ID" — but only per *submitted* one.
		 *
		 * A plain unique index would mean the first abandoned half-filled draft against an ID locks
		 * the real applicant out of their own ID number forever, with no way back that does not
		 * involve a database console. Scoping the constraint to submitted rows still refuses a
		 * genuine second application at the database, which is the rule that matters, while leaving
		 * abandoned drafts harmless.
		 */
		uniqueIndex('applications_id_number_submitted')
			.on(table.idNumber)
			.where(sql`${table.status} = 'submitted'`),
		uniqueIndex('applications_public_reference').on(table.publicReference),
		index('applications_status').on(table.status)
	]
);

export type PhoneRow = typeof phones.$inferSelect;
export type RiskGroupRateRow = typeof riskGroupRates.$inferSelect;
export type ApplicationRow = typeof applications.$inferSelect;
