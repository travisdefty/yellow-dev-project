<script lang="ts">
	import { LOAN_TERM_DAYS } from '$lib/catalogue';
	import { formatCents, formatCentsExact } from '$lib/format';
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let consent = $state(false);
</script>

<svelte:head><title>Check and submit | Yellow</title></svelte:head>

<div class="flex flex-col gap-5">
	<Card class="gap-3 px-4">
		<p class="text-sm font-medium">
			{data.phone.brand}
			{data.phone.model} · {data.phone.storageGb} GB · {data.phone.colour}
		</p>
		<dl class="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
			<dt class="text-muted-foreground">Cash price</dt>
			<dd class="text-right">{formatCents(data.phone.cashPriceCents)}</dd>
			<dt class="text-muted-foreground">Deposit due today</dt>
			<dd class="text-right">{formatCents(data.phone.depositCents)}</dd>
			<dt class="text-muted-foreground">Amount financed</dt>
			<dd class="text-right">{formatCents(data.phone.principalCents)}</dd>
			<dt class="text-muted-foreground">Interest</dt>
			<dd class="text-right">
				{formatCents(data.interestCents)}
			</dd>
			<dt class="text-muted-foreground">Total repayable</dt>
			<dd class="text-right">{formatCents(data.phone.loanAmountCents)}</dd>
		</dl>
		<Separator />
		<div class="flex items-baseline justify-between">
			<span class="text-sm font-medium">{LOAN_TERM_DAYS} daily payments of</span>
			<span class="text-2xl font-semibold">{formatCentsExact(data.phone.dailyCents)}</span>
		</div>
	</Card>

	<!--
		A placeholder, and marked as one. The real wording of a POPIA consent is a legal job, not a
		developer's guess — the checkbox and the fact that it is required are the parts that matter
		to the shape of the application.
	-->
	<label class="flex items-start gap-3 text-sm">
		<input
			type="checkbox"
			bind:checked={consent}
			class="mt-0.5 size-5 shrink-0 rounded-sm accent-accent"
		/>
		<span class="text-muted-foreground">
			I agree that Yellow may process my personal information to assess this application.
			<span class="italic">(Placeholder wording.)</span>
		</span>
	</label>

	<div class="flex gap-3">
		<Button size="pill" variant="outline" href="/apply/phone" class="flex-1">Back</Button>
		<Button size="pill" href="/apply/YEL-000123/confirmation" class="flex-1">Submit</Button>
	</div>
</div>
