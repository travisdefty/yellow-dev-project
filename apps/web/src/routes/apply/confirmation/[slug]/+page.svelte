<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Application received | Yellow</title></svelte:head>

<div class="flex flex-col gap-6">
	<div>
		<Badge class="mb-3 bg-accent text-accent-foreground">Received</Badge>
		<h1 class="text-2xl font-semibold tracking-tight">We have your application.</h1>
		<p class="mt-3 text-muted-foreground">
			We will be in touch about the deposit and where to collect the phone.
		</p>
	</div>

	<Card class="px-4">
		<p class="text-sm text-muted-foreground">Your reference</p>
		<!-- Long enough to be read aloud over a phone line, so it does not wrap or shrink. -->
		<p class="mt-1 font-mono text-lg tracking-wide">{data.slug}</p>
	</Card>

	<Button size="pill" variant="outline" href="/">Back to the start</Button>
</div>
