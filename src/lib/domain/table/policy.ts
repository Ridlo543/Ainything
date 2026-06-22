export function formatQrPath(slug: string, code: string): string {
	return `/r/${slug}/table/${code}`;
}
