# ainything Design System

**Version:** 2.0  
**Updated:** Juni 2026

## 1. Design Philosophy

### Brand Personality

ainything is a **multi-tenant SaaS platform** untuk UMKM — bukan hanya restoran. Platform ini harus terasa:

- **Friendly** — approachable, tidak mengintimidasi pemilik usaha kecil
- **Fresh** — modern, growth-oriented, tech-forward tapi tidak corporate
- **Warm** — hospitality feel, welcoming untuk customer/tourist
- **Versatile** — cocok untuk berbagai industri (kuliner, retail, jasa, dll)
- **Tap-first** — friendly untuk mobile, tombol besar, gesture-friendly

### Visual Direction

Clean utility style dengan warmth:

- Light/warm background
- Strong readable text
- Fresh emerald primary (growth, friendly)
- Warm amber secondary (approachable, sweet)
- Modern rose accent (fun, contemporary)
- Minimal shadows
- 8-12px radius untuk cards dan controls

**Avoid:**

- Generic AI purple gradients
- Dark blue/slate-only dashboards
- Beige-only food palettes
- Decorative gradient blobs
- Landing-page hero sections untuk app experience
- Cards nested inside cards
- Corporate dark green (too intimidating)
- Aggressive orange/red (too harsh)

## 2. Color Palette

### Philosophy: "Fresh Growth + Warm Hospitality"

Palette ini dirancang untuk:

1. **Modern tapi tidak corporate** — emerald yang cerah, bukan forest green gelap
2. **Friendly tapi tidak childish** — warm accent yang approachable
3. **Versatile untuk berbagai UMKM** — tidak terasa spesifik satu industri
4. **Professional tapi tetap fun** — rose accent untuk elemen playful

### Light Mode

```text
--color-bg: #FAFAF9;              (warm white, softer than pure white)
--color-surface: #FFFFFF;          (clean white)
--color-muted: #F5F5F4;           (warm light gray)
--color-text: #1A1A2E;            (near black with warm undertone)
--color-subtle: #78716C;          (warm gray)
--color-border: #E7E5E4;          (warm mid gray)

--color-primary: #059669;         (emerald - fresh, growth, friendly, accessible)
--color-primary-strong: #047857;  (darker emerald for hover)
--color-primary-soft: #D1FAE5;    (light emerald background)

--color-secondary: #F59E0B;       (amber honey - warm, approachable)
--color-secondary-strong: #D97706; (darker amber)
--color-secondary-soft: #FEF3C7;  (light amber background)

--color-accent: #EC4899;          (rose - modern, fun)
--color-accent-strong: #DB2777;   (darker rose)
--color-accent-soft: #FCE7F3;     (light rose background)

--color-success: #059669;         (emerald)
--color-success-soft: #D1FAE5;
--color-warning: #F59E0B;         (amber)
--color-warning-soft: #FEF3C7;
--color-danger: #EF4444;          (red)
--color-danger-soft: #FEE2E2;
--color-info: #3B82F6;            (blue)
--color-info-soft: #DBEAFE;
```

### Dark Mode

```text
--color-bg: #0C0A09;              (warm black, softer than pure black)
--color-surface: #1C1917;         (warm dark gray)
--color-muted: #292524;           (warm mid gray)
--color-text: #F5F5F4;            (warm white)
--color-subtle: #A8A29E;          (warm gray)
--color-border: #44403C;          (warm mid gray)

--color-primary: #34D399;         (light emerald for dark mode)
--color-primary-strong: #10B981;
--color-primary-soft: #064E3B;

--color-secondary: #FBBF24;       (bright amber for dark mode)
--color-secondary-strong: #F59E0B;
--color-secondary-soft: #78350F;

--color-accent: #F472B6;          (bright rose for dark mode)
--color-accent-strong: #EC4899;
--color-accent-soft: #831843;

--color-success: #34D399;
--color-success-soft: #064E3B;
--color-warning: #FBBF24;
--color-warning-soft: #78350F;
--color-danger: #F87171;
--color-danger-soft: #7F1D1D;
--color-info: #60A5FA;
--color-info-soft: #1E3A8A;
```

