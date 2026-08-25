-- Defaults to an empty array, which `loadView` reads as "no recorded order" and
-- falls back to whatever JSONB hands back. The next `ainam push` fills it in,
-- so an existing project fixes itself on its next deploy rather than needing a
-- backfill that would have to guess at an order nobody recorded.
ALTER TABLE "content_schemas" ADD COLUMN "key_order" jsonb DEFAULT '[]'::jsonb NOT NULL;