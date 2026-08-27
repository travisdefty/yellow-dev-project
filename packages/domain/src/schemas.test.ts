import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ageOn, riskGroupFor } from './age.ts';
import { isValidSaId } from './sa-id.ts';
import { composeDob, detailsStepSchema } from './schemas.ts';

const sipho = {
	firstName: 'Sipho',
	lastName: 'Nkosi',
	mobile: '0821234567',
	idNumber: '0003155808086',
	dob: '2000-03-15',
	consent: true as const
};

function issuesByPath(value: unknown) {
	const parsed = detailsStepSchema.safeParse(value);
	assert.equal(parsed.success, false);
	const messages: Record<string, string[]> = {};
	for (const issue of parsed.error.issues) {
		const key = String(issue.path[0] ?? '');
		(messages[key] ??= []).push(issue.message);
	}
	return messages;
}

function makeSaId(yyMMdd: string): string {
	const stem = `${yyMMdd}580808`;
	for (let check = 0; check < 10; check++) {
		const id = stem + String(check);
		if (isValidSaId(id)) return id;
	}
	throw new Error(`No Luhn check digit for ${yyMMdd}`);
}

test('README applicants parse with consent', () => {
	assert.equal(detailsStepSchema.safeParse(sipho).success, true);
	assert.equal(
		detailsStepSchema.safeParse({
			firstName: 'Thandi',
			lastName: 'Mokoena',
			mobile: '0734567890',
			idNumber: '8402200912087',
			dob: '1984-02-20',
			consent: true
		}).success,
		true
	);
	assert.equal(
		detailsStepSchema.safeParse({
			firstName: 'Johan',
			lastName: 'van der Berg',
			mobile: '0612345678',
			idNumber: '6401106200086',
			dob: '1964-01-10',
			consent: true
		}).success,
		true
	);
	assert.equal(
		detailsStepSchema.safeParse({
			firstName: 'Ayanda',
			lastName: 'Dlamini',
			mobile: '0845678901',
			idNumber: '9806272341083',
			dob: '1998-06-27',
			consent: true
		}).success,
		true
	);
});

test('mobile rejects letters and accepts spaces or hyphens around a valid number', () => {
	assert.ok(issuesByPath({ ...sipho, mobile: 'abcdefghij' }).mobile);
	assert.ok(issuesByPath({ ...sipho, mobile: '082123456a' }).mobile);
	assert.ok(issuesByPath({ ...sipho, mobile: 'a0821234567' }).mobile);
	assert.equal(detailsStepSchema.safeParse({ ...sipho, mobile: '082 123 4567' }).success, true);
	assert.equal(detailsStepSchema.safeParse({ ...sipho, mobile: '082-123-4567' }).success, true);
	assert.equal(detailsStepSchema.safeParse({ ...sipho, mobile: ' 0821234567 ' }).success, true);
});

test('id number rejects letters and accepts spaces around 13 digits', () => {
	assert.ok(issuesByPath({ ...sipho, idNumber: 'abcdefghijklm' }).idNumber);
	assert.ok(issuesByPath({ ...sipho, idNumber: '000315580808a' }).idNumber);
	assert.equal(
		detailsStepSchema.safeParse({ ...sipho, idNumber: '000315 5808086' }).success,
		true
	);
});

test('dob rejects letters and reports a form-shaped message', () => {
	const letters = issuesByPath({ ...sipho, dob: composeDob('2000', '0a', '15') });
	assert.ok(letters.dob);
	assert.equal(letters.dob[0], 'Enter your date of birth as day, month and year.');
	assert.equal(letters.dob.length, 1);
});

test('impossible calendar date does not also report age or ID mismatch', () => {
	const messages = issuesByPath({ ...sipho, dob: '2000-13-32' });
	assert.deepEqual(messages.dob, ['Enter a real calendar date.']);
	assert.equal(messages.idNumber, undefined);
});

test('bad checksum is an ID error, not a mismatch', () => {
	const messages = issuesByPath({ ...sipho, idNumber: '0003155808080' });
	assert.equal(
		messages.idNumber[0],
		'This ID number is not recognised. Check the digits and try again.'
	);
	assert.equal(messages.dob, undefined);
});

test('ID and date of birth mismatch lands on both fields', () => {
	const messages = issuesByPath({ ...sipho, dob: '2000-03-16' });
	const expected = 'Your ID number and date of birth do not agree. One of them has a typo.';
	assert.equal(messages.idNumber[0], expected);
	assert.equal(messages.dob[0], expected);
});

test('names require letters and allow SA punctuation', () => {
	assert.ok(issuesByPath({ ...sipho, firstName: '123' }).firstName);
	assert.ok(issuesByPath({ ...sipho, lastName: '@@@' }).lastName);
	assert.ok(issuesByPath({ ...sipho, firstName: 'Sipho2' }).firstName);
	assert.equal(
		detailsStepSchema.safeParse({ ...sipho, lastName: "O'Connor" }).success,
		true
	);
	assert.equal(
		detailsStepSchema.safeParse({ ...sipho, firstName: 'Jean-Pierre' }).success,
		true
	);
});

test('composeDob pads digit-only day and month and leaves letters in place', () => {
	assert.equal(composeDob('2000', '3', '5'), '2000-03-05');
	assert.equal(composeDob('2000', '0a', '15'), '2000-0a-15');
	assert.equal(composeDob(' 2000 ', ' 3 ', ' 5 '), '2000-03-05');
});

test('under-18 and over-65 dates of birth are refused', () => {
	const youngId = makeSaId('150101');
	const oldId = makeSaId('500101');
	assert.equal(
		issuesByPath({ ...sipho, idNumber: youngId, dob: '2015-01-01' }).dob[0],
		'Applicants must be between 18 and 65 years old.'
	);
	assert.equal(
		issuesByPath({ ...sipho, idNumber: oldId, dob: '1950-01-01' }).dob[0],
		'Applicants must be between 18 and 65 years old.'
	);
});

test('ageOn is inclusive at 18 and 65', () => {
	assert.equal(ageOn('2008-08-27', '2026-08-27'), 18);
	assert.equal(ageOn('2008-08-28', '2026-08-27'), 17);
	assert.equal(ageOn('1961-08-27', '2026-08-27'), 65);
	assert.equal(ageOn('1960-08-27', '2026-08-27'), 66);
	assert.equal(riskGroupFor(17), null);
	assert.equal(riskGroupFor(18), 'A');
	assert.equal(riskGroupFor(65), 'C');
	assert.equal(riskGroupFor(66), null);
});
