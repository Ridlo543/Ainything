import type { AuthUser } from '$lib/domain/auth/types';

export type LanguageTag = 'en' | 'id' | 'zh-Hans' | 'ko' | 'ja' | 'ar' | 'hi' | 'fr' | 'de';

export type DietaryFlag =
	| 'halal'
	| 'vegetarian'
	| 'vegan'
	| 'gluten-free'
	| 'contains-alcohol'
	| 'spicy'
	| 'seafood'
	| 'nut-free';

export type Allergen =
	| 'nuts'
	| 'dairy'
	| 'egg'
	| 'shellfish'
	| 'seafood'
	| 'soy'
	| 'gluten'
	| 'sesame';

export type MenuSourceType =
	| 'pdf-scan'
	| 'photo'
	| 'bilingual'
	| 'handwritten'
	| 'seasonal'
	| 'spreadsheet';

export type MenuItem = {
	id: string;
	category: string;
	name: string;
	localName?: string;
	description: string;
	price: number;
	currency: 'IDR';
	image: string;
	spiceLevel: 0 | 1 | 2 | 3 | 4 | 5;
	isAvailable: boolean;
	isSignature: boolean;
	dietaryFlags: DietaryFlag[];
	allergens: Allergen[];
	goodFor: string[];
	confidence: 'verified' | 'needs-review' | 'staff-confirm';
};

export type MenuImportIssue = {
	id: string;
	sourceType: MenuSourceType;
	label: string;
	confidence: number;
	issue: string;
	status: 'needs-review' | 'approved' | 'blocked';
};

export type Organization = {
	id: string;
	name: string;
	slug: string;
	workspaceHost: string;
	plan: 'pilot' | 'starter' | 'pro' | 'enterprise';
	restaurantIds: string[];
};

export type UserRole = 'owner' | 'manager' | 'staff';

export type AppUser = {
	id: string;
	email: string;
	name: string;
	defaultOrganizationId: string;
};

export type Membership = {
	id: string;
	userId: string;
	organizationId: string;
	restaurantIds: string[];
	role: UserRole;
};

export type Restaurant = {
	id: string;
	organizationId: string;
	name: string;
	slug: string;
	publicHost: string;
	location: string;
	segment: 'cafe' | 'casual-dining' | 'hotel-restaurant' | 'beach-club' | 'premium';
	languages: LanguageTag[];
	heroImage: string;
	menuScan: string;
	tableCount: number;
	menuSourceType: MenuSourceType;
	description: string;
	knowledgeHighlights: string[];
	categories: string[];
	menuItems: MenuItem[];
	importIssues: MenuImportIssue[];
	analytics: {
		scansToday: number;
		helpfulRate: number;
		fallbackRate: number;
		topQuestion: string;
		topItem: string;
	};
};

import type { RestaurantTable } from '$lib/domain/table/types';
export type { RestaurantTable };

export type PublicMenuBootstrap = {
	restaurant: Restaurant;
	table: RestaurantTable;
};

export type TenantContext = {
	user: AuthUser;
	membership: Membership;
	organization: Organization;
	restaurants: Restaurant[];
	activeRestaurant: Restaurant;
};
