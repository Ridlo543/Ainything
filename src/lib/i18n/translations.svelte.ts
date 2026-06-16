import type { LanguageTag, I18nState } from './types';
import { loadDict } from './translations';

let current = $state<I18nState>({
	language: 'en',
	dict: loadDict('en')
});

export function getState(): I18nState {
	return current;
}

export function setLanguage(lang: LanguageTag): void {
	current = { language: lang, dict: loadDict(lang) };
}

export function t(key: string): string {
	return current.dict[key] ?? key;
}

export function tWithVars(key: string, vars: Record<string, string>): string {
	let result = current.dict[key] ?? key;
	for (const [k, v] of Object.entries(vars)) {
		result = result.replace(`{${k}}`, v);
	}
	return result;
}
