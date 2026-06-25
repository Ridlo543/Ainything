<script lang="ts">
	import type { PageData } from './$types';
	import {
		Plus,
		Search,
		MoreHorizontal,
		Edit2,
		Eye,
		EyeOff,
		Trash2,
		Copy,
		X,
		Check,
		Tag,
		ImageIcon
	} from '@lucide/svelte';

	let { data }: { data: PageData } = $props();
	const org = $derived(data.tenant.organization);

	const products = $derived(data.products);
	const categories = $derived(data.categories);

	// — State
	let search = $state('');
	let selectedCategory = $state('Semua');
	let statusFilter = $state('all');
	let showModal = $state(false);
	let editingProduct = $state<(typeof products)[0] | null>(null);
	let openMenuId = $state<string | null>(null);

	// — Form state
	let formName = $state('');
	let formCategory = $state('');
	let formPrice = $state('');
	let formDescription = $state('');
	let formStatus = $state('active');
	let formImgPreview = $state('');

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
		formCategory = categories[1] || '';
		formPrice = '';
		formDescription = '';
		formStatus = 'active';
		formImgPreview = '';
		showModal = true;
	}

	function openEdit(p: (typeof products)[0]) {
		editingProduct = p;
		formName = p.name;
		formCategory = p.category;
		formPrice = String(p.price);
		formDescription = p.description || '';
		formStatus = p.status;
		formImgPreview = p.img;
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
		const url = URL.createObjectURL(file);
		formImgPreview = url;
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
			class="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#059669] px-4 text-sm font-bold text-white shadow-sm hover:bg-[#047857] transition-colors"
		>
			<Plus size={16} /> Tambah Produk
		</button>
	</div>

	<!-- ── Filters ── -->
	<div class="rounded-2xl bg-white p-4 shadow-sm space-y-3">
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
				class="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-[#059669] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#047857] transition-colors"
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
								class="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-[#78716c] shadow-sm backdrop-blur-sm hover:bg-white hover:text-[#1a1a2e] transition-colors"
								aria-label="Opsi produk"
							>
								<MoreHorizontal size={15} />
							</button>
							{#if openMenuId === product.id}
								<div
									class="absolute right-0 top-10 z-20 w-40 rounded-xl border border-[#f0eeec] bg-white py-1 shadow-lg"
								>
									<button
										type="button"
										onclick={() => openEdit(product)}
										class="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-[#1a1a2e] hover:bg-[#f5f5f4]"
									>
										<Edit2 size={14} /> Edit
									</button>
									<button
										type="button"
										class="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-[#1a1a2e] hover:bg-[#f5f5f4]"
									>
										{#if product.status === 'active'}
											<EyeOff size={14} /> Sembunyikan
										{:else}
											<Eye size={14} /> Aktifkan
										{/if}
									</button>
									<button
										type="button"
										class="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-[#1a1a2e] hover:bg-[#f5f5f4]"
									>
										<Copy size={14} /> Duplikat
									</button>
									<div class="my-1 h-px bg-[#f5f5f4]"></div>
									<button
										type="button"
										class="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-[#dc2626] hover:bg-[#fef2f2]"
									>
										<Trash2 size={14} /> Hapus
									</button>
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
						class="flex h-9 w-9 items-center justify-center rounded-xl text-[#78716c] hover:bg-[#f5f5f4] transition-colors"
						aria-label="Tutup"
					>
						<X size={18} />
					</button>
				</div>

				<!-- Image upload -->
				<div class="mb-4">
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
								<span class="text-xs font-medium">Tap untuk upload foto</span>
								<span class="text-[11px] text-[#a8a29e]">JPG, PNG, WebP — maks 5MB</span>
							</div>
						{/if}
						<input
							id="photo-upload"
							type="file"
							accept="image/*"
							class="sr-only"
							onchange={handleImageInput}
						/>
					</label>
				</div>

				<!-- Form fields -->
				<div class="space-y-4">
					<div>
						<label for="form-name" class="mb-1.5 block text-sm font-semibold text-[#1a1a2e]"
							>Nama Produk <span class="text-[#dc2626]">*</span></label
						>
						<input
							id="form-name"
							type="text"
							bind:value={formName}
							placeholder="Contoh: Nasi Goreng Spesial"
							class="h-11 w-full rounded-xl border border-[#f0eeec] bg-[#fafaf9] px-4 text-sm text-[#1a1a2e] placeholder-[#a8a29e] focus:border-[#059669] focus:outline-none focus:ring-2 focus:ring-[#059669]/20"
							required
						/>
					</div>

					<div class="grid grid-cols-2 gap-3">
						<div>
							<label for="form-price" class="mb-1.5 block text-sm font-semibold text-[#1a1a2e]"
								>Harga <span class="text-[#dc2626]">*</span></label
							>
							<div class="relative">
								<span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#78716c]"
									>Rp</span
								>
								<input
									id="form-price"
									type="number"
									bind:value={formPrice}
									placeholder="25000"
									min="0"
									class="h-11 w-full rounded-xl border border-[#f0eeec] bg-[#fafaf9] pl-10 pr-4 text-sm text-[#1a1a2e] placeholder-[#a8a29e] focus:border-[#059669] focus:outline-none focus:ring-2 focus:ring-[#059669]/20"
									required
								/>
							</div>
						</div>
						<div>
							<label for="form-cat" class="mb-1.5 block text-sm font-semibold text-[#1a1a2e]"
								>Kategori</label
							>
							<select
								id="form-cat"
								bind:value={formCategory}
								class="h-11 w-full rounded-xl border border-[#f0eeec] bg-[#fafaf9] px-3 text-sm text-[#1a1a2e] focus:border-[#059669] focus:outline-none"
							>
								{#each categories.slice(1) as cat (cat)}
									<option value={cat}>{cat}</option>
								{/each}
							</select>
						</div>
					</div>

					<div>
						<label for="form-desc" class="mb-1.5 block text-sm font-semibold text-[#1a1a2e]"
							>Deskripsi</label
						>
						<textarea
							id="form-desc"
							bind:value={formDescription}
							rows={3}
							placeholder="Deskripsi singkat produk (opsional)"
							class="w-full resize-none rounded-xl border border-[#f0eeec] bg-[#fafaf9] px-4 py-3 text-sm text-[#1a1a2e] placeholder-[#a8a29e] focus:border-[#059669] focus:outline-none focus:ring-2 focus:ring-[#059669]/20"
						></textarea>
					</div>

					<!-- Status toggle -->
					<div
						class="flex items-center justify-between rounded-xl border border-[#f0eeec] bg-[#fafaf9] px-4 py-3"
					>
						<div>
							<p class="text-sm font-semibold text-[#1a1a2e]">Tampilkan di katalog</p>
							<p class="text-xs text-[#78716c]">Pelanggan bisa melihat dan memesan produk ini</p>
						</div>
						<button
							type="button"
							onclick={() => (formStatus = formStatus === 'active' ? 'hidden' : 'active')}
							class="relative h-6 w-11 shrink-0 rounded-full transition-colors {formStatus ===
							'active'
								? 'bg-[#059669]'
								: 'bg-[#e7e5e4]'}"
							role="switch"
							aria-checked={formStatus === 'active'}
							aria-label="Toggle ketersediaan"
						>
							<span
								class="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform {formStatus ===
								'active'
									? 'translate-x-5'
									: 'translate-x-0.5'}"
							></span>
						</button>
					</div>
				</div>

				<!-- Actions -->
				<div class="mt-6 flex gap-3">
					<button
						type="button"
						onclick={closeModal}
						class="flex-1 min-h-[44px] rounded-xl border border-[#f0eeec] text-sm font-semibold text-[#78716c] hover:bg-[#f5f5f4] transition-colors"
						>Batal</button
					>
					<button
						type="button"
						onclick={closeModal}
						class="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#059669] text-sm font-bold text-white hover:bg-[#047857] transition-colors"
					>
						<Check size={16} />
						{editingProduct ? 'Simpan Perubahan' : 'Tambah Produk'}
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Close dropdown on outside click -->
	{#if openMenuId}
		<div class="fixed inset-0 z-10" role="presentation" onclick={() => (openMenuId = null)}></div>
	{/if}
</div>
