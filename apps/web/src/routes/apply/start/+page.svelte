<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>You have an application in progress | Yellow</title></svelte:head>

<div class="flex flex-col gap-5">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">
			You already have an application in progress
		</h1>
		<p class="mt-2 text-muted-foreground">
			{data.firstName ? `It's under the name ${data.firstName}. ` : ''}You can pick up where you left
			off, or throw it away and start again — starting again clears everything, including the ID
			number and date of birth, which can't be changed on an application once they're accepted.
		</p>
	</div>

	<!--
		Resuming is a link and starting over is a form post: only one of the two destroys anything,
		and the one that does should not be reachable by a GET.
	-->
	<div class="flex flex-col gap-3">
		<Button size="pill" href={data.resumeAt}>Continue where I left off</Button>
		<form method="POST">
			<Button size="pill" variant="outline" type="submit" class="w-full">
				Start a new application
			</Button>
		</form>
	</div>
</div>
