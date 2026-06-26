import { z } from 'zod';

/**
 * Zod schemas for admin knowledge-document CRUD.
 *
 * Mirrors the pattern in `domain/menu/admin-schema.ts`:
 *  - closed string unions via `z.enum(...)` aligned with the DB CHECK constraints
 *  - string fields trimmed + bounded
 *  - tenant identity deliberately absent from the payload — organization_id and
 *    restaurant_id are resolved server-side from the authenticated membership
 *    and the active restaurant, never trusted from the client form.
 *
 * The accepted code set is aligned with:
 *   - knowledge_documents.visibility IN ('draft', 'published', 'internal')
 *   - knowledge_documents.title text NOT NULL
 *   - knowledge_documents.content text NOT NULL
 *   - knowledge_documents.source_type text NOT NULL DEFAULT 'manual'
 */

export const KNOWLEDGE_VISIBILITY_CODES = ['draft', 'published', 'internal'] as const;
export type KnowledgeVisibilityCode = (typeof KNOWLEDGE_VISIBILITY_CODES)[number];

export const KNOWLEDGE_SOURCE_TYPES = ['manual', 'ocr', 'import'] as const;
export type KnowledgeSourceType = (typeof KNOWLEDGE_SOURCE_TYPES)[number];

/**
 * Body for the `addNote` form action on the knowledge page.
 *
 * `restaurant` (slug) comes from the form for progressive enhancement, but it is
 * re-validated against the authenticated membership server-side. The body value
 * only picks the active scope, never grants authorization.
 */
export const createKnowledgeDocInputSchema = z.object({
	outlet: z.string().trim().min(1).max(120),
	title: z.string().trim().min(1).max(200),
	content: z.string().trim().min(1).max(4000),
	visibility: z.enum(KNOWLEDGE_VISIBILITY_CODES).default('published')
});

export type CreateKnowledgeDocInput = z.infer<typeof createKnowledgeDocInputSchema>;

/**
 * Body for the `updateNote` form action. The `docId` is the existing row UUID.
 */
export const updateKnowledgeDocInputSchema = z.object({
	outlet: z.string().trim().min(1).max(120),
	docId: z.string().uuid(),
	title: z.string().trim().min(1).max(200),
	content: z.string().trim().min(1).max(4000),
	visibility: z.enum(KNOWLEDGE_VISIBILITY_CODES)
});

export type UpdateKnowledgeDocInput = z.infer<typeof updateKnowledgeDocInputSchema>;

/**
 * Body for the `deleteNote` form action — only the doc id is required.
 */
export const deleteKnowledgeDocInputSchema = z.object({
	outlet: z.string().trim().min(1).max(120),
	docId: z.string().uuid()
});

export type DeleteKnowledgeDocInput = z.infer<typeof deleteKnowledgeDocInputSchema>;
