-- Added NOT NULL without a default, which is safe here and nowhere else: the
-- assets table has existed since 0000 but nothing has ever written to it — the
-- upload path arrives with this migration. Any later column on this table needs
-- the add-backfill-constrain shape that 0003 uses.
ALTER TABLE "assets" ADD COLUMN "checksum" text NOT NULL;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "width" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "height" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "stored_bytes" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "assets_project_checksum_idx" ON "assets" USING btree ("project_id","checksum");--> statement-breakpoint
CREATE INDEX "assets_project_created_idx" ON "assets" USING btree ("project_id","created_at");