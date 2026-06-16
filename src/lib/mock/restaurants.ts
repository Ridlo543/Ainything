import type { Organization, Restaurant, StaffRequest } from '$lib/domain/menu/types';

const sharedDescriptions = [
	'Uploaded as a photographed board with mixed Indonesian and English labels.',
	'Imported from a PDF scan with uneven spacing and seasonal price notes.',
	'Bilingual printed menu with handwritten sold-out marks.',
	'Phone photo of laminated menu pages with glare and cropped edges.',
	'Seasonal tasting menu with local dish names and staff annotations.'
];

export const organizations: Organization[] = [
	{
		id: 'org-bali-table-group',
		name: 'Bali Table Group',
		slug: 'bali-table-group',
		workspaceHost: 'bali-table.linguaserve.app',
		plan: 'pro',
		restaurantIds: [
			'rest-uma-karang',
			'rest-sawah-lane',
			'rest-nusa-noodle',
			'rest-lotus-hotel',
			'rest-mangrove-grill',
			'rest-layang-vegan',
			'rest-senja-ramen'
		]
	},
	{
		id: 'org-jakarta-hospitality',
		name: 'Jakarta Hospitality Lab',
		slug: 'jakarta-hospitality-lab',
		workspaceHost: 'jakarta-hospitality.linguaserve.app',
		plan: 'pilot',
		restaurantIds: ['rest-rempah-terrace', 'rest-taman-sate', 'rest-kopi-pasar']
	}
];

function item(
	id: string,
	category: string,
	name: string,
	localName: string,
	description: string,
	price: number,
	image: string,
	spiceLevel: 0 | 1 | 2 | 3 | 4 | 5,
	dietaryFlags: Restaurant['menuItems'][number]['dietaryFlags'],
	allergens: Restaurant['menuItems'][number]['allergens'],
	goodFor: string[],
	isSignature = false,
	confidence: Restaurant['menuItems'][number]['confidence'] = 'verified'
) {
	return {
		id,
		category,
		name,
		localName,
		description,
		price,
		currency: 'IDR' as const,
		image,
		spiceLevel,
		isAvailable: !id.endsWith('soldout'),
		isSignature,
		dietaryFlags,
		allergens,
		goodFor,
		confidence
	};
}

