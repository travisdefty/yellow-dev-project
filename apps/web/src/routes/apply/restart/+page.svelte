<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Start over | Yellow</title></svelte:head>

<div class="flex flex-col gap-5">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">Start a new application?</h1>
		<p class="mt-2 text-muted-foreground">
			{data.firstName ? `${data.firstName}, everything` : 'Everything'} you have entered so far — your
			details, your income and your phone — will be discarded, and you'll begin again from the start.
		</p>
	</div>

	<!--
		No `use:enhance`. This is a one-shot destructive action followed by a redirect out of the
		wizard; a plain form submit is the whole behaviour, and there is no error state to catch.
	-->
	<form method="POST" class="flex flex-col-reverse gap-3 min-[420px]:flex-row">
		<Button size="pill" variant="outline" href={data.resumeAt} class="flex-1">
			Keep my application
		</Button>
		<Button size="pill" type="submit" class="flex-1">Discard and start over</Button>
	</form>
</div>
