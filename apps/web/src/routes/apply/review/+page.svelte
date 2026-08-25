<script lang="ts">
	import { enhance } from '$app/forms';
	import { LOAN_TERM_DAYS } from '$lib/catalogue';
	import { formatCents, formatCentsExact, formatDateIso, formatMobile } from '$lib/format';
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import FieldError from '$lib/components/FieldError.svelte';
	import { submitSchema } from '@yellow/domain';
	import { validatedSubmit } from '$lib/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let consent = $state(false);
	// With JavaScript on, `validatedSubmit` sets these directly — from its own client-side parse, or
	// from what the action sent back. With JavaScript off there is no parse and no enhance callback:
	// the action's `fail()` re-renders this page and its errors arrive on the `form` prop, which is
	// then the only place they exist. Client errors win when both are present, so the two paths
	// never disagree.
	let clientErrors = $state<Record<string, string> | null>(null);
	const errors = $derived(clientErrors ?? form?.errors ?? {});

	// The client value is the bare boolean, not the schema's object shape, so a tiny adapter wraps
	// it and rewrites the failure to the same wording the server uses, so an unticked box is caught
	// before the network round trip with no visible difference from a server round trip.
	const consentSchema = {
		safeParse(value: unknown) {
			const result = submitSchema.safeParse({ consent: value });
			if (result.success) return result;
			return {
				success: false as const,
				error: { issues: [{ path: ['consent'], message: 'Please agree before submitting.' }] }
			};
		}
	};

	const submit = validatedSubmit(
		consentSchema,
		() => consent,
		(e) => (clientErrors = e)
	);
</script>

<svelte:head><title>Check and submit | Yellow</title></svelte:head>

<form method="POST" use:enhance={submit} class="flex flex-col gap-5">
	<!--
		A toast carries this when JavaScript is on. With it off there is no toast, and no field to
		hang the message on either — the income input is two steps back — so the same wording is
		rendered here instead. `validatedSubmit` returns before calling `update()` on a failure, so
		`form` stays null in the JavaScript path and the two never double up.
	-->
	{#if form?.message}
		<p
			class="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-negative"
			role="alert"
		>
			{form.message}
		</p>
	{/if}

	<!--
		What they entered, played back before they commit to it. This is the last screen where a
		mistyped mobile number is free to fix, so every group carries a link straight to the step that
		owns it rather than making the applicant walk backwards through the wizard to find it.
	-->
	<Card class="gap-3 px-4">
		<div class="flex items-baseline justify-between gap-3">
			<h2 class="text-sm font-semibold">Your details</h2>
			<a
				href="/apply/details?return=review"
				class="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
			>
				Edit
			</a>
		</div>
		<dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
			<dt class="text-muted-foreground">Name</dt>
			<dd class="text-right">{data.applicant.firstName} {data.applicant.lastName}</dd>
			<dt class="text-muted-foreground">Mobile</dt>
			<dd class="text-right">{formatMobile(data.applicant.mobile)}</dd>
			<dt class="text-muted-foreground">ID number</dt>
			<dd class="text-right tabular-nums">{data.applicant.idNumber}</dd>
			<dt class="text-muted-foreground">Date of birth</dt>
			<dd class="text-right">{formatDateIso(data.applicant.dob)}</dd>
		</dl>
	</Card>

	<Card class="gap-3 px-4">
		<div class="flex items-baseline justify-between gap-3">
			<h2 class="text-sm font-semibold">Your income</h2>
			<a
				href="/apply/income?return=review"
				class="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
			>
				Edit
			</a>
		</div>
		<dl class="grid grid-cols-[auto_1fr] gap-x-3 text-sm">
			<dt class="text-muted-foreground">Each month, before deductions</dt>
			<dd class="text-right">{formatCents(data.applicant.monthlyIncomeCents)}</dd>
		</dl>
	</Card>

	<Card class="gap-4 px-4">
		<div class="flex items-baseline justify-between gap-3">
			<h2 class="text-sm font-semibold">Your phone</h2>
			<a
				href="/apply/phone"
				class="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
			>
				Change
			</a>
		</div>
		<p class="text-sm">
			{data.phone.brand}
			{data.phone.model} · {data.phone.storageGb} GB · {data.phone.colour}
		</p>

		<Separator />

		<!--
			The three numbers this whole flow exists to state: what leaves their pocket today, what
			leaves it every day after that, and what it all adds up to. Given size and weight rather
			than a row in a table, because these are the terms being agreed to — everything else below
			is context for them.
		-->
		<div class="flex flex-col gap-3">
			<div class="flex items-baseline justify-between gap-3">
				<span class="text-sm font-medium">Deposit due today</span>
				<span class="text-2xl font-semibold">{formatCents(data.phone.depositCents)}</span>
			</div>
			<div class="flex items-baseline justify-between gap-3">
				<span class="text-sm font-medium">
					Then every day
					<span class="block text-xs font-normal text-muted-foreground">
						{LOAN_TERM_DAYS} payments
					</span>
				</span>
				<span class="text-2xl font-semibold">{formatCentsExact(data.phone.dailyCents)}</span>
			</div>
			<div class="flex items-baseline justify-between gap-3">
				<span class="text-sm font-medium">
					Total you will pay
					<span class="block text-xs font-normal text-muted-foreground">
						Deposit plus every payment
					</span>
				</span>
				<span class="text-2xl font-semibold">{formatCents(data.phone.totalPayableCents)}</span>
			</div>
		</div>

		<Separator />

		<!--
			Reference, not terms. The cash price in particular is what the phone would cost if bought
			outright, which is not what is on offer here — kept for comparison, demoted so it cannot be
			mistaken for an amount owed.
		-->
		<dl class="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
			<dt>Cash price if bought outright</dt>
			<dd class="text-right">{formatCents(data.phone.cashPriceCents)}</dd>
			<dt>Amount financed</dt>
			<dd class="text-right">{formatCents(data.phone.principalCents)}</dd>
			<dt>Interest</dt>
			<dd class="text-right">{formatCents(data.interestCents)}</dd>
		</dl>
	</Card>

	<!--
		A placeholder, and marked as one. The real wording of a POPIA consent is a legal job, not a
		developer's guess — the checkbox and the fact that it is required are the parts that matter
		to the shape of the application.
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

	<div class="flex gap-3">
		<Button size="pill" variant="outline" href="/apply/phone" class="flex-1">Back</Button>
		<Button type="submit" size="pill" class="flex-1">Submit</Button>
	</div>
</form>
