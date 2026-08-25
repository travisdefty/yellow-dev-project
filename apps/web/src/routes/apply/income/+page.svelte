<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import FieldError from '$lib/components/FieldError.svelte';
	import FileUpIcon from '@lucide/svelte/icons/file-up';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import XIcon from '@lucide/svelte/icons/x';

	let income = $state('');
	let proofFile = $state<File | null>(null);
	let previewUrl = $state<string | null>(null);
	let proofKey = $state(0);
	let draggingOver = $state(false);

	function isAcceptedProof(file: File) {
		return file.type.startsWith('image/') || file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
	}

	function setProof(file: File | null) {
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		proofFile = file;
		previewUrl = file?.type.startsWith('image/') ? URL.createObjectURL(file) : null;
	}

	function onProofInput(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		setProof(input.files?.[0] ?? null);
	}

	function onDragEnter(event: DragEvent) {
		event.preventDefault();
		draggingOver = true;
	}

	function onDragOver(event: DragEvent) {
		event.preventDefault();
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
	}

	function onDragLeave(event: DragEvent) {
		const current = event.currentTarget as HTMLElement;
		const related = event.relatedTarget as Node | null;
		if (related && current.contains(related)) return;
		draggingOver = false;
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();
		draggingOver = false;
		const files = event.dataTransfer?.files;
		const file = files?.[0] && isAcceptedProof(files[0]) ? files[0] : null;
		if (file) setProof(file);
	}

	function clearProof() {
		setProof(null);
		proofKey += 1;
	}

	function proofSize(file: File) {
		if (file.size < 1024) return `${file.size} B`;
		if (file.size < 1024 * 1024) return `${(file.size / 1024).toFixed(1)} KB`;
		return `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
	}
</script>

<svelte:head><title>Your income | Yellow</title></svelte:head>

<form class="flex flex-col gap-5">
	<div>
		<Label for="income" class="mb-1.5">What do you earn each month, before deductions?</Label>
		<Input
			id="income"
			bind:value={income}
			inputmode="decimal"
			placeholder="R 0"
			aria-describedby="income-hint income-error"
		/>
		<p id="income-hint" class="mt-1.5 text-sm text-muted-foreground">
			We only show phones you can comfortably repay.
		</p>
		<FieldError id="income-error" />
	</div>

	<div>
		<Label for="proof" class="mb-1.5">Proof of income</Label>
		{#key proofKey}
			<input
				id="proof"
				class="peer sr-only"
				type="file"
				accept="image/*,application/pdf"
				aria-describedby="proof-hint"
				onchange={onProofInput}
			/>
		{/key}
		{#if proofFile}
			<div class="flex items-center gap-3 rounded-lg border border-input bg-card p-3">
				{#if previewUrl}
					<img src={previewUrl} alt="" class="size-14 rounded-md object-cover" />
				{:else}
					<div class="flex size-14 items-center justify-center rounded-md bg-muted">
						<FileTextIcon class="size-6" aria-hidden="true" />
					</div>
				{/if}
				<div class="min-w-0 flex-1">
					<p class="truncate text-sm font-medium">{proofFile.name}</p>
					<p class="text-xs text-muted-foreground">{proofSize(proofFile)}</p>
				</div>
				<Button variant="ghost" size="icon" onclick={clearProof} aria-label="Remove proof of income">
					<XIcon />
				</Button>
			</div>
		{:else}
			<div
				role="presentation"
				class={[
					'rounded-lg border border-dashed transition-colors',
					draggingOver ? 'border-foreground bg-muted/40' : 'border-input bg-card'
				]}
				ondragenter={onDragEnter}
				ondragover={onDragOver}
				ondragleave={onDragLeave}
				ondrop={onDrop}
			>
				<label
					for="proof"
					class="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1.5 px-4 py-5 text-center hover:bg-muted/40 peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 [&_*]:pointer-events-none"
				>
					<FileUpIcon class="size-6" aria-hidden="true" />
					<span class="text-sm font-medium">Choose a file</span>
					<span class="text-xs text-muted-foreground">Payslip or bank statement</span>
				</label>
			</div>
		{/if}
		<p id="proof-hint" class="mt-1.5 text-sm text-muted-foreground">
			A payslip or a bank statement. A clear photo is fine.
		</p>
	</div>

	<div class="flex gap-3">
		<Button size="pill" variant="outline" href="/apply/details" class="flex-1">Back</Button>
		<Button size="pill" href="/apply/phone" class="flex-1">Continue</Button>
	</div>
</form>
