<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import {
		Plus,
		Search,
		MoreHorizontal,
		Edit2,
		Eye,
		EyeOff,
		Trash2,
		X,
		Check,
		Tag,
		ImageIcon,
		Loader2
	} from '@lucide/svelte';

	let { data, form: rawForm }: { data: PageData; form: unknown } = $props();

	// Local FormResult type — ActionData resolves to {} due to @ts-nocheck proxy.
	type FormResult = {
		success?: boolean;
		action?: 'created' | 'updated' | 'deleted';
		newStatus?: string;
		itemId?: string;
		error?: string;
		errors?: Record<string, string[]>;
	} | null;

	const form = $derived(rawForm as FormResult);

	const org = $derived(data.tenant.organization);
	const products = $derived(data.products);
	const categories = $derived(data.categories);
	const defaultCatalogId = $derived(data.defaultCatalogId);

	// — Filter state
	let search = $state('');
	let selectedCategory = $state('Semua');
	let statusFilter = $state('all');
	let openMenuId = $state<string | null>(null);

	// — Modal state
	let showModal = $state(false);
	let editingProduct = $state<(typeof products)[0] | null>(null);
	let submitting = $state(false);

	// — Form field state
	let formName = $state('');
	let formPrice = $state('');
	let formDescription = $state('');
	let formStatus = $state('active');
	let formImgPreview = $state('');
	let formImageFile = $state<File | null>(null);

	// Close modal after successful upsert
	$effect(() => {
		if (form?.success && (form.action === 'created' || form.action === 'updated')) {
			showModal = false;
			editingProduct = null;
		}
	});

	const filtered = $derived(
		products
			.filter((p) => selectedCategory === 'Semua' || p.category === selectedCategory)
			.filter((p) => statusFilter === 'all' || p.status === statusFilter)
			.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
	);

	function formatPrice(n: number) {
		return 'Rp ' + n.toLocaleString('id-ID');
	}

	function openAdd() {
		editingProduct = null;
		formName = '';
		formPrice = '';
		formDescription = '';
		formStatus = 'active';
		formImgPreview = '';
		formImageFile = null;
		showModal = true;
	}

	function openEdit(p: (typeof products)[0]) {
		editingProduct = p;
		formName = p.name;
		formPrice = String(p.price);
		formDescription = p.description || '';
		formStatus = p.status;
		formImgPreview = p.img;
		formImageFile = null;
		showModal = true;
		openMenuId = null;
	}

	function closeModal() {
		showModal = false;
		editingProduct = null;
	}

	function handleImageInput(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		formImageFile = file;
		formImgPreview = URL.createObjectURL(file);
	}
</script>

<svelte:head>
	<title>Katalog — {org.name}</title>
</svelte:head>

