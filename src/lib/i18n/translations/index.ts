import type { LanguageTag } from '../types';
import { en } from './en';
import { id } from './id';
import type { TranslationDict } from '../types';

const dicts: Record<string, TranslationDict> = { en, id };

export function loadDict(lang: LanguageTag): TranslationDict {
	return dicts[lang] ?? en;
}

export function hasDict(lang: string): boolean {
	return lang in dicts;
}
