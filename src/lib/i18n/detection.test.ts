import { describe, expect, it } from 'vitest';
import { detectLanguage, languageDisplayName } from './detection';

describe('detectLanguage', () => {
	it('falls back to en when header is null', () => {
		expect(detectLanguage(null)).toBe('en');
	});

	it('returns en for English Accept-Language', () => {
		expect(detectLanguage('en-US,en;q=0.9')).toBe('en');
	});

	it('returns id for Indonesian', () => {
		expect(detectLanguage('id,en;q=0.5')).toBe('id');
	});

	it('returns zh-Hans for simplified Chinese', () => {
		expect(detectLanguage('zh-CN,zh;q=0.9')).toBe('zh-Hans');
	});

	it('returns en for unsupported language code (Korean)', () => {
		expect(detectLanguage('ko,en;q=0.5')).toBe('en');
	});

	it('falls back to en for unsupported language', () => {
		expect(detectLanguage('th,en;q=0.5')).toBe('en');
	});

	it('falls back to custom fallback', () => {
		expect(detectLanguage(null, 'id')).toBe('id');
	});
});

describe('languageDisplayName', () => {
	it('returns English name when display is en', () => {
		expect(languageDisplayName('id', 'en')).toBe('Indonesian');
		expect(languageDisplayName('ja', 'en')).toBe('Japanese');
	});

	it('returns Indonesian name when display is id', () => {
		expect(languageDisplayName('en', 'id')).toBe('Inggris');
		expect(languageDisplayName('ja', 'id')).toBe('Jepang');
	});

	it('returns nativeName for other display languages', () => {
		expect(languageDisplayName('zh-Hans', 'ja')).toBe('简体中文');
	});

	it('returns raw tag for unknown language', () => {
		expect(languageDisplayName('xx' as never, 'en')).toBe('xx');
	});
});
