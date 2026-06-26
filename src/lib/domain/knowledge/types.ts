import type { KnowledgeSourceType, KnowledgeVisibilityCode } from './schema';

/**
 * Domain type for a knowledge document.
 *
 * Mirrors `knowledge_documents` columns but renamed to camelCase and narrowed
 * to the subset the UI and service layer need. The DB `source_type` is a free
 * text column; we narrow it to the known `KnowledgeSourceType` union at the
 * repository boundary.
 */
export type KnowledgeDoc = {
	id: string;
	organizationId: string;
	outletId: string;
	title: string;
	content: string;
	visibility: KnowledgeVisibilityCode;
	sourceType: KnowledgeSourceType;
	createdAt: string;
	updatedAt: string;
};
