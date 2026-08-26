<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import FieldError from '$lib/components/FieldError.svelte';
	import { detailsStepSchema } from '@yellow/domain';
	import { validatedSubmit } from '$lib/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Seeded from the draft so a refresh, a back button or a return to an earlier step all come
	// back filled in — the value is already in the server-rendered HTML.
	//
	// firstName is the exception, and `?name=` wins there: arriving with one in the URL means the
	// applicant just typed it on the start page, and a name they typed a second ago beats one
	// stored from a previous visit. Preferring the draft made the start page's field look broken —
	// you could type a new name, press Get started, and land on a form still showing the old one.
	//
	// Read once and deliberately: these are initial values for fields the applicant then owns, not
	// a live mirror of the draft. A failed submit re-runs the load, and re-seeding there would
	// overwrite what they had just typed. `untrack` states that intent rather than leaving the
	// compiler to warn about it.
	const seed = untrack(() => {
		const [year = '', month = '', day = ''] = (data.draft.dob ?? '').split('-');
		return {
			firstName: data.seededFirstName || (data.draft.firstName ?? ''),
			lastName: data.draft.lastName ?? '',
			mobile: data.draft.mobile ?? '',
			idNumber: data.draft.idNumber ?? '',
			dobDay: day,
			dobMonth: month,
			dobYear: year,
			consent: Boolean(data.draft.consented)
		};
	});

	let firstName = $state(seed.firstName);
	let lastName = $state(seed.lastName);
	let mobile = $state(seed.mobile);
	let idNumber = $state(seed.idNumber);
	let dobDay = $state(seed.dobDay);
	let dobMonth = $state(seed.dobMonth);
	let dobYear = $state(seed.dobYear);
	let consent = $state(seed.consent);
	// With JavaScript on, `validatedSubmit` sets these directly — from its own client-side parse, or
	// from what the action sent back. With JavaScript off there is no parse and no enhance callback:
	// the action's `fail()` re-renders this page and its errors arrive on the `form` prop, which is
	// then the only place they exist. Client errors win when both are present, so the two paths
	// never disagree.
	let clientErrors = $state<Record<string, string> | null>(null);
	let submitting = $state(false);
	const errors = $derived<Record<string, string>>(clientErrors ?? form?.errors ?? {});

	// Once identity is accepted the server ignores idNumber/dob from the client outright, so there
	// is no point letting the applicant edit them here either — locking them in the UI matches what
	// the server actually does with them.
	const identityLocked = $derived(Boolean(data.draft.identityAcceptedAt));

	// Continue is enabled on completeness, not validity: a button greyed out while the applicant
	// believes they've finished explains nothing, and it's pressing Continue on complete-but-wrong
	// input that actually reveals the error (here, via a real server round trip if JS is off).
	// Validity is checked at submit time by `validatedSubmit`/the action, not here.
	const complete = $derived(
		Boolean(firstName && lastName && mobile && idNumber && dobDay && dobMonth && dobYear)
	);

	// The client composes 'dob' the same way the server does, so the same schema can run on both
	// sides and produce the same errors.
	const submit = validatedSubmit(
		detailsStepSchema,
		() => ({
			firstName,
			lastName,
			mobile,
			idNumber,
			dob: `${dobYear}-${dobMonth.padStart(2, '0')}-${dobDay.padStart(2, '0')}`,
			consent
		}),
		(e) => (clientErrors = e),
		(pending) => (submitting = pending)
	);
</script>

<svelte:head><title>Your details | Yellow</title></svelte:head>

