<script lang="ts">
	import type { PageData } from './$types';
	import { Plus, Edit2, Trash2, X, Check, Tag, ChevronRight } from '@lucide/svelte';

	let { data }: { data: PageData } = $props();
	const org = $derived(data.tenant.organization);

	const categories = $state([
		{ id: '1', name: 'Signatures', description: 'Menu andalan restoran', productCount: 3, color: '#059669' },
		{ id: '2', name: 'Drinks', description: 'Minuman segar', productCount: 2, color: '#2563eb' },
		{ id: '3', name: 'Satay', description: 'Berbagai sate pilihan', productCount: 2, color: '#d97706' },
		{ id: '4', name: 'Seafood', description: 'Ikan dan hasil laut segar', productCount: 1, color: '#db2777' },
	]);

	const colorOptions = ['#059669', '#2563eb', '#d97706', '#db2777', '#7c3aed', '#dc2626'];

	let showModal = $state(false);
	let editingId = $state<string | null>(null);
	let formName = $state('');
	let formDescription = $state('');
	let formColor = $state(colorOptions[0]);

	function openAdd() {
		editingId = null;
		formName = '';
		formDescription = '';
		formColor = colorOptions[0];
		showModal = true;
	}

	function openEdit(c: typeof categories[0]) {
		editingId = c.id;
		formName = c.name;
		formDescription = c.description;
		formColor = c.color;
		showModal = true;
	}
</script>

<svelte:head>
	<title>Kategori — {org.name}</title>
</svelte:head>

<div class="space-y-5">

	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-extrabold text-[#1a1a2e]">Kategori</h1>
			<p class="mt-0.5 text-sm text-[#78716c]">{categories.length} kategori</p>
		</div>
		<button
			type="button"
			onclick={openAdd}
			class="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#059669] px-4 text-sm font-bold text-white shadow-sm hover:bg-[#047857] transition-colors"
		>
			<Plus size={16} /> Tambah Kategori
		</button>
	</div>

	{#if categories.length === 0}
		<div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#e7e5e4] bg-white py-16 text-center">
			<div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5f5f4]">
				<Tag size={24} class="text-[#a8a29e]" />
			</div>
			<p class="mt-4 text-sm font-semibold text-[#1a1a2e]">Belum ada kategori</p>
			<p class="mt-1 text-xs text-[#78716c]">Buat kategori untuk mengelompokkan produk kamu</p>
			<button
				type="button"
				onclick={openAdd}
				class="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-[#059669] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#047857] transition-colors"
			>
				<Plus size={15} /> Tambah Kategori
			</button>
		</div>
	{:else}
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each categories as cat (cat.id)}
				<div class="group flex items-center gap-4 rounded-2xl border border-[#e7e5e4] bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
					<div
						class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
						style="background-color: {cat.color}"
					>
						<Tag size={22} />
					</div>
					<div class="min-w-0 flex-1">
						<p class="font-bold text-[#1a1a2e]">{cat.name}</p>
						<p class="mt-0.5 text-xs text-[#78716c]">{cat.productCount} produk</p>
						{#if cat.description}
							<p class="mt-1 truncate text-xs text-[#a8a29e]">{cat.description}</p>
						{/if}
					</div>
					<div class="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
						<button
							type="button"
							onclick={() => openEdit(cat)}
							class="flex h-8 w-8 items-center justify-center rounded-lg text-[#78716c] hover:bg-[#f5f5f4] hover:text-[#1a1a2e] transition-colors"
							aria-label="Edit {cat.name}"
						>
							<Edit2 size={14} />
						</button>
						<button
							type="button"
							class="flex h-8 w-8 items-center justify-center rounded-lg text-[#78716c] hover:bg-[#fef2f2] hover:text-[#dc2626] transition-colors"
							aria-label="Hapus {cat.name}"
						>
							<Trash2 size={14} />
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Add/Edit Modal -->
	{#if showModal}
		<div
			class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
			role="dialog" aria-modal="true" tabindex="-1"
			onclick={(e) => { if (e.target === e.currentTarget) showModal = false; }}
			onkeydown={(e) => e.key === 'Escape' && (showModal = false)}
		>
			<div class="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-2xl">
				<div class="mb-5 flex items-center justify-between">
					<h2 class="text-lg font-extrabold text-[#1a1a2e]">{editingId ? 'Edit Kategori' : 'Tambah Kategori'}</h2>
					<button type="button" onclick={() => (showModal = false)} class="flex h-9 w-9 items-center justify-center rounded-xl text-[#78716c] hover:bg-[#f5f5f4]" aria-label="Tutup">
						<X size={18} />
					</button>
				</div>
				<div class="space-y-4">
					<div>
						<label for="cat-name" class="mb-1.5 block text-sm font-semibold text-[#1a1a2e]">Nama Kategori <span class="text-[#dc2626]">*</span></label>
						<input id="cat-name" type="text" bind:value={formName} placeholder="Contoh: Makanan Utama" class="h-11 w-full rounded-xl border border-[#e7e5e4] bg-[#fafaf9] px-4 text-sm focus:border-[#059669] focus:outline-none focus:ring-2 focus:ring-[#059669]/20" required />
					</div>
					<div>
						<label for="cat-desc" class="mb-1.5 block text-sm font-semibold text-[#1a1a2e]">Deskripsi</label>
						<input id="cat-desc" type="text" bind:value={formDescription} placeholder="Deskripsi singkat (opsional)" class="h-11 w-full rounded-xl border border-[#e7e5e4] bg-[#fafaf9] px-4 text-sm focus:border-[#059669] focus:outline-none focus:ring-2 focus:ring-[#059669]/20" />
					</div>
					<div>
						<p class="mb-2 text-sm font-semibold text-[#1a1a2e]">Warna</p>
						<div class="flex gap-2">
							{#each colorOptions as color}
								<button
									type="button"
									onclick={() => (formColor = color)}
									class="h-8 w-8 rounded-full transition-transform hover:scale-110 {formColor === color ? 'ring-2 ring-offset-2 scale-110' : ''}"
									style="background-color: {color}; ring-color: {color}"
									aria-label="Pilih warna {color}"
								></button>
							{/each}
						</div>
					</div>
				</div>
				<div class="mt-6 flex gap-3">
					<button type="button" onclick={() => (showModal = false)} class="flex-1 min-h-[44px] rounded-xl border border-[#e7e5e4] text-sm font-semibold text-[#78716c] hover:bg-[#f5f5f4] transition-colors">Batal</button>
					<button type="button" onclick={() => (showModal = false)} class="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#059669] text-sm font-bold text-white hover:bg-[#047857] transition-colors">
						<Check size={16} /> {editingId ? 'Simpan' : 'Tambah'}
					</button>
				</div>
			</div>
		</div>
	{/if}

</div>
