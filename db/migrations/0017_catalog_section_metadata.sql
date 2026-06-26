-- Migration 0017: Add description and image_url to catalog_sections
--
-- The domain type CatalogSection and the repository query (loadPublishedSectionsFull)
-- both reference description and image_url, but these columns were never added to
-- the table in migration 0003. This migration adds them with safe defaults.

BEGIN;

ALTER TABLE public.catalog_sections
  ADD COLUMN IF NOT EXISTS description text    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS image_url  text     NOT NULL DEFAULT '';

COMMIT;
