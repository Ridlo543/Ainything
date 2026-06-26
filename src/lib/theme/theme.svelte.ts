import { browser } from '$app/environment';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'ainything-theme';
const COOKIE_KEY = 'ainything-theme';

function getSystemTheme(): ResolvedTheme {
	if (!browser) return 'light';
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(resolved: ResolvedTheme) {
	if (!browser) return;
	document.documentElement.dataset.theme = resolved;
	document.documentElement.style.colorScheme = resolved;
}

function writeMode(mode: ThemeMode) {
	if (!browser) return;
	localStorage.setItem(STORAGE_KEY, mode);
	document.cookie = `${COOKIE_KEY}=${mode}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

function createThemeStore() {
	let mode = $state<ThemeMode>('light');
	let systemTheme = $state<ResolvedTheme>('light');

	const resolved = $derived<ResolvedTheme>(mode === 'system' ? systemTheme : mode);

	function init(initial: ThemeMode) {
		if (!browser) return;
		mode = initial;
		systemTheme = getSystemTheme();
		applyTheme(resolved);
	}

	function setMode(next: ThemeMode) {
		mode = next;
		if (browser) {
			systemTheme = getSystemTheme();
			writeMode(next);
			applyTheme(resolved);
		}
	}

	function cycle() {
		const order: ThemeMode[] = ['light', 'dark', 'system'];
		const idx = order.indexOf(mode);
		setMode(order[(idx + 1) % order.length]);
	}

	return {
		get mode() {
			return mode;
		},
		get systemTheme() {
			return systemTheme;
		},
		get resolved() {
			return resolved;
		},
		init,
		setMode,
		cycle
	};
}

export const theme = createThemeStore();

export function readInitialThemeFromCookie(cookieHeader: string | undefined): ThemeMode {
	if (!cookieHeader) return 'system';
	const match = cookieHeader.split('; ').find((row) => row.startsWith(`${COOKIE_KEY}=`));
	if (!match) return 'system';
	const value = match.split('=')[1];
	if (value === 'light' || value === 'dark' || value === 'system') return value;
	return 'system';
}
