import { LANGUAGES } from './languages';
import type { LanguageTag } from './types';

const SUPPORTED_BCP47 = new Set(LANGUAGES.map((l) => l.bcp47));

const TAG_MAP: Record<string, LanguageTag> = {
	en: 'en',
	id: 'id',
	'zh-hans': 'zh-Hans',
	'zh-cn': 'zh-Hans',
	'zh-sg': 'zh-Hans',
	ko: 'ko',
	ja: 'ja',
	ar: 'ar',
	hi: 'hi',
	fr: 'fr',
	de: 'de'
};

function parseAcceptLanguage(header: string): string[] {
	return header
		.split(',')
		.map((part) => {
			const [tag] = part.trim().split(';');
			return tag?.trim().toLowerCase() ?? '';
		})
		.filter(Boolean);
}

export function detectLanguage(acceptLanguage: string | null, fallback: LanguageTag = 'en'): LanguageTag {
	if (!acceptLanguage) return fallback;

	const candidates = parseAcceptLanguage(acceptLanguage);

	for (const candidate of candidates) {
		if (TAG_MAP[candidate]) return TAG_MAP[candidate];
		const primary = candidate.split('-')[0];
		if (TAG_MAP[primary]) return TAG_MAP[primary];
	}

	return fallback;
}

export function languageDisplayName(tag: LanguageTag, displayLang: LanguageTag): string {
	const lang = LANGUAGES.find((l) => l.tag === tag);
	if (!lang) return tag;

	if (displayLang === 'en') return lang.name;
	if (displayLang === 'id') {
		const NAMES_IN_ID: Partial<Record<LanguageTag, string>> = {
			en: 'Inggris',
			id: 'Indonesia',
			'zh-Hans': 'Tionghoa Sederhana',
			ko: 'Korea',
			ja: 'Jepang',
			ar: 'Arab',
			hi: 'Hindi',
			fr: 'Prancis',
			de: 'Jerman'
		};
		return NAMES_IN_ID[tag] ?? lang.name;
	}

	return lang.nativeName;
}
