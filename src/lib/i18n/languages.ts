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
	{ tag: 'ko', bcp47: 'ko', name: 'Korean', nativeName: '한국어', direction: 'ltr' },
	{ tag: 'ja', bcp47: 'ja', name: 'Japanese', nativeName: '日本語', direction: 'ltr' },
	{ tag: 'ar', bcp47: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'rtl' },
	{ tag: 'hi', bcp47: 'hi', name: 'Hindi', nativeName: 'हिन्दी', direction: 'ltr' },
	{ tag: 'fr', bcp47: 'fr', name: 'French', nativeName: 'Français', direction: 'ltr' },
	{ tag: 'de', bcp47: 'de', name: 'German', nativeName: 'Deutsch', direction: 'ltr' }
] as const;

export function getLanguageInfo(tag: string): LanguageInfo | undefined {
	return LANGUAGES.find((l) => l.tag === tag);
}

export function isRtl(tag: string): boolean {
	return getLanguageInfo(tag)?.direction === 'rtl';
}

export function dir(tag: string): 'rtl' | 'ltr' {
	return isRtl(tag) ? 'rtl' : 'ltr';
}