### Usage Guidelines

**Primary (Emerald #059669):**

- Navigation active states
- Primary action buttons
- Selected items
- Links
- Progress indicators
- "Verified available", confirmed items

**Secondary (Amber):**

- Highlighted recommendations
- Call-to-action buttons (when primary already used)
- Favorite/star actions
- Warm highlights
- Staff-confirmation-needed state

**Accent (Rose):**

- Notification badges
- Playful elements
- Modern feel elements
- Special offers/promos

**Semantic:**

- Success: verified safe, completed, available
- Warning: uncertain, needs attention, pending
- Danger: allergen, error, high-risk warning, out-of-stock
- Info: neutral information, tips

**Red (danger) hanya untuk:**

- Allergen/high-risk warning
- Errors
- Destructive actions
- Out-of-stock

**Amber (warning) untuk:**

- "Needs staff confirmation"
- Low confidence AI
- Pending states
- Warm highlights

## 3. Typography

```css
font-family:
	'Plus Jakarta Sans', Inter, 'Noto Sans', 'Noto Sans Arabic', 'Noto Sans CJK', system-ui,
	sans-serif;
```

**Plus Jakarta Sans** untuk headings — modern, friendly, geometric tanpa terasa corporate.

Rules:

- Do not scale font size directly with viewport width.
- Letter spacing should stay at `0`.
- Use compact headings inside dashboards and panels.
- Reserve large type only for true first-screen customer states.
- Test German, Arabic, Chinese, Japanese, Korean, dan Indonesian food names.

## 4. Layout Rules

### Mobile

- Primary target width: 360px dan 390px.
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

## 5. Component Library

### Core Components

Located in `src/lib/ui/`:

| Component   | File               | Purpose                                          |
| ----------- | ------------------ | ------------------------------------------------ |
| Button      | Button.svelte      | 4 variants (solid/outline/ghost/danger)          |
| Card        | Card.svelte        | Container with header/body/footer snippets       |
| Input       | Input.svelte       | Form input with label, error, icons              |
| Textarea    | Textarea.svelte    | Multi-line text input                            |
| Badge       | Badge.svelte       | Status badges (default/success/warning/etc)      |
| Modal       | Modal.svelte       | Dialog with backdrop, escape key                 |
| Toasts      | Toasts.svelte      | Toast notifications (success/error/warning/info) |
| Skeleton    | Skeleton.svelte    | Loading placeholders                             |
| AlertBanner | AlertBanner.svelte | Alert messages with variants                     |

### Customer Components

- Language selector
- Preference chips
- Menu category rail
- Menu item card
- Menu item detail sheet/page
- Dietary/allergen badges
- Recommendation panel
- Chat panel
- Low-confidence alert
- Staff request button
- Feedback control

### Staff Components

- Inbox list
- Request status pill
- Request detail
- Table badge
- Summary block
- Resolve action

### Admin Components

- Sidebar/top navigation
- Menu table/list
- Item editor form
- Import review table
- QR code card
- Knowledge document editor
- Analytics tiles

## 6. UI State Requirements

Every feature should define:

- Default state
- Loading state
- Empty state
- Error state
- Offline/poor connection state
- Permission denied state where relevant
- Low-confidence AI state where relevant
- Success confirmation

## 7. Accessibility

- Use semantic buttons and links.
- Provide visible focus states.
- Maintain WCAG AA contrast for text and controls.
- Do not rely on color alone for allergen or warning meaning.
- Support screen reader labels for icon-only controls.
- Make form errors explicit and close to the field.

## 8. Interaction Details

- Show skeletons for menu and analytics loads.
- Show streaming/progress for AI responses if available.
- Use optimistic UI only when rollback is clear.
- Confirm destructive admin actions.
- Use inline validation before submit.
- Keep fallback request visible after submission until staff acknowledges or the user closes it.
