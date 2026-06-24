import { z } from 'zod';

export const SEGMENTS = [
	'cafe',
	'casual-dining',
	'hotel-restaurant',
	'beach-club',
	'premium'
] as const;

export const LANGUAGE_TAGS = ['id', 'en', 'zh', 'ja', 'ko', 'ar'] as const;

export const TIMEZONES = [
	'Asia/Jakarta',
	'Asia/Makassar',
	'Asia/Jayapura',
	'Asia/Singapore',
	'Asia/Kuala_Lumpur',
	'Asia/Bangkok',
	'Asia/Tokyo',
	'UTC'
] as const;

export const restaurantSettingsSchema = z.object({
	name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
	location: z.string().max(200, 'Location is too long').default(''),
	segment: z.enum(SEGMENTS, { message: 'Invalid segment' }),
	timezone: z.enum(TIMEZONES, { message: 'Invalid timezone' }),
	defaultLanguageTag: z.enum(LANGUAGE_TAGS, { message: 'Invalid language' }),
	description: z.string().max(1000, 'Description is too long').default('')
});

export type RestaurantSettingsInput = z.infer<typeof restaurantSettingsSchema>;
