-- Added nullable, backfilled, then constrained: the column is NOT NULL in the
-- schema, and adding it that way in one statement fails on any instance that
-- already has history.
ALTER TABLE "content_versions" ADD COLUMN "publish_id" text;--> statement-breakpoint

-- History written before publish ids existed still has to group into publishes,
-- or the first revert on an upgraded instance would find nothing to revert.
-- Every row of one publish was written with the same project, locale and exact
-- timestamp, so those three reconstruct the event rather than inventing one
-- publish per key.
UPDATE "content_versions"
   SET "publish_id" = 'pub_' || substr(
         md5("project_id" || ':' || "locale" || ':' || "created_at"::text), 1, 22)
 WHERE "publish_id" IS NULL;--> statement-breakpoint

ALTER TABLE "content_versions" ALTER COLUMN "publish_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "preview_url" text;--> statement-breakpoint
CREATE INDEX "content_versions_publish_idx" ON "content_versions" USING btree ("project_id","locale","created_at","publish_id");
