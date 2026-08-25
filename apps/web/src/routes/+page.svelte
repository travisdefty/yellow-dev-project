<script lang="ts">
	import { LOAN_TERM_DAYS } from '$lib/catalogue';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	// Phase 1 collects nothing. Phase 2 carries this into the wizard's step state.
	let firstName = $state('');
</script>

<svelte:head>
	<title>Get financed for a phone | Yellow</title>
</svelte:head>

<div class="flex flex-col gap-8">
	<div>
		<h1 class="text-3xl leading-tight font-semibold tracking-tight text-balance">
			Get the phone you want, with a payment plan that works for you.
		</h1>
		<p class="mt-3 text-muted-foreground">
			A small deposit today, then a fixed daily amount over {LOAN_TERM_DAYS} days. The application process takes about
			five minutes, and you see the full cost before you commit to anything.
		</p>
	</div>

	<ul class="flex flex-col gap-2 text-sm text-muted-foreground">
		<p>Before you start have the following on hand:</p>
		<li>· Your South African ID</li>
		<li>· You are at least 18 years old and no more than 65</li>
		<li>· What you earn each month, and something that shows it</li>
		<li>· Five minutes of your time</li>
	</ul>

	<form class="flex flex-col gap-4" data-sveltekit-preload-data="tap">
		<div>
			<Label for="firstName" class="mb-1.5">What should we call you?</Label>
			<Input id="firstName" bind:value={firstName} autocomplete="given-name" placeholder="First name" />
		</div>
		<Button size="pill" href="/apply/details">Get started</Button>
	</form>

	<p class="text-xs text-muted-foreground">
		Yellow finances the phone; you repay it daily over {LOAN_TERM_DAYS} days. Approval depends on
		your ID, your age and what you can afford.
	</p>
</div>
