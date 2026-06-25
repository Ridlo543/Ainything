import type { MenuItem } from '$lib/domain/menu/types';

export type CartEntry = {
	itemId: string;
	name: string;
	localName?: string;
	price: number;
	image: string;
	qty: number;
	note: string;
};

function storageKey(slug: string): string {
	return `lingua-cart-${slug}`;
}

function loadFromStorage(slug: string): CartEntry[] {
	if (typeof localStorage === 'undefined') return [];
	try {
		const raw = localStorage.getItem(storageKey(slug));
		if (!raw) return [];
		return JSON.parse(raw);
	} catch {
		return [];
	}
}

function saveToStorage(slug: string, entries: CartEntry[]): void {
	if (typeof localStorage === 'undefined') return;
	try {
		if (entries.length === 0) {
			localStorage.removeItem(storageKey(slug));
		} else {
			localStorage.setItem(storageKey(slug), JSON.stringify(entries));
		}
	} catch {
		// storage full or unavailable
	}
}

export function createCartStore(slug: string) {
	let entries = $state<CartEntry[]>(loadFromStorage(slug));

	function persist() {
		saveToStorage(slug, entries);
	}

	return {
		get entries() {
			return entries;
		},
		get count() {
			return entries.reduce((sum, e) => sum + e.qty, 0);
		},
		get total() {
			return entries.reduce((sum, e) => sum + e.price * e.qty, 0);
		},
		add(item: MenuItem, qty = 1) {
			const existing = entries.find((e) => e.itemId === item.id);
			if (existing) {
				entries = entries.map((e) =>
					e.itemId === item.id ? { ...e, qty: e.qty + qty } : e
				);
			} else {
				entries = [
					...entries,
					{
						itemId: item.id,
						name: item.name,
						localName: item.localName,
						price: item.price,
						image: item.image,
						qty,
						note: ''
					}
				];
			}
			persist();
		},
		setQty(itemId: string, qty: number) {
			if (qty <= 0) {
				entries = entries.filter((e) => e.itemId !== itemId);
			} else {
				entries = entries.map((e) => (e.itemId === itemId ? { ...e, qty } : e));
			}
			persist();
		},
		setNote(itemId: string, note: string) {
			entries = entries.map((e) => (e.itemId === itemId ? { ...e, note } : e));
			persist();
		},
		remove(itemId: string) {
			entries = entries.filter((e) => e.itemId !== itemId);
			persist();
		},
		clear() {
			entries = [];
			persist();
		},
		sync() {
			entries = loadFromStorage(slug);
		}
	};
}
