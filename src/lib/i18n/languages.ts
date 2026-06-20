import type { LanguageInfo } from './types';

export const LANGUAGES: LanguageInfo[] = [
	{ tag: 'en', bcp47: 'en', name: 'English', nativeName: 'English', direction: 'ltr' },
	{ tag: 'id', bcp47: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', direction: 'ltr' },
	{
		tag: 'zh-Hans',
		bcp47: 'zh-Hans',
		name: 'Chinese (Simplified)',
		nativeName: '简体中文',
		direction: 'ltr'
	},
	{ tag: 'ja', bcp47: 'ja', name: 'Japanese', nativeName: '日本語', direction: 'ltr' }
] as const;

export function getLanguageInfo(tag: string): LanguageInfo | undefined {
	return LANGUAGES.find((l) => l.tag === tag);
}

const RTL_CODES = new Set(['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'dv', 'ku', 'yi']);

export function isRtl(tag: string): boolean {
	const info = getLanguageInfo(tag);
	if (info) return info.direction === 'rtl';
	const code = tag.split('-')[0];
	return RTL_CODES.has(code);
}

export function dir(tag: string): 'rtl' | 'ltr' {
	return isRtl(tag) ? 'rtl' : 'ltr';
}
