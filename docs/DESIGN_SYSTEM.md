# Lingua Design System Baseline

**Status:** Initial direction for design and frontend implementation.

## 1. Design Goals

- Fast to understand after scanning a QR code.
- Calm and trustworthy for food, allergy, and halal questions.
- Warm enough for hospitality, but not decorative or marketing-heavy.
- Dense enough for restaurant operations, but still comfortable on small phones.
- Works with long translations, CJK scripts, and Arabic RTL.

## 2. Visual Direction

Use a clean hospitality utility style:

- Light background.
- Strong readable text.
- Warm food-related accent.
- Clear safety/warning colors.
- Minimal shadows.
- 8px or smaller radius for most cards and controls.

Avoid:

- Generic AI purple gradients.
- Dark blue/slate-only dashboards.
- Beige-only food palettes.
- Decorative gradient blobs.
- Landing-page hero sections for the app experience.
- Cards nested inside cards.

## 3. Color Tokens

Initial palette:

```text
--color-bg: #F8FAFC;
--color-surface: #FFFFFF;
--color-surface-muted: #F1F5F9;
--color-text: #111827;
--color-text-muted: #64748B;
--color-border: #CBD5E1;

--color-primary: #0F766E;
--color-primary-strong: #115E59;
--color-primary-soft: #CCFBF1;

--color-accent: #F97316;
--color-accent-soft: #FFEDD5;

--color-success: #16A34A;
--color-success-soft: #DCFCE7;
--color-warning: #D97706;
--color-warning-soft: #FEF3C7;
--color-danger: #DC2626;
--color-danger-soft: #FEE2E2;
--color-info: #2563EB;
--color-info-soft: #DBEAFE;
```

Usage:

- Primary teal: navigation, selected states, primary actions.
- Orange accent: food recommendation highlights and one main CTA per screen.
- Red: allergen/high-risk warning only.
- Amber: uncertain or staff-confirmation-needed state.
- Green: verified safe/available state.
- Blue: neutral information.

## 4. Typography

Recommended stack:

```css
font-family: Inter, 'Noto Sans', 'Noto Sans Arabic', 'Noto Sans CJK', system-ui, sans-serif;
```

Rules:

- Do not scale font size directly with viewport width.
- Letter spacing should stay at `0`.
- Use compact headings inside dashboards and panels.
- Reserve large type only for true first-screen customer states.
- Test German, Arabic, Chinese, Japanese, Korean, and Indonesian food names.

## 5. Layout Rules

### Mobile

- Primary target width: 360px and 390px.
- Bottom actions should be thumb-friendly.
- Tap targets: minimum 44px.
- Sticky filters can be used, but must not hide content.
- Avoid two-column layouts below 768px.

### Tablet

- Staff inbox should become a two-pane layout.
- Admin menu editor can use split list/detail layout.

### Desktop

- Admin dashboard can use sidebar navigation.
- Customer route should remain centered and readable, not stretch full width.

## 6. Core Components

### Customer

- Language selector.
- Preference chips.
- Menu category rail.
- Menu item card.
- Menu item detail sheet/page.
- Dietary/allergen badges.
- Recommendation panel.
- Chat panel.
- Low-confidence alert.
- Staff request button.
- Feedback control.

### Staff

- Inbox list.
- Request status pill.
- Request detail.
- Table badge.
- Summary block.
- Resolve action.

### Admin

- Sidebar/top navigation.
- Menu table/list.
- Item editor form.
- Import review table.
- QR code card.
- Knowledge document editor.
- Analytics tiles.

## 7. UI State Requirements

Every feature should define:

- Default state.
- Loading state.
- Empty state.
- Error state.
- Offline/poor connection state.
- Permission denied state where relevant.
- Low-confidence AI state where relevant.
- Success confirmation.

## 8. Customer Screen Priority

The first customer screen after QR should show:

1. Restaurant name.
2. Language selection or detected language confirmation.
3. Primary actions: browse menu and ask.
4. Preference setup entry.

It should not show a marketing hero, sales copy, or generic AI explanation.

## 9. Accessibility

- Use semantic buttons and links.
- Provide visible focus states.
- Maintain WCAG AA contrast for text and controls.
- Do not rely on color alone for allergen or warning meaning.
- Support screen reader labels for icon-only controls.
- Make form errors explicit and close to the field.

## 10. Interaction Details

- Show skeletons for menu and analytics loads.
- Show streaming/progress for AI responses if available.
- Use optimistic UI only when rollback is clear.
- Confirm destructive admin actions.
- Use inline validation before submit.
- Keep fallback request visible after submission until staff acknowledges or the user closes it.
