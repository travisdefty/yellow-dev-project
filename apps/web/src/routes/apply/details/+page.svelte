<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import FieldError from '$lib/components/FieldError.svelte';

	// Phase 1 is markup only. Phase 2 binds these to step state and runs the shared Zod schemas
	// against them, so the fields, ids and error slots are laid out now and not moved again.
	let firstName = $state('');
	let lastName = $state('');
	let mobile = $state('');
	let idNumber = $state('');
	let dobDay = $state('');
	let dobMonth = $state('');
	let dobYear = $state('');
</script>

<svelte:head><title>Your details | Yellow</title></svelte:head>

<form class="flex flex-col gap-5">
	<div class="grid grid-cols-2 gap-3">
		<div>
			<Label for="firstName" class="mb-1.5">First name</Label>
			<Input id="firstName" bind:value={firstName} autocomplete="given-name" />
		</div>
		<div>
			<Label for="lastName" class="mb-1.5">Last name</Label>
			<Input id="lastName" bind:value={lastName} autocomplete="family-name" />
		</div>
	</div>

	<div>
		<!--
			Called "mobile number" rather than "phone number": the next step but one is choosing a
			phone, and two fields called phone in one wizard is a support ticket waiting to happen.
		-->
		<Label for="mobile" class="mb-1.5">Mobile number</Label>
		<Input
			id="mobile"
			type="tel"
			bind:value={mobile}
			inputmode="tel"
			autocomplete="tel-national"
			maxlength={10}
			placeholder="082 123 4567"
			aria-describedby="mobile-hint mobile-error"
		/>
		<p id="mobile-hint" class="mt-1.5 text-sm text-muted-foreground">
			We use this to confirm your application and arrange delivery.
		</p>
		<FieldError id="mobile-error" />
	</div>

	<div>
		<Label for="idNumber" class="mb-1.5">South African ID number</Label>
		<Input
			id="idNumber"
			bind:value={idNumber}
			inputmode="numeric"
			maxlength={13}
			placeholder="13 digits"
			aria-describedby="idNumber-error"
		/>
		<FieldError id="idNumber-error" />
	</div>

	<fieldset>
		<legend class="mb-1.5 text-sm font-medium">Date of birth</legend>
		<!--
			Asked for as well as the ID, not instead of it. A South African ID carries no century, so
			deriving the birthday means guessing 1908 or 2008 — and that guess is the age gate. The
			date supplies the century and turns the ID into a cross-check that also catches a
			transposed digit which still passes the checksum.
		-->
		<div class="grid grid-cols-3 gap-3">
			<Input aria-label="Day" bind:value={dobDay} inputmode="numeric" maxlength={2} placeholder="DD" />
			<Input aria-label="Month" bind:value={dobMonth} inputmode="numeric" maxlength={2} placeholder="MM" />
			<Input aria-label="Year" bind:value={dobYear} inputmode="numeric" maxlength={4} placeholder="YYYY" />
		</div>
		<p class="mt-1.5 text-sm text-muted-foreground">
			You must be between 18 and 65. This cannot be changed once we have checked it.
		</p>
		<FieldError id="dob-error" />
	</fieldset>

	<Button size="pill" href="/apply/income" class="mt-2">Continue</Button>
</form>
