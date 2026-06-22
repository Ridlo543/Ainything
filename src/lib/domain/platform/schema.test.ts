import { describe, expect, it } from 'vitest';
import { listOrganizationsSchema, listRestaurantsSchema } from '$lib/domain/platform/schema';

describe('platform list input schemas', () => {
	it('defaults limit and offset to bounded list pagination', () => {
		expect(listOrganizationsSchema.parse({})).toEqual({ limit: 50, offset: 0 });
	});

	it('accepts bounded pagination values', () => {
		expect(listOrganizationsSchema.parse({ limit: '100', offset: '250' })).toEqual({
			limit: 100,
			offset: 250
		});
	});

	it('rejects unbounded pagination values', () => {
		expect(() => listOrganizationsSchema.parse({ limit: 101 })).toThrow();
		expect(() => listOrganizationsSchema.parse({ offset: 10_001 })).toThrow();
	});

	it('accepts optional organization uuid for restaurant lists', () => {
		const organizationId = '00000000-0000-4000-8000-000000000001';

		expect(listRestaurantsSchema.parse({ organizationId, limit: '25', offset: '5' })).toEqual({
			organizationId,
			limit: 25,
			offset: 5
		});
	});

	it('rejects non-uuid organization ids', () => {
		expect(() => listRestaurantsSchema.parse({ organizationId: 'not-a-uuid' })).toThrow();
	});
});