export const restaurants: Restaurant[] = [
	{
		id: 'rest-uma-karang',
		organizationId: 'org-bali-table-group',
		name: 'Uma Karang',
		slug: 'uma-karang',
		publicHost: 'uma-karang.linguaserve.app',
		location: 'Canggu, Bali',
		segment: 'casual-dining',
		languages: ['en', 'id', 'zh-Hans', 'ko', 'ja', 'ar'],
		heroImage: '/assets/covers/uma-karang.svg',
		menuScan: '/assets/menu-scans/uma-karang-menu.svg',
		tableCount: 24,
		menuSourceType: 'photo',
		description: 'Balinese comfort dishes with grilled seafood, sambal options, and rice plates.',
		knowledgeHighlights: [
			'Halal-friendly kitchen zone',
			'Sambal served separately on request',
			'No pork menu'
		],
		categories: ['Signatures', 'Rice Plates', 'Drinks'],
		menuItems: [
			item(
				'uk-ayam-betutu',
				'Signatures',
				'Slow Roasted Betutu Chicken',
				'Ayam Betutu',
				'Turmeric, lemongrass, galangal, and banana leaf roasted chicken with steamed rice.',
				98000,
				'/assets/covers/uma-karang.svg',
				4,
				['halal', 'spicy'],
				[],
				['Local classic', 'Big appetite', 'Spice lovers'],
				true
			),
			item(
				'uk-jimbaran-fish',
				'Signatures',
				'Jimbaran Grilled Fish',
				'Ikan Bakar Jimbaran',
				'Charcoal grilled fish with sweet soy glaze, lime, sambal matah, and warm rice.',
				145000,
				'/assets/covers/uma-karang.svg',
				2,
				['halal', 'seafood'],
				['seafood'],
				['Shared meal', 'Fresh seafood']
			),
			item(
				'uk-es-kelapa',
				'Drinks',
				'Young Coconut with Lime',
				'Es Kelapa Jeruk Nipis',
				'Chilled young coconut water with lime and coconut flesh.',
				42000,
				'/assets/covers/uma-karang.svg',
				0,
				['halal', 'vegan', 'gluten-free'],
				[],
				['Refreshing', 'Low spice']
			)
		],
		importIssues: [
			{
				id: 'issue-uk-1',
				sourceType: 'photo',
				label: 'Sambal matah note',
				confidence: 0.72,
				issue: 'OCR reads "sambal mentah"; needs staff confirmation.',
				status: 'needs-review'
			}
		],
		analytics: {
			scansToday: 186,
			helpfulRate: 88,
			fallbackRate: 14,
			topQuestion: 'Is betutu chicken very spicy?',
			topItem: 'Slow Roasted Betutu Chicken'
		}
	},
	{
		id: 'rest-sawah-lane',
		organizationId: 'org-bali-table-group',
		name: 'Sawah Lane Cafe',
		slug: 'sawah-lane-cafe',
		publicHost: 'sawah-lane-cafe.linguaserve.app',
		location: 'Ubud, Bali',
		segment: 'cafe',
		languages: ['en', 'id', 'fr', 'de', 'ja'],
		heroImage: '/assets/covers/sawah-lane-cafe.svg',
		menuScan: '/assets/menu-scans/sawah-lane-menu.svg',
		tableCount: 18,
		menuSourceType: 'bilingual',
		description:
			'Rice-field cafe with breakfast bowls, coffee, and vegetarian-friendly Indonesian plates.',
		knowledgeHighlights: [
			'Vegan milk available',
			'Peanut sauce can be separated',
			'Kitchen uses shared toaster'
		],
		categories: ['Breakfast', 'Vegetarian', 'Coffee'],
		menuItems: [
			item(
				'sl-gado',
				'Vegetarian',
				'Garden Gado-Gado Bowl',
				'Gado-Gado Kebun',
				'Steamed vegetables, tofu, egg, lontong rice cake, and peanut sauce on the side.',
				68000,
				'/assets/covers/sawah-lane-cafe.svg',
				1,
				['vegetarian'],
				['nuts', 'egg', 'soy'],
				['Vegetarian lunch', 'Mild flavor'],
				true,
				'staff-confirm'
			),
			item(
				'sl-jamu',
				'Coffee',
				'Turmeric Tamarind Jamu',
				'Kunyit Asam',
				'Cold herbal drink made with turmeric, tamarind, palm sugar, and lime.',
				39000,
				'/assets/covers/sawah-lane-cafe.svg',
				0,
				['vegan', 'halal', 'gluten-free'],
				[],
				['Refreshing', 'Non-coffee']
			),
			item(
				'sl-pandan-toast',
				'Breakfast',
				'Pandan Kaya Toast',
				'Roti Kaya Pandan',
				'Toasted bread with pandan coconut jam and butter.',
				52000,
				'/assets/covers/sawah-lane-cafe.svg',
				0,
				['vegetarian'],
				['dairy', 'egg', 'gluten'],
				['Sweet breakfast', 'Coffee pairing']
			)
		],
		importIssues: [
			{
				id: 'issue-sl-1',
				sourceType: 'bilingual',
				label: 'Nut-free translation',
				confidence: 0.64,
				issue: 'Peanut sauce appears in side note only; allergen flag needs review.',
				status: 'needs-review'
			}
		],
		analytics: {
			scansToday: 112,
			helpfulRate: 91,
			fallbackRate: 18,
			topQuestion: 'Can gado-gado be made vegan?',
			topItem: 'Garden Gado-Gado Bowl'
		}
	},
	{
		id: 'rest-nusa-noodle',
		organizationId: 'org-bali-table-group',
		name: 'Nusa Noodle House',
		slug: 'nusa-noodle-house',
		publicHost: 'nusa-noodle-house.linguaserve.app',
		location: 'Kuta, Bali',
		segment: 'casual-dining',
		languages: ['en', 'id', 'zh-Hans', 'ko', 'hi'],
		heroImage: '/assets/covers/nusa-noodle-house.svg',
		menuScan: '/assets/menu-scans/nusa-noodle-house-menu.svg',
		tableCount: 30,
		menuSourceType: 'pdf-scan',
		description:
			'Fast casual noodle shop with Indonesian, Chinese-Indonesian, and seafood noodle bowls.',
		knowledgeHighlights: [
			'Chicken broth base unless stated',
			'Seafood wok station is shared',
			'Chili level adjustable'
		],
		categories: ['Noodles', 'Wok', 'Tea'],
		menuItems: [
			item(
				'nn-mie-ayam',
				'Noodles',
				'Chicken Mushroom Noodles',
				'Mie Ayam Jamur',
				'Egg noodles with chicken, mushroom, scallion, and light soy broth.',
				58000,
				'/assets/covers/nusa-noodle-house.svg',
				1,
				['halal'],
				['egg', 'gluten', 'soy'],
				['Quick meal', 'Mild flavor'],
				true
			),
			item(
				'nn-laksa',
				'Noodles',
				'Coconut Seafood Laksa',
				'Laksa Seafood',
				'Coconut curry noodle soup with shrimp, fish cake, herbs, and sambal.',
				88000,
				'/assets/covers/nusa-noodle-house.svg',
				3,
				['seafood', 'spicy'],
				['shellfish', 'seafood', 'gluten'],
				['Rich broth', 'Seafood']
			),
			item(
				'nn-lychee-tea',
				'Tea',
				'Iced Lychee Tea',
				'Es Teh Leci',
				'Black tea with lychee fruit and light syrup.',
				35000,
				'/assets/covers/nusa-noodle-house.svg',
				0,
				['halal', 'vegan'],
				[],
				['Sweet drink', 'Low spice']
			)
		],
		importIssues: [
			{
				id: 'issue-nn-1',
				sourceType: 'pdf-scan',
				label: 'Fish cake ingredient',
				confidence: 0.58,
				issue: 'PDF scan cuts off seafood laksa ingredient line.',
				status: 'needs-review'
			}
		],
		analytics: {
			scansToday: 244,
			helpfulRate: 84,
			fallbackRate: 22,
			topQuestion: 'Does laksa contain shrimp?',
			topItem: 'Chicken Mushroom Noodles'
		}
	},
	{
		id: 'rest-rempah-terrace',
		organizationId: 'org-jakarta-hospitality',
		name: 'Rempah Terrace',
		slug: 'rempah-terrace',
		publicHost: 'rempah-terrace.linguaserve.app',
		location: 'Kemang, Jakarta',
		segment: 'premium',
		languages: ['en', 'id', 'ar', 'fr', 'de'],
		heroImage: '/assets/covers/rempah-terrace.svg',
		menuScan: '/assets/menu-scans/rempah-terrace-menu.svg',
		tableCount: 42,
		menuSourceType: 'seasonal',
		description:
			'Modern Indonesian tasting plates with spice-led sauces and staff-paired mocktails.',
		knowledgeHighlights: ['No pork', 'Mocktail pairings available', 'Seasonal menu changes weekly'],
		categories: ['Tasting Plates', 'Grill', 'Mocktails'],
		menuItems: [
			item(
				'rt-rendang',
				'Tasting Plates',
				'Short Rib Rendang',
				'Rendang Iga Sapi',
				'Slow-cooked beef short rib with coconut spice paste and cassava leaf.',
				175000,
				'/assets/covers/rempah-terrace.svg',
				3,
				['halal', 'spicy'],
				[],
				['Signature', 'Rich flavor'],
				true
			),
			item(
				'rt-sate-lilit',
				'Grill',
				'Lemongrass Fish Satay',
				'Sate Lilit Ikan',
				'Minced fish satay wrapped around lemongrass with sambal matah.',
				125000,
				'/assets/covers/rempah-terrace.svg',
				2,
				['halal', 'seafood'],
				['seafood'],
				['Light grill', 'Local flavor']
			),
			item(
				'rt-rosella',
				'Mocktails',
				'Rosella Ginger Spritz',
				'Spritz Rosella Jahe',
				'Rosella tea, ginger, lime, soda, and palm sugar.',
				65000,
				'/assets/covers/rempah-terrace.svg',
				0,
				['halal', 'vegan'],
				[],
				['Non-alcoholic pairing']
			)
		],
		importIssues: [
			{
				id: 'issue-rt-1',
				sourceType: 'seasonal',
				label: 'Weekly seasonal price',
				confidence: 0.69,
				issue: 'Seasonal tasting menu price handwritten; needs owner approval.',
				status: 'needs-review'
			}
		],
		analytics: {
			scansToday: 89,
			helpfulRate: 93,
			fallbackRate: 9,
			topQuestion: 'Is rendang halal certified?',
			topItem: 'Short Rib Rendang'
		}
	},
	{
		id: 'rest-taman-sate',
		organizationId: 'org-jakarta-hospitality',
		name: 'Taman Sate',
		slug: 'taman-sate',
		publicHost: 'taman-sate.linguaserve.app',
		location: 'Menteng, Jakarta',
		segment: 'casual-dining',
		languages: ['en', 'id', 'ar', 'hi', 'zh-Hans'],
		heroImage: '/assets/covers/taman-sate.svg',
		menuScan: '/assets/menu-scans/taman-sate-menu.svg',
		tableCount: 36,
		menuSourceType: 'handwritten',
		description: 'Satay garden restaurant with charcoal grill, peanut sauces, and rice cake sides.',
		knowledgeHighlights: [
			'Peanut-heavy kitchen',
			'Halal meat supplier',
			'Sauces can be served separately'
		],
		categories: ['Satay', 'Rice', 'Drinks'],
		menuItems: [
			item(
				'ts-sate-ayam',
				'Satay',
				'Chicken Satay Set',
				'Sate Ayam',
				'Ten skewers of chicken satay with peanut sauce, lontong, and pickled cucumber.',
				76000,
				'/assets/covers/taman-sate.svg',
				1,
				['halal'],
				['nuts', 'soy'],
				['Classic order', 'Shared starter'],
				true,
				'staff-confirm'
			),
			item(
				'ts-sate-kambing',
				'Satay',
				'Lamb Satay with Sweet Soy',
				'Sate Kambing',
				'Charcoal lamb skewers with sweet soy, tomato, shallot, and lime.',
				98000,
				'/assets/covers/taman-sate.svg',
				2,
				['halal'],
				['soy'],
				['Grilled meat', 'No peanut sauce option']
			),
			item(
				'ts-cendol',
				'Drinks',
				'Coconut Cendol',
				'Es Cendol',
				'Coconut milk dessert drink with palm sugar and green rice flour jelly.',
				42000,
				'/assets/covers/taman-sate.svg',
				0,
				['vegetarian'],
				['dairy'],
				['Dessert drink']
			)
		],
		importIssues: [
			{
				id: 'issue-ts-1',
				sourceType: 'handwritten',
				label: 'Peanut sauce note',
				confidence: 0.51,
				issue: 'Handwritten note looks like "no peanut option"; needs review.',
				status: 'blocked'
			}
		],
		analytics: {
			scansToday: 158,
			helpfulRate: 79,
			fallbackRate: 28,
			topQuestion: 'Can satay be served without peanut?',
			topItem: 'Chicken Satay Set'
		}
	},
	{
		id: 'rest-lotus-hotel',
		organizationId: 'org-bali-table-group',
		name: 'Lotus Hotel Kitchen',
		slug: 'lotus-hotel-kitchen',
		publicHost: 'lotus-hotel-kitchen.linguaserve.app',
		location: 'Nusa Dua, Bali',
		segment: 'hotel-restaurant',
		languages: ['en', 'id', 'zh-Hans', 'ko', 'ja', 'ar', 'hi'],
		heroImage: '/assets/covers/lotus-hotel-kitchen.svg',
		menuScan: '/assets/menu-scans/lotus-hotel-kitchen-menu.svg',
		tableCount: 60,
		menuSourceType: 'spreadsheet',
		description:
			'Hotel all-day dining with Indonesian, Western, halal, vegetarian, and kids options.',
		knowledgeHighlights: [
			'Halal section marked',
			'Kids menu available',
			'Breakfast buffet items rotate daily'
		],
		categories: ['All-Day', 'Kids', 'Dessert'],
		menuItems: [
			item(
				'lh-nasi-goreng',
				'All-Day',
				'Hotel Nasi Goreng',
				'Nasi Goreng Hotel',
				'Fried rice with chicken satay, fried egg, crackers, pickles, and mild sambal.',
				125000,
				'/assets/covers/lotus-hotel-kitchen.svg',
				2,
				['halal'],
				['egg', 'soy'],
				['Hotel classic', 'Filling meal'],
				true
			),
			item(
				'lh-kids-pasta',
				'Kids',
				'Kids Butter Pasta',
				'Pasta Mentega Anak',
				'Small pasta portion with butter, parmesan, and steamed vegetables.',
				85000,
				'/assets/covers/lotus-hotel-kitchen.svg',
				0,
				['vegetarian'],
				['dairy', 'gluten'],
				['Children', 'No spice']
			),
			item(
				'lh-dadar',
				'Dessert',
				'Pandan Coconut Crepe',
				'Dadar Gulung',
				'Pandan crepe filled with grated coconut and palm sugar.',
				58000,
				'/assets/covers/lotus-hotel-kitchen.svg',
				0,
				['vegetarian'],
				['egg', 'gluten'],
				['Local dessert']
			)
		],
		importIssues: [
			{
				id: 'issue-lh-1',
				sourceType: 'spreadsheet',
				label: 'Breakfast rotation',
				confidence: 0.81,
				issue: 'Spreadsheet includes rotating buffet items; publish only confirmed daily items.',
				status: 'approved'
			}
		],
		analytics: {
			scansToday: 302,
			helpfulRate: 90,
			fallbackRate: 12,
			topQuestion: 'Which items are halal?',
			topItem: 'Hotel Nasi Goreng'
		}
	},
	{
		id: 'rest-mangrove-grill',
		organizationId: 'org-bali-table-group',
		name: 'Mangrove Grill',
		slug: 'mangrove-grill',
		publicHost: 'mangrove-grill.linguaserve.app',
		location: 'Sanur, Bali',
		segment: 'beach-club',
		languages: ['en', 'id', 'ja', 'ko', 'de'],
		heroImage: '/assets/covers/mangrove-grill.svg',
		menuScan: '/assets/menu-scans/mangrove-grill-menu.svg',
		tableCount: 44,
		menuSourceType: 'photo',
		description: 'Beachside grill with seafood platters, tropical drinks, and sunset small plates.',
		knowledgeHighlights: [
			'Seafood-heavy kitchen',
			'Alcohol served at bar',
			'Sunset menu starts 5 PM'
		],
		categories: ['Seafood', 'Small Plates', 'Drinks'],
		menuItems: [
			item(
				'mg-seafood-platter',
				'Seafood',
				'Sunset Seafood Platter',
				'Paket Seafood Senja',
				'Grilled prawns, squid, fish, clams, corn, rice, and three sambals.',
				295000,
				'/assets/covers/mangrove-grill.svg',
				2,
				['seafood'],
				['shellfish', 'seafood'],
				['Sharing', 'Seafood'],
				true
			),
			item(
				'mg-corn',
				'Small Plates',
				'Coconut Chili Corn',
				'Jagung Bakar Kelapa',
				'Grilled corn with coconut chili butter and lime.',
				54000,
				'/assets/covers/mangrove-grill.svg',
				2,
				['vegetarian', 'spicy'],
				['dairy'],
				['Snack', 'Sunset plate']
			),
			item(
				'mg-mocktail',
				'Drinks',
				'Mango Lime Cooler',
				'Mangga Jeruk Nipis',
				'Mango, lime, mint, soda, and sea salt rim. Non-alcoholic.',
				62000,
				'/assets/covers/mangrove-grill.svg',
				0,
				['halal', 'vegan'],
				[],
				['Non-alcoholic', 'Tropical']
			)
		],
		importIssues: [
			{
				id: 'issue-mg-1',
				sourceType: 'photo',
				label: 'Bar menu alcohol warning',
				confidence: 0.76,
				issue: 'Drink page mixes mocktails and cocktails; flag alcohol clearly.',
				status: 'needs-review'
			}
		],
		analytics: {
			scansToday: 221,
			helpfulRate: 86,
			fallbackRate: 19,
			topQuestion: 'Is mango cooler non-alcoholic?',
			topItem: 'Sunset Seafood Platter'
		}
	},
	{
		id: 'rest-kopi-pasar',
		organizationId: 'org-jakarta-hospitality',
		name: 'Kopi Pasar Baru',
		slug: 'kopi-pasar-baru',
		publicHost: 'kopi-pasar-baru.linguaserve.app',
		location: 'Central Jakarta',
		segment: 'cafe',
		languages: ['en', 'id', 'zh-Hans', 'ja'],
		heroImage: '/assets/covers/kopi-pasar-baru.svg',
		menuScan: '/assets/menu-scans/kopi-pasar-baru-menu.svg',
		tableCount: 16,
		menuSourceType: 'handwritten',
		description:
			'Small heritage coffee shop with Indonesian snacks, manual brew, and rotating pastries.',
		knowledgeHighlights: [
			'Some pastries contain lard from supplier',
			'Oat milk available',
			'No full kitchen'
		],
		categories: ['Coffee', 'Snacks', 'Pastry'],
		menuItems: [
			item(
				'kp-kopi-susu',
				'Coffee',
				'Palm Sugar Milk Coffee',
				'Kopi Susu Gula Aren',
				'Espresso, fresh milk, palm sugar syrup, and ice.',
				36000,
				'/assets/covers/kopi-pasar-baru.svg',
				0,
				['vegetarian'],
				['dairy'],
				['Sweet coffee', 'Local cafe classic'],
				true
			),
			item(
				'kp-risoles',
				'Snacks',
				'Chicken Ragout Risoles',
				'Risoles Ragout Ayam',
				'Fried pastry roll with creamy chicken ragout and vegetables.',
				28000,
				'/assets/covers/kopi-pasar-baru.svg',
				0,
				[],
				['dairy', 'egg', 'gluten'],
				['Snack', 'Coffee pairing']
			),
			item(
				'kp-croissant',
				'Pastry',
				'Chocolate Croissant',
				'Croissant Cokelat',
				'Butter croissant with dark chocolate filling from external bakery.',
				42000,
				'/assets/covers/kopi-pasar-baru.svg',
				0,
				['vegetarian'],
				['dairy', 'gluten'],
				['Pastry', 'Sweet']
			)
		],
		importIssues: [
			{
				id: 'issue-kp-1',
				sourceType: 'handwritten',
				label: 'Supplier ingredient note',
				confidence: 0.47,
				issue: 'Pastry supplier note is handwritten and incomplete.',
				status: 'blocked'
			}
		],
		analytics: {
			scansToday: 73,
			helpfulRate: 82,
			fallbackRate: 26,
			topQuestion: 'Which snacks are vegetarian?',
			topItem: 'Palm Sugar Milk Coffee'
		}
	},
	{
		id: 'rest-layang-vegan',
		organizationId: 'org-bali-table-group',
		name: 'Layang Vegan Warung',
		slug: 'layang-vegan-warung',
		publicHost: 'layang-vegan-warung.linguaserve.app',
		location: 'Umalas, Bali',
		segment: 'cafe',
		languages: ['en', 'id', 'fr', 'de', 'ko'],
		heroImage: '/assets/covers/layang-vegan-warung.svg',
		menuScan: '/assets/menu-scans/layang-vegan-warung-menu.svg',
		tableCount: 20,
		menuSourceType: 'bilingual',
		description:
			'Plant-based Indonesian warung with tempeh, jackfruit, herbs, and coconut-based desserts.',
		knowledgeHighlights: [
			'Fully vegan kitchen',
			'Cashew used in sauces',
			'No refined sugar desserts'
		],
		categories: ['Bowls', 'Small Plates', 'Dessert'],
		menuItems: [
			item(
				'lv-jackfruit',
				'Bowls',
				'Young Jackfruit Rendang Bowl',
				'Rendang Nangka Muda',
				'Young jackfruit cooked in coconut rendang spices with red rice and greens.',
				92000,
				'/assets/covers/layang-vegan-warung.svg',
				3,
				['vegan', 'spicy'],
				[],
				['Plant-based', 'Rich flavor'],
				true
			),
			item(
				'lv-tempeh',
				'Small Plates',
				'Sweet Soy Tempeh Bites',
				'Tempe Kecap',
				'Crisp tempeh glazed with sweet soy, ginger, and sesame.',
				54000,
				'/assets/covers/layang-vegan-warung.svg',
				1,
				['vegan'],
				['soy', 'sesame', 'gluten'],
				['Snack', 'Protein']
			),
			item(
				'lv-cashew-pudding',
				'Dessert',
				'Coconut Cashew Pudding',
				'Puding Kelapa Mede',
				'Coconut pudding with cashew cream, mango, and toasted coconut.',
				58000,
				'/assets/covers/layang-vegan-warung.svg',
				0,
				['vegan', 'gluten-free'],
				['nuts'],
				['Dessert', 'Dairy-free']
			)
		],
		importIssues: [
			{
				id: 'issue-lv-1',
				sourceType: 'bilingual',
				label: 'Cashew sauce flag',
				confidence: 0.91,
				issue: 'Allergen extraction is high confidence; owner review still required.',
				status: 'approved'
			}
		],
		analytics: {
			scansToday: 96,
			helpfulRate: 95,
			fallbackRate: 8,
			topQuestion: 'Is the whole kitchen vegan?',
			topItem: 'Young Jackfruit Rendang Bowl'
		}
	},
	{
		id: 'rest-senja-ramen',
		organizationId: 'org-bali-table-group',
		name: 'Senja Ramen Bali',
		slug: 'senja-ramen-bali',
		publicHost: 'senja-ramen-bali.linguaserve.app',
		location: 'Seminyak, Bali',
		segment: 'casual-dining',
		languages: ['en', 'id', 'ja', 'ko', 'zh-Hans'],
		heroImage: '/assets/covers/senja-ramen-bali.svg',
		menuScan: '/assets/menu-scans/senja-ramen-bali-menu.svg',
		tableCount: 28,
		menuSourceType: 'pdf-scan',
		description: 'Ramen shop with chicken broth, spicy miso, and Indonesian-inspired toppings.',
		knowledgeHighlights: ['Chicken broth base', 'No pork chashu', 'Miso contains soy'],
		categories: ['Ramen', 'Sides', 'Tea'],
		menuItems: [
			item(
				'sr-miso',
				'Ramen',
				'Spicy Chicken Miso Ramen',
				'Ramen Miso Ayam Pedas',
				'Chicken broth, miso tare, noodles, egg, corn, mushroom, and chili oil.',
				98000,
				'/assets/covers/senja-ramen-bali.svg',
				4,
				['halal', 'spicy'],
				['egg', 'soy', 'gluten'],
				['Ramen classic', 'Spicy broth'],
				true
			),
			item(
				'sr-gyoza',
				'Sides',
				'Chicken Gyoza',
				'Gyoza Ayam',
				'Pan-fried chicken dumplings with soy vinegar dipping sauce.',
				52000,
				'/assets/covers/senja-ramen-bali.svg',
				0,
				['halal'],
				['soy', 'gluten'],
				['Side dish', 'Shared starter']
			),
			item(
				'sr-hojicha',
				'Tea',
				'Iced Hojicha',
				'Hojicha Dingin',
				'Roasted Japanese green tea served cold.',
				36000,
				'/assets/covers/senja-ramen-bali.svg',
				0,
				['vegan', 'halal'],
				[],
				['Low sugar', 'Tea pairing']
			)
		],
		importIssues: [
			{
				id: 'issue-sr-1',
				sourceType: 'pdf-scan',
				label: 'Miso allergen',
				confidence: 0.73,
				issue: 'Miso ingredient line extracted, but soy allergen should be manually verified.',
				status: 'needs-review'
			}
		],
		analytics: {
			scansToday: 137,
			helpfulRate: 87,
			fallbackRate: 15,
			topQuestion: 'Does the ramen use pork broth?',
			topItem: 'Spicy Chicken Miso Ramen'
		}
	}
];

