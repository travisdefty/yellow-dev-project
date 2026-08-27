import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isAllowedIncomeInput } from './digits.ts';

test('income input allows cents and blocks a third decimal digit', () => {
	assert.equal(isAllowedIncomeInput(''), true);
	assert.equal(isAllowedIncomeInput('R 12 500'), true);
	assert.equal(isAllowedIncomeInput('12.'), true);
	assert.equal(isAllowedIncomeInput('12.5'), true);
	assert.equal(isAllowedIncomeInput('12.50'), true);
	assert.equal(isAllowedIncomeInput('12 500,50'), true);
	assert.equal(isAllowedIncomeInput('12.501'), false);
	assert.equal(isAllowedIncomeInput('12,501'), false);
	assert.equal(isAllowedIncomeInput('12abc'), false);
});
