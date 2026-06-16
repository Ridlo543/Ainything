import type { TranslationDict } from '../types';

export const en: TranslationDict = {
	'language.selector.label': 'Language',

	'preference.halal': 'Halal',
	'preference.vegetarian': 'Vegetarian',
	'preference.vegan': 'Vegan',
	'preference.glutenFree': 'Gluten-free',
	'preference.nutFree': 'Nut-free',
	'preference.noAlcohol': 'No alcohol',
	'preference.ariaLabel': 'Food preferences',

	'menu.browse.heading': 'Browse menu',
	'menu.browse.subtitle': 'Menu details are based on restaurant-approved data.',
	'menu.categories.empty': 'No menu categories available yet.',
	'menu.items.empty': 'No items in this category right now.',
	'menu.detail.recommendation': 'Recommendation reason',
	'menu.detail.goodFor': 'Good for {tags}.',
	'menu.detail.spice': 'Spice level: {level}.',
	'menu.detail.verified': 'Verified menu data available for this item.',
	'menu.detail.staffConfirm':
		'Staff confirmation recommended for your preferences or dietary requirements.',
	'menu.detail.selectPrompt': 'Select a menu item to see details.',

	'badge.signature': 'Signature',
	'badge.check': 'Check',
	'badge.halal': 'Halal-friendly',
	'badge.vegetarian': 'Vegetarian',
	'badge.vegan': 'Vegan',
	'badge.alcohol': 'Contains alcohol',
	'badge.allergen': 'Allergen: {allergen}',
	'badge.staff': 'Staff confirmation',

	'spice.none': 'No chili',
	'spice.mild': 'Mild',
	'spice.spicy': 'Spicy',
	'spice.verySpicy': 'Very spicy',

	'chat.heading': 'Ask about the menu',
	'chat.subtitle': 'Answers use restaurant data and ask staff when unsure.',
	'chat.conversation.aria': 'Chat conversation',
	'chat.safety.staff': 'Staff confirmation recommended for this question.',
	'chat.safety.lowConfidence': 'Answer may be partial — ask staff to confirm.',
	'chat.loading': 'Checking menu data\u2026',
	'chat.empty.prompt':
		'Ask anything about the menu \u2014 ingredients, allergens, spice level, or halal status.',
	'chat.suggestion.halal': 'Is this halal?',
	'chat.suggestion.nutFree': 'Any nut-free dishes?',
	'chat.suggestion.spice': 'What is the spice level?',
	'chat.input.placeholder': 'Ask: Is this spicy? Does it contain nuts?',
	'chat.input.ariaLabel': 'Your question about the menu',
	'chat.send.ariaLabel': 'Send question',
	'chat.send.label': 'Ask',
	'chat.fallback.cta': 'Ask staff directly',
	'chat.fallback.default': 'Speak to staff',
	'chat.error.network': 'Could not reach the assistant. Please try again or ask staff.',
	'chat.error.session': 'Session not started. Reload the page to begin.',

	'feedback.heading': 'Quick feedback',
	'feedback.subtitle': 'Tell the restaurant if this helped.',
	'feedback.helpful': 'Helpful',
	'feedback.unclear': 'Unclear',
	'feedback.thankYou': 'Thank you for your feedback.',

	'bootstrap.heading': 'Language and food preferences',
	'bootstrap.subtitle': 'No login required. Preferences stay in this session.',

	'app.title': 'LinguaServe',
	'app.titlePage': '{name} - LinguaServe',
	'app.backLink': 'LinguaServe',
	'app.tableBadge': 'Table {code}',

	'page.landing.tagline': 'Multi-restaurant SaaS',
	'page.landing.heading': 'One platform for many restaurant QR experiences.',
	'page.landing.description':
		'Each restaurant gets its own public QR route, tables, menu data, staff inbox, and dashboard scope. Operators can manage several restaurants from one workspace.',
	'page.landing.orgTitle': 'Organization',
	'page.landing.orgDesc': 'Billing, members, roles, and restaurant access belong to one tenant.',
	'page.landing.restTitle': 'Restaurant',
	'page.landing.restDesc': 'Public host, menu, knowledge, tables, analytics, and staff workflow.',
	'page.landing.qrTitle': 'QR table',
	'page.landing.qrDesc': 'Guest opens a table session without account, install, or shared login.',
	'page.landing.workspaceLabel': 'Active workspace',
	'page.landing.guestView': 'Open guest QR view',
	'page.landing.dashboard': 'Open management dashboard',
	'page.landing.dashboardDesc':
		'Workspace metrics, restaurant menus, QR tables, and review queues.',
	'page.landing.staffInbox': 'Open staff inbox'
};
