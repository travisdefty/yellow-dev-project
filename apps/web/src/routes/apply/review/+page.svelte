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

	// With JavaScript on, `validatedSubmit` sets these directly — from its own client-side parse, or
	// from what the action sent back. With JavaScript off there is no parse and no enhance callback:
	// the action's `fail()` re-renders this page and its errors arrive on the `form` prop, which is
	// then the only place they exist. Client errors win when both are present, so the two paths
	// never disagree.
	let clientErrors = $state<Record<string, string> | null>(null);
	let submitting = $state(false);
	const errors = $derived<Record<string, string>>(clientErrors ?? form?.errors ?? {});

	const submit = validatedSubmit(
		submitSchema,
		() => ({}),
		(e) => (clientErrors = e),
		(pending) => (submitting = pending)
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

	<Card class="px-4">
		<p class="text-sm text-muted-foreground">Your reference</p>
		<p class="mt-1 font-mono text-lg tracking-wide">{data.publicReference}</p>
	</Card>

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
		<FieldError message={errors.idNumber} />
		{#if errors.idNumber}
			<p class="text-sm text-muted-foreground">
				Once your ID is accepted it cannot be changed here.
				<a href="/apply/restart" class="underline underline-offset-4 hover:text-foreground">
					Start a new application
				</a>
				if you need to use a different ID number.
			</p>
		{/if}
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
				<span class="text-2xl font-semibold">{formatCentsExact(data.phone.totalPayableCents)}</span>
			</div>
		</div>

		<Separator />

		<!--
			Reference, not terms. The cash price is what the phone would cost if bought outright, which
			is not what is on offer here — kept for comparison, demoted so it cannot be mistaken for an
			amount owed.
		-->
		<p class="text-xs text-muted-foreground">
			Cash price {formatCents(data.phone.cashPriceCents)} if bought outright.
		</p>
	</Card>

	<div class="flex gap-3">
		<Button size="pill" variant="outline" href="/apply/phone" class="flex-1">Back</Button>
		<Button type="submit" size="pill" disabled={submitting} class="flex-1">
			{submitting ? 'Submitting…' : 'Submit'}
		</Button>
	</div>
</form>
