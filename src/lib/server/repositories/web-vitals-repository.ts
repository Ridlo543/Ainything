/**
 * Web Vitals repository — insert-only, no reads needed from application code.
 * Reads are done directly via SQL or a future admin query.
 */

import { query } from '$lib/server/db/postgres';

export type VitalsInsert = {
	outletId: string | null;
	name: 'LCP' | 'FID' | 'INP' | 'CLS' | 'TTFB';
	value: number;
	rating: 'good' | 'needs-improvement' | 'poor';
	path: string;
};

/**
 * Batch-inserts web vitals entries. Silently ignores empty arrays.
 * Uses a single multi-row INSERT for efficiency.
 */
export async function insertWebVitals(entries: VitalsInsert[]): Promise<void> {
	if (entries.length === 0) return;

	// Build parameterised multi-row VALUES list
	const values: (string | number | null)[] = [];
	const rows = entries.map((e, i) => {
		const base = i * 5;
		values.push(e.outletId, e.name, e.value, e.rating, e.path);
		return `($${base + 1}::uuid, $${base + 2}::text, $${base + 3}::numeric, $${base + 4}::text, $${base + 5}::text)`;
	});

	await query(
		`INSERT INTO web_vitals (outlet_id, name, value, rating, path)
		 VALUES ${rows.join(', ')}`,
		values
	);
}
