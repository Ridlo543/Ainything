import type { PageServerLoad } from './$types';
import { listTablesForOutlet } from '$lib/server/repositories/outlet-repository';
import QRCode from 'qrcode';

export const load: PageServerLoad = async ({ parent }) => {
	const { tenant } = await parent();
	const outlet = tenant.activeOutlet;
	const org = tenant.organization;

	const tables = await listTablesForOutlet(outlet.id, org.id).catch(() => []);

	// Generate QR SVG server-side for each table.
	// URL: https://<publicHost>/r/<slug>/table/<code>
	// Falls back to relative path when publicHost is not configured.
	const baseUrl = outlet.publicHost ? `https://${outlet.publicHost}` : `http://localhost:5173`;

	const tablesWithQr = await Promise.all(
		tables.map(async (table) => {
			const url = `${baseUrl}/r/${outlet.slug}/table/${table.code}`;
			const qrSvg = await QRCode.toString(url, {
				type: 'svg',
				margin: 1,
				width: 200,
				color: { dark: '#000000', light: '#ffffff' }
			}).catch(() => null);

			return { ...table, qrUrl: url, qrSvg };
		})
	);

	return {
		outlet: {
			id: outlet.id,
			name: outlet.name,
			slug: outlet.slug,
			publicHost: outlet.publicHost ?? null
		},
		tables: tablesWithQr
	};
};
