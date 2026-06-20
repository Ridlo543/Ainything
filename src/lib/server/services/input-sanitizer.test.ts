import { describe, expect, it } from 'vitest';
import { sanitizeText, createSanitizePipe } from './input-sanitizer';

describe('sanitizeText', () => {
	it('trims leading and trailing whitespace', () => {
		expect(sanitizeText('  hello  ')).toBe('hello');
	});

	it('removes ASCII control characters except \\n and \\t', () => {
		expect(sanitizeText('hello\x00\x1Fworld')).toBe('helloworld');
	});

	it('collapses tabs and newlines sanely', () => {
		expect(sanitizeText('hello\n\tworld')).toBe('hello\n world');
	});

	it('collapses multiple spaces into one', () => {
		expect(sanitizeText('hello    world')).toBe('hello world');
	});

	it('collapses >2 consecutive newlines to 2', () => {
		expect(sanitizeText('a\n\n\n\n\nb')).toBe('a\n\nb');
	});

	it('truncates to maxLength', () => {
		expect(sanitizeText('hello world', 5)).toBe('hello');
	});

	it('handles empty string', () => {
		expect(sanitizeText('')).toBe('');
	});

	it('handles string with only control chars', () => {
		expect(sanitizeText('\x00\x1F')).toBe('');
	});

	it('handles mixed content: control chars + spaces + newlines', () => {
		const input = '  hello\x1F   \n\n\n\n   world\x00  ';
		expect(sanitizeText(input)).toBe('hello \n\n world');
	});
});

describe('createSanitizePipe', () => {
	it('returns a Zod transform that sanitizes', () => {
		const pipe = createSanitizePipe(20);
		const result = pipe.parse('  dirty\x00\x1F   text    here  ');
		expect(result).toBe('dirty text here');
	});
});