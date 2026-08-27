import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	MAX_MONTHLY_INCOME_CENTS,
	MIN_MONTHLY_INCOME_CENTS,
	formatCentsAsRandsInput,
	parseRandsToCents
} from './money.ts';
import { incomeSchema } from './schemas.ts';

test('parseRandsToCents accepts SA formats and rejects letters', () => {
	assert.equal(parseRandsToCents('R 12 500'), 1_250_000);
	assert.equal(parseRandsToCents('12 500,50'), 1_250_050);
	assert.equal(parseRandsToCents('12.500'), 1_250_000);
	assert.equal(parseRandsToCents('12abc'), null);
	assert.equal(parseRandsToCents('1e5'), null);
	assert.equal(parseRandsToCents('$100'), null);
	assert.equal(parseRandsToCents('12a500'), null);
});

test('parseRandsToCents returns 0 for zero and null for overflow', () => {
	assert.equal(parseRandsToCents('0'), 0);
	assert.equal(parseRandsToCents('0.50'), 50);
	assert.equal(parseRandsToCents('9'.repeat(20)), null);
});

test('incomeSchema requires at least R 1 and caps the top end', () => {
	assert.equal(incomeSchema.safeParse({ monthlyIncomeCents: 0 }).success, false);
	assert.equal(incomeSchema.safeParse({ monthlyIncomeCents: 1 }).success, false);
	assert.equal(incomeSchema.safeParse({ monthlyIncomeCents: MIN_MONTHLY_INCOME_CENTS }).success, true);
	assert.equal(incomeSchema.safeParse({ monthlyIncomeCents: 1_800_000 }).success, true);
	assert.equal(incomeSchema.safeParse({ monthlyIncomeCents: 850_000 }).success, true);
	assert.equal(
		incomeSchema.safeParse({ monthlyIncomeCents: MAX_MONTHLY_INCOME_CENTS }).success,
		true
	);
	assert.equal(
		incomeSchema.safeParse({ monthlyIncomeCents: MAX_MONTHLY_INCOME_CENTS + 1 }).success,
		false
	);
});

test('formatCentsAsRandsInput uses integer cents, not a float divide', () => {
	assert.equal(formatCentsAsRandsInput(1_800_000), '18000');
	assert.equal(formatCentsAsRandsInput(1999), '19.99');
	assert.equal(formatCentsAsRandsInput(50), '0.50');
});
