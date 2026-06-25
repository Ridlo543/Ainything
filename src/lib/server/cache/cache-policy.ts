export type CacheStrategy = {
	'Cache-Control': string;
	Vary?: string;
};

const PUBLIC_CATALOG: CacheStrategy = {
	'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
	Vary: 'Accept-Language'
};

const PUBLIC_PAGE: CacheStrategy = {
	'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
	Vary: 'Accept-Language'
};

const PUBLIC_API_DYNAMIC: CacheStrategy = {
	'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=60'
};

const PRIVATE_NO_STORE: CacheStrategy = {
	'Cache-Control': 'private, no-store, no-cache, must-revalidate'
};

const PRIVATE_SHORT: CacheStrategy = {
	'Cache-Control': 'private, max-age=30'
};

export const cachePolicy = {
	PUBLIC_CATALOG,
	PUBLIC_PAGE,
	PUBLIC_API_DYNAMIC,
	PRIVATE_NO_STORE,
	PRIVATE_SHORT
} as const;

export function applyCacheHeaders(headers: Headers, strategy: CacheStrategy): void {
	for (const [key, value] of Object.entries(strategy)) {
		if (value) {
			headers.set(key, value);
		}
	}
}

export function resolveRouteStrategy(pathname: string): CacheStrategy {
	if (pathname.startsWith('/api/public/bootstrap')) {
		return PUBLIC_CATALOG;
	}
	if (pathname.startsWith('/api/public/')) {
		return PUBLIC_API_DYNAMIC;
	}
	if (pathname.startsWith('/r/')) {
		return PUBLIC_PAGE;
	}
	if (pathname.startsWith('/api/admin/') || pathname.startsWith('/api/platform/')) {
		return PRIVATE_NO_STORE;
	}
	return PRIVATE_NO_STORE;
}