<form method="POST" use:enhance={submit} class="flex flex-col gap-5">
	<div class="grid grid-cols-2 gap-3">
		<div>
			<Label for="firstName" class="mb-1.5">First name</Label>
			<Input
				id="firstName"
				name="firstName"
				bind:value={firstName}
				autocomplete="given-name"
				aria-invalid={Boolean(errors.firstName) || undefined}
			/>
		</div>
		<div>
			<Label for="lastName" class="mb-1.5">Last name</Label>
			<Input
				id="lastName"
				name="lastName"
				bind:value={lastName}
				autocomplete="family-name"
				aria-invalid={Boolean(errors.lastName) || undefined}
			/>
		</div>
	</div>

	<div>
		<!--
			Called "mobile number" rather than "phone number": the next step but one is choosing a
			phone, and two fields called phone in one wizard is a support ticket waiting to happen.
		-->
		<Label for="mobile" class="mb-1.5">Mobile number</Label>
		<Input
			id="mobile"
			name="mobile"
			type="tel"
			bind:value={mobile}
			inputmode="tel"
			autocomplete="tel-national"
			maxlength={10}
			placeholder="082 123 4567"
			aria-describedby="mobile-hint mobile-error"
			aria-invalid={Boolean(errors.mobile) || undefined}
		/>
		<p id="mobile-hint" class="mt-1.5 text-sm text-muted-foreground">
			We use this to confirm your application and arrange delivery.
		</p>
		<FieldError id="mobile-error" message={errors.mobile} />
	</div>

	<div>
		<Label for="idNumber" class="mb-1.5">South African ID number</Label>
		<Input
			id="idNumber"
			name="idNumber"
			bind:value={idNumber}
			inputmode="numeric"
			maxlength={13}
			placeholder="13 digits"
			aria-describedby="idNumber-error"
			aria-invalid={Boolean(errors.idNumber) || undefined}
			readonly={identityLocked}
			aria-readonly={identityLocked || undefined}
			class={identityLocked ? 'text-muted-foreground' : undefined}
		/>
		<FieldError id="idNumber-error" message={errors.idNumber} />
	</div>

	<fieldset>
		<legend class="mb-1.5 text-sm font-medium">Date of birth</legend>
		<!--
			Asked for as well as the ID, not instead of it. A South African ID carries no century, so
			deriving the birthday means guessing 1908 or 2008 — and that guess is the age gate. The
			date supplies the century and turns the ID into a cross-check that also catches a
			transposed digit which still passes the checksum.
		-->
		<div class="grid grid-cols-3 gap-3">
			<Input
				aria-label="Day"
				name="dobDay"
				bind:value={dobDay}
				inputmode="numeric"
				maxlength={2}
				placeholder="DD"
				aria-invalid={Boolean(errors.dob) || undefined}
				readonly={identityLocked}
				aria-readonly={identityLocked || undefined}
				class={identityLocked ? 'text-muted-foreground' : undefined}
			/>
			<Input
				aria-label="Month"
				name="dobMonth"
				bind:value={dobMonth}
				inputmode="numeric"
				maxlength={2}
				placeholder="MM"
				aria-invalid={Boolean(errors.dob) || undefined}
				readonly={identityLocked}
				aria-readonly={identityLocked || undefined}
				class={identityLocked ? 'text-muted-foreground' : undefined}
			/>
			<Input
				aria-label="Year"
				name="dobYear"
				bind:value={dobYear}
				inputmode="numeric"
				maxlength={4}
				placeholder="YYYY"
				aria-invalid={Boolean(errors.dob) || undefined}
				readonly={identityLocked}
				aria-readonly={identityLocked || undefined}
				class={identityLocked ? 'text-muted-foreground' : undefined}
			/>
		</div>
		<p class="mt-1.5 text-sm text-muted-foreground">
			You must be between 18 and 65 years of age.
		</p>
		{#if identityLocked}
			<p class="mt-1.5 text-sm text-muted-foreground">
				Your ID number and date of birth are fixed to this application and can't be changed. If
				either is wrong,
				<a href="/apply/restart" class="underline underline-offset-4 hover:text-foreground">
					start a new application</a
				>.
			</p>
		{/if}
		<FieldError id="dob-error" message={errors.dob} />
	</fieldset>

	<!--
		A placeholder, and marked as one. The real wording of a POPIA consent is a legal job, not a
		developer's guess — the checkbox and the fact that it is required are the parts that matter
		to the shape of the application. It lives here, not on review, because this is the write that
		first stores personal information.
	-->
	<div>
		<label class="flex items-start gap-3 text-sm">
			<input
				type="checkbox"
				name="consent"
				bind:checked={consent}
				aria-describedby="consent-error"
				class="mt-0.5 size-5 shrink-0 rounded-sm accent-accent"
			/>
			<span class="text-muted-foreground">
				I agree that Yellow may process my personal information to assess this application.
				<span class="italic">(Placeholder wording.)</span>
			</span>
		</label>
		<FieldError id="consent-error" message={errors.consent} />
	</div>

	<Button size="pill" type="submit" disabled={!complete || submitting} class="mt-2">
		{submitting ? 'Saving…' : 'Continue'}
	</Button>
</form>
