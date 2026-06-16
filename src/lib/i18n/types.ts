import type { LanguageTag } from '$lib/domain/menu/types';

export type { LanguageTag };

export type TranslationDict = Record<string, string>;

export type LanguageInfo = {
	tag: LanguageTag;
	bcp47: string;
	name: string;
	nativeName: string;
	direction: 'ltr' | 'rtl';
};

export type I18nState = {
	language: LanguageTag;
	dict: TranslationDict;
};
