<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import DeviceCard from '$lib/components/DeviceCard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Choose your phone | Yellow</title></svelte:head>

<p class="mb-4 text-sm text-muted-foreground">
	{data.total} phones. Each card leads with the daily amount, then cash price, deposit and total
	repayable.
</p>

<!-- One column on a phone, two from 600px. Keyed on the id so paging swaps cards, not their contents. -->
<div class="grid grid-cols-1 gap-4 min-[600px]:grid-cols-2">
	{#each data.items as phone (phone.phoneId)}
		<DeviceCard {phone} />
	{/each}
</div>

<!--
	Plain links, so paging is a server render that works before hydration and survives a refresh.
	`data-sveltekit-preload-data` on the body still upgrades it to a client navigation on hover.
-->
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

<div class="mt-6">
	<Button size="pill" variant="ghost" href="/apply/income">Back</Button>
</div>
