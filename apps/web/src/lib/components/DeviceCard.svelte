<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { QuotedPhone } from '$lib/catalogue';
	import { formatCents, formatCentsExact } from '$lib/format';
	import DeviceSilhouette from '$lib/devices/DeviceSilhouette.svelte';
	import { tintForBrand } from '$lib/devices/brand-tint';
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';

	// No affordability props any more: the catalogue load filters unaffordable phones out entirely,
	// so every card that renders is one the applicant can actually choose.
	type Props = { phone: QuotedPhone; selected?: boolean };
	let { phone, selected = false }: Props = $props();

	let submitting = $state(false);
	const submit: SubmitFunction = () => {
		submitting = true;
		return async ({ update }) => {
			try {
				await update();
			} finally {
				submitting = false;
			}
		};
	};
</script>

<!--
	`selected` is what a phone already chosen looks like when the applicant walks back through the
	catalogue — after editing an earlier step, say. Marked rather than filtered out, so the choice is
	visible in place and changing it is one tap.
-->
<Card class={['gap-4 rounded-lg px-4', selected && 'border-foreground ring-1 ring-foreground']}>
	{#if selected}
		<p class="text-xs font-semibold tracking-wide uppercase">Your current choice</p>
	{/if}

	<div class="flex items-start gap-4">
		<DeviceSilhouette tint={tintForBrand(phone.brand)} class="h-16 w-10 shrink-0" />

		<div class="min-w-0 flex-1">
			<!--
				The daily instalment is the hero. No monthly figure: monthly income feeds the
				affordability rule, and is never quoted back as a price.
			-->
			<p class="text-2xl leading-none font-semibold">
				{formatCentsExact(phone.dailyCents)}<span
					class="text-sm font-normal text-muted-foreground"> / day</span
				>
			</p>
			<p class="mt-2 truncate text-sm font-medium">{phone.brand} {phone.model}</p>
			<p class="truncate text-sm text-muted-foreground">
				{phone.storageGb} GB · {phone.colour}
			</p>
		</div>
	</div>

	<!--
		The two figures that decide the purchase: what leaves their pocket today, and what the whole
		thing costs by the end. Both carry the label's weight, because reading only the daily amount
		and missing the deposit is how someone arrives at collection unable to pay.
	-->
	<dl class="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
		<dt>Deposit today</dt>
		<dd class="text-right font-semibold">{formatCents(phone.depositCents)}</dd>
		<dt>Total to pay</dt>
		<dd class="text-right font-semibold">{formatCentsExact(phone.totalPayableCents)}</dd>
	</dl>

	<Separator />

	<!--
		Cash price is reference, not a price on offer — nobody is buying this phone outright on this
		screen. Demoted to a footnote so it stops competing with the two figures above it.
	-->
	<p class="text-xs text-muted-foreground">
		Cash price {formatCents(phone.cashPriceCents)} if bought outright.
	</p>

	<!--
		This form only submits the id; the server re-derives the price and re-checks affordability
		from the stored draft. Hiding a device the applicant cannot afford is a courtesy, not the
		rule — the action refuses a forged id regardless of what the catalogue chose to render.
	-->
	<form method="POST" use:enhance={submit}>
		<input type="hidden" name="phoneId" value={phone.phoneId} />
		<Button
			type="submit"
			size="pill"
			variant={selected ? 'outline' : 'default'}
			disabled={submitting}
			class="w-full"
		>
			{submitting ? 'Selecting…' : selected ? 'Keep this phone' : 'Select this phone'}
		</Button>
	</form>
</Card>
