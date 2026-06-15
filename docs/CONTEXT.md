# LinguaServe Agent Context

This file gives future agents fast context without replacing the PRD or technical specification.

## One-Sentence Product Definition

LinguaServe is a QR-based AI menu assistant that helps international tourists understand restaurant menus and helps staff handle only the questions that need human confirmation.

## Current Product Decision

The product starts as B2B SaaS for restaurants. It should not start as a POS, payment product, hotel management system, or travel super-app.

## Current Technical Decision

The web application should use SvelteKit + Svelte 5 + TypeScript, not Next.js, unless this decision is explicitly revisited. Supabase remains the backend platform baseline. The architecture must keep domain logic, services, repositories, and provider adapters outside Svelte components so the codebase can grow without becoming framework-coupled.

## Personas

### Restaurant Owner or Manager

- Wants fewer repeated questions from foreign guests.
- Wants fewer wrong orders.
- Wants better menu conversion and guest satisfaction.
- Does not want to replace existing POS in MVP.

### International Tourist

- Wants to understand food names, ingredients, spice, allergens, halal, and cultural context.
- Does not want to download an app.
- May be using spotty mobile data.
- May speak a language that expands UI text length significantly.

### Staff

- Needs a quick inbox, not a complex dashboard.
- Needs table number, guest language, issue summary, and requested help.
- Should not need to read full chat history unless needed.

## Key Domain Objects

- Organization: tenant/billing owner.
- Restaurant: public customer-facing venue.
- Table: QR-scoped entry point for a customer session.
- Menu: versioned set of categories and items.
- Menu Item: dish/drink with structured flags and translations.
- Knowledge Document: restaurant-specific facts, policies, promos, cultural notes.
- Customer Session: anonymous table session created from QR.
- Chat Message: session-scoped customer/AI/staff message.
- Fallback Request: request for human help.
- AI Event: trace of model, prompt, retrieval, confidence, latency, and cost.

## Product Non-Negotiables

- Tourist flow must work without login.
- AI must not invent ingredients, halal status, allergy safety, prices, or availability.
- High-risk dietary/allergy questions should suggest staff confirmation.
- Restaurant data must be tenant-isolated.
- Public routes must feel fast on mobile.
- UI quality matters as much as backend capability.
- SvelteKit routes must stay thin; business rules belong in domain/services.
- Complex dependencies must be reviewed and wrapped to reduce Svelte ecosystem risk.

## Open Assumptions

- The strongest first market is likely Bali tourist restaurants, but this still needs validation.
- Internal staff inbox may be enough for MVP; WhatsApp fallback may be optional.
- Text chat and structured menu browsing are more important than full voice in MVP.
- Precomputed translations are likely necessary for speed and cost control.
- OCR import is an admin onboarding tool, not a per-customer runtime feature.
- SvelteKit's smaller ecosystem is acceptable if dependency policy, module boundaries, and tests are enforced.

## Common Pitfalls to Avoid

- Building a chatbot-first app with weak menu browsing.
- Treating AI output as truth instead of restaurant data.
- Adding POS/payment/reservation before proving menu assistant usage.
- Designing only for English and Indonesian text lengths.
- Forgetting poor connectivity and in-app browser limitations.
- Making the admin dashboard too complex for small restaurants.