export const staffRequests: StaffRequest[] = [
	{
		id: 'fr-1007',
		restaurantSlug: 'uma-karang',
		tableCode: 'T07',
		language: 'ko',
		status: 'new',
		priority: 'high',
		guestNeed: 'Allergy confirmation',
		summary:
			'Guest asks whether Jimbaran grilled fish touches shellfish on the grill. AI suggested staff confirmation.',
		lastMessageAt: '2 min ago'
	},
	{
		id: 'fr-1008',
		restaurantSlug: 'taman-sate',
		tableCode: 'B12',
		language: 'ar',
		status: 'in-progress',
		priority: 'high',
		guestNeed: 'Peanut-free option',
		summary:
			'Guest wants chicken satay without peanut sauce and asks if cross-contact is possible.',
		lastMessageAt: '6 min ago'
	},
	{
		id: 'fr-1009',
		restaurantSlug: 'lotus-hotel-kitchen',
		tableCode: 'L03',
		language: 'zh-Hans',
		status: 'resolved',
		priority: 'normal',
		guestNeed: 'Halal item list',
		summary: 'Guest requested halal-friendly dinner options for two adults and one child.',
		lastMessageAt: '18 min ago'
	}
];

export const menuImportDescriptions = sharedDescriptions;

export function getOrganization(id: string) {
	return organizations.find((organization) => organization.id === id) ?? organizations[0];
}

export function getOrganizationRestaurants(organizationId: string) {
	return restaurants.filter((restaurant) => restaurant.organizationId === organizationId);
}

export function getRestaurant(slug: string) {
	return restaurants.find((restaurant) => restaurant.slug === slug) ?? restaurants[0];
}

export function getAllImportIssues() {
	return restaurants.flatMap((restaurant) =>
		restaurant.importIssues.map((issue) => ({
			...issue,
			restaurantName: restaurant.name,
			restaurantSlug: restaurant.slug,
			sourceDescription: restaurant.description
		}))
	);
}
