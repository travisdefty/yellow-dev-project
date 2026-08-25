<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import StepHeader from '$lib/components/StepHeader.svelte';
	import { STEP_TOTAL, stepFor } from './steps';

	let { children }: { children: Snippet } = $props();

	// Derived from the URL rather than held in state: the step is whatever route you are on, which
	// is what makes refresh and the back button work without anything to restore.
	const current = $derived(stepFor(page.url.pathname));
</script>

{#if current}
	<StepHeader step={current.step} total={STEP_TOTAL} title={current.title} />
{/if}

{@render children()}
