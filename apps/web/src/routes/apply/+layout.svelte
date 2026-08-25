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

<!--
	The way out. Without this the wizard is a trap: the only exits are the browser's back button,
	which lands on a step still holding the previous application's data, and the logo, which leaves
	the draft cookie exactly where it was. Rendered under the step rather than in the header so it
	reads as an escape hatch rather than a fifth option competing with Continue — and only on the
	numbered steps, since the confirmation has nothing left to abandon.
-->
{#if current}
	<p class="mt-8 text-center text-sm text-muted-foreground">
		<a href="/apply/restart" class="underline underline-offset-4 hover:text-foreground">
			Start over
		</a>
	</p>
{/if}