<div class="space-y-5">
	<!-- ── Header ── -->
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-extrabold text-[#1a1a2e]">Katalog Produk</h1>
			<p class="mt-0.5 text-sm text-[#78716c]">{filtered.length} produk ditampilkan</p>
		</div>
		<button
			type="button"
			onclick={openAdd}
			class="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#059669] px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#047857]"
		>
			<Plus size={16} /> Tambah Produk
		</button>
	</div>

	<!-- ── Toast: server feedback ── -->
	{#if form?.error}
		<div class="rounded-xl bg-[#fef2f2] px-4 py-3 text-sm font-medium text-[#dc2626]">
			{form.error}
		</div>
	{/if}
	{#if form?.success && form.action === 'deleted'}
		<div class="rounded-xl bg-[#d1fae5] px-4 py-3 text-sm font-medium text-[#059669]">
			Produk berhasil dihapus.
		</div>
	{/if}

	<!-- ── Filters ── -->
	<div class="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
		<!-- Search -->
		<div class="relative">
			<Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-[#78716c]" />
			<input
				type="text"
				placeholder="Cari produk..."
				bind:value={search}
				class="h-10 w-full rounded-xl border border-[#f0eeec] bg-[#fafaf9] pl-9 pr-4 text-sm text-[#1a1a2e] placeholder-[#a8a29e] focus:border-[#059669] focus:outline-none focus:ring-2 focus:ring-[#059669]/20"
			/>
		</div>
		<!-- Category tabs + status filter -->
		<div class="flex flex-wrap items-center gap-2">
			<div class="flex gap-1 overflow-x-auto">
				{#each categories as cat (cat)}
					<button
						type="button"
						onclick={() => (selectedCategory = cat)}
						class="min-h-[34px] shrink-0 rounded-lg px-3 text-xs font-semibold transition-colors
							{selectedCategory === cat
							? 'bg-[#059669] text-white'
							: 'border border-[#f0eeec] bg-white text-[#78716c] hover:bg-[#f5f5f4]'}">{cat}</button
					>
				{/each}
			</div>
			<select
				bind:value={statusFilter}
				class="ml-auto min-h-[34px] rounded-lg border border-[#f0eeec] bg-white px-3 text-xs font-semibold text-[#78716c] focus:border-[#059669] focus:outline-none"
				aria-label="Filter status"
			>
				<option value="all">Semua Status</option>
				<option value="active">Aktif</option>
				<option value="hidden">Disembunyikan</option>
			</select>
		</div>
	</div>

	<!-- ── Product grid ── -->
	{#if filtered.length === 0}
		<div
			class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#f0eeec] bg-white py-16 text-center"
		>
			<div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5f5f4]">
				<Tag size={24} class="text-[#a8a29e]" />
			</div>
			<p class="mt-4 text-sm font-semibold text-[#1a1a2e]">Belum ada produk</p>
			<p class="mt-1 text-xs text-[#78716c]">Tambah produk pertama kamu sekarang</p>
			<button
				type="button"
				onclick={openAdd}
				class="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-[#059669] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#047857]"
			>
				<Plus size={15} /> Tambah Produk
			</button>
		</div>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each filtered as product (product.id)}
				<div
					class="group relative flex flex-col rounded-2xl bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md {product.status ===
					'hidden'
						? 'opacity-70'
						: ''}"
				>
					<!-- Image -->
					<div class="relative overflow-hidden rounded-t-2xl">
						<img
							src={product.img}
							alt={product.name}
							class="h-40 w-full object-cover"
							width="300"
							height="160"
							loading="lazy"
						/>
						<!-- Status badge -->
						<span
							class="absolute left-2.5 top-2.5 rounded-full px-2 py-0.5 text-[10px] font-bold
							{product.status === 'active' ? 'bg-[#d1fae5] text-[#059669]' : 'bg-[#f5f5f4] text-[#78716c]'}"
						>
							{product.status === 'active' ? 'Aktif' : 'Disembunyikan'}
						</span>
						<!-- Menu button -->
						<div class="absolute right-2 top-2">
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									openMenuId = openMenuId === product.id ? null : product.id;
								}}
								class="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-[#78716c] shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-[#1a1a2e]"
								aria-label="Opsi produk"
							>
								<MoreHorizontal size={15} />
							</button>
							{#if openMenuId === product.id}
								<div
									class="absolute right-0 top-10 z-20 w-44 rounded-xl border border-[#f0eeec] bg-white py-1 shadow-lg"
								>
									<!-- Edit -->
									<button
										type="button"
										onclick={() => openEdit(product)}
										class="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-[#1a1a2e] hover:bg-[#f5f5f4]"
									>
										<Edit2 size={14} /> Edit Produk
									</button>

									<!-- Toggle availability -->
									<form method="POST" action="?/toggleAvailability" use:enhance>
										<input type="hidden" name="itemId" value={product.id} />
										<input type="hidden" name="currentStatus" value={product.status} />
										<button
											type="submit"
											class="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-[#1a1a2e] hover:bg-[#f5f5f4]"
										>
											{#if product.status === 'active'}
												<EyeOff size={14} /> Sembunyikan
											{:else}
												<Eye size={14} /> Aktifkan
											{/if}
										</button>
									</form>

									<div class="my-1 h-px bg-[#f5f5f4]"></div>

									<!-- Delete -->
									<form
										method="POST"
										action="?/deleteProduct"
										use:enhance={() => {
											if (!confirm(`Hapus "${product.name}"? Tindakan ini tidak bisa dibatalkan.`)) {
												return () => {};
											}
											openMenuId = null;
										}}
									>
										<input type="hidden" name="productId" value={product.id} />
										<button
											type="submit"
											class="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-[#dc2626] hover:bg-[#fef2f2]"
										>
											<Trash2 size={14} /> Hapus
										</button>
									</form>
								</div>
							{/if}
						</div>
					</div>

					<!-- Info -->
					<div class="flex flex-1 flex-col p-4">
						<span class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#78716c]"
							>{product.category}</span
						>
						<p class="flex-1 text-sm font-bold leading-snug text-[#1a1a2e]">{product.name}</p>
						<div class="mt-3 flex items-center justify-between">
							<span class="text-base font-extrabold text-[#059669]"
								>{formatPrice(product.price)}</span
							>
							<span class="text-[11px] text-[#a8a29e]">{product.orders} pesanan</span>
						</div>
						<button
							type="button"
							onclick={() => openEdit(product)}
							class="mt-3 flex min-h-[36px] w-full items-center justify-center gap-1.5 rounded-xl border border-[#f0eeec] text-xs font-semibold text-[#78716c] transition-colors hover:border-[#059669] hover:text-[#059669]"
						>
							<Edit2 size={13} /> Edit Produk
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- ── Add/Edit Modal ── -->
	{#if showModal}
		<div
			class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
			role="dialog"
			aria-modal="true"
			tabindex="-1"
			aria-label={editingProduct ? 'Edit produk' : 'Tambah produk'}
			onclick={(e) => {
				if (e.target === e.currentTarget) closeModal();
			}}
			onkeydown={(e) => e.key === 'Escape' && closeModal()}
		>
			<div class="w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-2xl">
				<!-- Modal header -->
				<div class="mb-5 flex items-center justify-between">
					<h2 class="text-lg font-extrabold text-[#1a1a2e]">
						{editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
					</h2>
					<button
						type="button"
						onclick={closeModal}
						class="flex h-9 w-9 items-center justify-center rounded-xl text-[#78716c] transition-colors hover:bg-[#f5f5f4]"
						aria-label="Tutup"
					>
						<X size={18} />
					</button>
				</div>

				<!-- Form errors -->
				{#if form?.error && !form?.success}
					<div class="mb-4 rounded-xl bg-[#fef2f2] px-4 py-3 text-sm text-[#dc2626]">
						{form.error}
					</div>
				{/if}

				<form
					method="POST"
					action="?/upsertProduct"
					enctype="multipart/form-data"
					use:enhance={() => {
						submitting = true;
						return async ({ update }) => {
							submitting = false;
							await update();
						};
					}}
					class="space-y-4"
				>
					<!-- Hidden fields -->
					{#if editingProduct}
						<input type="hidden" name="productId" value={editingProduct.id} />
					{/if}
					{#if defaultCatalogId && !editingProduct}
						<input type="hidden" name="catalogId" value={defaultCatalogId} />
					{/if}

					<!-- Image upload -->
					<div>
						<label for="photo-upload" class="mb-1.5 block text-sm font-semibold text-[#1a1a2e]"
							>Foto Produk</label
						>
						<label
							for="photo-upload"
							class="flex h-36 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-[#f0eeec] bg-[#fafaf9] transition-colors hover:border-[#059669] hover:bg-[#f0fdf4]"
						>
							{#if formImgPreview}
								<img src={formImgPreview} alt="Preview" class="h-full w-full object-cover" />
							{:else}
								<div class="flex flex-col items-center gap-2 text-[#78716c]">
									<ImageIcon size={28} class="opacity-40" />
									<span class="text-xs">Klik untuk upload foto</span>
									<span class="text-[10px] opacity-60">JPG, PNG, WebP — maks 5 MB</span>
								</div>
							{/if}
						</label>
						<input
							id="photo-upload"
							type="file"
							name="image"
							accept="image/jpeg,image/png,image/webp,image/gif"
							class="sr-only"
							onchange={handleImageInput}
						/>
						{#if form?.errors?.image}
							<p class="mt-1 text-xs text-[#dc2626]">{form.errors.image[0]}</p>
						{/if}
					</div>

					<!-- Name -->
					<div>
						<label for="product-name" class="mb-1.5 block text-sm font-semibold text-[#1a1a2e]"
							>Nama Produk <span class="text-[#dc2626]">*</span></label
						>
						<input
							id="product-name"
							name="name"
							type="text"
							required
							bind:value={formName}
							placeholder="Contoh: Nasi Goreng Spesial"
							class="h-11 w-full rounded-xl border border-[#f0eeec] bg-[#fafaf9] px-3 text-sm text-[#1a1a2e] placeholder-[#a8a29e] focus:border-[#059669] focus:outline-none focus:ring-2 focus:ring-[#059669]/20"
						/>
						{#if form?.errors?.name}
							<p class="mt-1 text-xs text-[#dc2626]">{form.errors.name[0]}</p>
						{/if}
					</div>

					<!-- Price -->
					<div>
						<label for="product-price" class="mb-1.5 block text-sm font-semibold text-[#1a1a2e]"
							>Harga <span class="text-[#dc2626]">*</span></label
						>
						<div class="relative">
							<span
								class="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#78716c]"
								>Rp</span
							>
							<input
								id="product-price"
								name="price"
								type="number"
								required
								min="0"
								step="1"
								bind:value={formPrice}
								placeholder="25000"
								class="h-11 w-full rounded-xl border border-[#f0eeec] bg-[#fafaf9] pl-10 pr-3 text-sm text-[#1a1a2e] placeholder-[#a8a29e] focus:border-[#059669] focus:outline-none focus:ring-2 focus:ring-[#059669]/20"
							/>
						</div>
						{#if form?.errors?.price}
							<p class="mt-1 text-xs text-[#dc2626]">{form.errors.price[0]}</p>
						{/if}
					</div>

					<!-- Description -->
					<div>
						<label
							for="product-description"
							class="mb-1.5 block text-sm font-semibold text-[#1a1a2e]">Deskripsi</label
						>
						<textarea
							id="product-description"
							name="description"
							bind:value={formDescription}
							placeholder="Deskripsikan produk kamu..."
							rows="3"
							class="w-full resize-none rounded-xl border border-[#f0eeec] bg-[#fafaf9] px-3 py-2.5 text-sm text-[#1a1a2e] placeholder-[#a8a29e] focus:border-[#059669] focus:outline-none focus:ring-2 focus:ring-[#059669]/20"
						></textarea>
					</div>

					<!-- Status -->
					<div>
						<p class="mb-2 text-sm font-semibold text-[#1a1a2e]">Status</p>
						<div class="flex gap-3">
							{#each [{ value: 'active', label: 'Aktif' }, { value: 'hidden', label: 'Sembunyikan' }] as opt (opt.value)}
								<button
									type="button"
									onclick={() => (formStatus = opt.value)}
									class="flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition-colors
										{formStatus === opt.value
										? 'border-[#059669] bg-[#f0fdf4] text-[#059669]'
										: 'border-[#f0eeec] text-[#78716c] hover:bg-[#f5f5f4]'}"
								>
									{#if formStatus === opt.value}
										<span class="h-2 w-2 rounded-full bg-[#059669]"></span>
									{/if}
									{opt.label}
								</button>
							{/each}
						</div>
						<input type="hidden" name="status" value={formStatus} />
					</div>

					<!-- Actions -->
					<div class="flex gap-3 pt-2">
						<button
							type="button"
							onclick={closeModal}
							class="flex-1 min-h-[44px] rounded-xl border border-[#f0eeec] text-sm font-semibold text-[#78716c] transition-colors hover:bg-[#f5f5f4]"
							>Batal</button
						>
						<button
							type="submit"
							disabled={submitting}
							class="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#059669] text-sm font-bold text-white transition-colors hover:bg-[#047857] disabled:opacity-60"
						>
							{#if submitting}
								<Loader2 size={16} class="animate-spin" />
							{:else}
								<Check size={16} />
							{/if}
							{editingProduct ? 'Simpan Perubahan' : 'Tambah Produk'}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- Close dropdown on outside click -->
	{#if openMenuId}
		<div class="fixed inset-0 z-10" role="presentation" onclick={() => (openMenuId = null)}></div>
	{/if}
</div>
