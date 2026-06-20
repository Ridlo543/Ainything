import { describe, expect, it } from 'vitest';
import { isRtl, dir, getLanguageInfo } from './languages';

describe('isRtl', () => {
	it('returns true for Arabic (RTL_CODES fallback)', () => {
		expect(isRtl('ar')).toBe(true);
	});

	it('returns false for English', () => {
		expect(isRtl('en')).toBe(false);
	});

	it('returns false for Japanese', () => {
		expect(isRtl('ja')).toBe(false);
	});
});

describe('dir', () => {
	it('returns rtl for Arabic (RTL_CODES fallback)', () => {
		expect(dir('ar')).toBe('rtl');
	});

	it('returns ltr for Japanese', () => {
		expect(dir('ja')).toBe('ltr');
	});
});

describe('getLanguageInfo', () => {
	it('returns info for known language', () => {
		const info = getLanguageInfo('ja');
		expect(info?.nativeName).toBe('日本語');
		expect(info?.direction).toBe('ltr');
	});

	it('returns undefined for unknown language', () => {
		expect(getLanguageInfo('ko')).toBeUndefined();
	});
});
