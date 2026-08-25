<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import DeviceCard from '$lib/components/DeviceCard.svelte';
	import { formatCents } from '$lib/format';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head><title>Choose your phone | Yellow</title></svelte:head>

<!--
	Only reachable by posting a phoneId that was never rendered — the catalogue does not show a
	phone the applicant cannot afford. Rendered rather than toasted for the same reason as the
	review step: it must be readable with JavaScript off.
-->
{#if form?.message}
	<p
		class="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-negative"
		role="alert"
	>
		{form.message}
	</p>
{/if}

<!--
	Set when raising the affordability bar knocked out a phone that was already chosen. Said plainly
	and at the top: the alternative is an applicant arriving here for no visible reason, finding
	their selection gone, and concluding the site lost it.
-->
{#if data.repick}
	<p class="mb-4 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm" role="status">
		On the income you just entered, the phone you had chosen is no longer affordable. Here is what
		does fit.
	</p>
{/if}

{#if data.total === 0}
	<!--
		The one case the filter has to explain itself. "No phones" with nothing else on screen reads
		as a broken page; the income they would need and a way back to change what they entered turn
		it into something the applicant can act on.
	-->
	<div class="flex flex-col gap-4">
		<p class="text-muted-foreground">
			On what you told us you earn each month, none of our phones fits the affordability rule —
			your income has to be more than ten times the monthly repayment. The cheapest phone we have
			needs {formatCents(data.minimumIncomeCents)} a month.
		</p>
		<p class="text-muted-foreground">
			If you entered the wrong amount, you can go back and correct it.
		</p>
		<Button size="pill" href="/apply/income" class="self-start">Change my income</Button>
	</div>
{:else}
	<p class="mb-4 text-sm text-muted-foreground">
		{data.total}
		{data.total === 1 ? 'phone fits' : 'phones fit'} what you can afford. Each card leads with the daily
		amount, then the deposit due today and the total you'll pay.
	</p>

	<!-- One column on a phone, two from 600px. Keyed on the id so paging swaps cards, not their contents. -->
	<div class="grid grid-cols-1 gap-4 min-[600px]:grid-cols-2">
		{#each data.items as phone (phone.phoneId)}
			<DeviceCard {phone} selected={phone.phoneId === data.selectedPhoneId} />
		{/each}
	</div>

	<!--
		Plain links, so paging is a server render that works before hydration and survives a refresh.
		`data-sveltekit-preload-data` on the body still upgrades it to a client navigation on hover.
	-->
	{#if data.lastPage > 1}
		<nav class="mt-6 flex items-center justify-between gap-3" aria-label="Catalogue pages">
			<Button
				size="pill"
				variant="outline"
				href="?page={data.page - 1}"
				disabled={data.page === 1}
				class="flex-1"
			>
				Previous
			</Button>
			<span class="text-sm text-muted-foreground">Page {data.page} of {data.lastPage}</span>
			<Button
				size="pill"
				variant="outline"
				href="?page={data.page + 1}"
				disabled={data.page === data.lastPage}
				class="flex-1"
			>
				Next
			</Button>
		</nav>
	{/if}
{/if}

<div class="mt-6">
	<Button size="pill" variant="ghost" href="/apply/income">Back</Button>
</div>
