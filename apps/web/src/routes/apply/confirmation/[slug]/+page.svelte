<script lang="ts">
	import { LOAN_TERM_DAYS } from '$lib/catalogue';
	import { formatCents, formatCentsExact } from '$lib/format';
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Application received | Yellow</title></svelte:head>

<div class="flex flex-col gap-6">
	<div>
		<Badge class="mb-3 bg-accent text-accent-foreground">Received</Badge>
		<h1 class="text-2xl font-semibold tracking-tight">
			{data.firstName ? `Thanks, ${data.firstName}. We have your application.` : 'We have your application.'}
		</h1>
		<p class="mt-3 text-muted-foreground">
			We will be in touch about the deposit and where to collect the phone.
		</p>
	</div>

	<Card class="px-4">
		<p class="text-sm text-muted-foreground">Your reference</p>
		<!-- Long enough to be read aloud over a phone line, so it does not wrap or shrink. -->
		<p class="mt-1 font-mono text-lg tracking-wide">{data.slug}</p>
	</Card>

	<!--
		The agreed terms, read back from the stored application rather than from anything carried
		here in state — this page has no cookie and no wizard behind it, only the reference in the
		URL. These are the numbers written down at submit, not a fresh quote: if the catalogue were
		repriced tomorrow, what is shown here would not move.
	-->
	{#if data.phone}
		<Card class="flex flex-col gap-4 px-4">
			<div>
				<p class="text-sm text-muted-foreground">What you are financing</p>
				<p class="mt-1 font-medium">
					{data.phone.brand}
					{data.phone.model} · {data.phone.colour} · {data.phone.storageGb}GB
				</p>
			</div>

			<Separator />

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
					<span class="text-sm font-medium">Total you will pay</span>
					<span class="text-2xl font-semibold">{formatCents(data.phone.totalPayableCents)}</span>
				</div>
			</div>

			<p class="text-xs text-muted-foreground">
				Cash price {formatCents(data.phone.cashPriceCents)} if bought outright.
			</p>
		</Card>
	{/if}

	<Button size="pill" variant="outline" href="/">Back to the start</Button>
</div>
