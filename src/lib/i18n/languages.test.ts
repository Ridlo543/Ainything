import { describe, expect, it } from 'vitest';
import { isRtl, dir, getLanguageInfo } from './languages';

describe('isRtl', () => {
	it('returns true for Arabic', () => {
		expect(isRtl('ar')).toBe(true);
	});

	it('returns false for English', () => {
		expect(isRtl('en')).toBe(false);
	});

	it('returns false for Indonesian', () => {
		expect(isRtl('id')).toBe(false);
	});
});

describe('dir', () => {
	it('returns rtl for Arabic', () => {
		expect(dir('ar')).toBe('rtl');
	});

	it('returns ltr for English', () => {
		expect(dir('en')).toBe('ltr');
	});
});

describe('getLanguageInfo', () => {
	it('returns info for known language', () => {
		const info = getLanguageInfo('ar');
		expect(info?.nativeName).toBe('العربية');
		expect(info?.direction).toBe('rtl');
	});

	it('returns undefined for unknown language', () => {
		expect(getLanguageInfo('xx')).toBeUndefined();
	});
});
