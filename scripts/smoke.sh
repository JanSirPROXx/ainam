#!/usr/bin/env bash
# Proves the claim in README and CLAUDE.md: a clean checkout runs the stack.
# Runs in CI on every push, so the claim cannot quietly stop being true.
set -euo pipefail

CMS_PORT="${CMS_PORT:-8787}"
DASHBOARD_PORT="${DASHBOARD_PORT:-3000}"
export CMS_PORT DASHBOARD_PORT

cleanup() { docker compose down -v --remove-orphans >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "==> docker compose up"
docker compose up -d --wait --wait-timeout 300

echo "==> GET /health"
body=$(curl --silent --fail --max-time 10 http://localhost:${CMS_PORT}/health)
echo "    $body"
echo "$body" | grep -q '"database":"up"' || {
  echo "FAIL: cms-server reachable but its database is not" >&2
  exit 1
}

echo "==> GET /openapi.json"
curl --silent --fail --max-time 10 http://localhost:${CMS_PORT}/openapi.json >/dev/null

echo "==> GET / on the dashboard"
curl --silent --fail --max-time 20 http://localhost:${DASHBOARD_PORT}/ >/dev/null

echo "==> migrations applied"
docker compose exec -T postgres psql -U ainam -d ainam -tAc \
  "select count(*) from information_schema.tables where table_schema='public'" |
  {
    read -r count
    echo "    $count tables"
    [ "$count" -ge 13 ] || { echo "FAIL: expected at least 13 tables" >&2; exit 1; }
  }

echo "==> content API: seed a project, a key and published content"
key="ainam_sk_$(node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))")"
hash=$(node -e "console.log(require('crypto').createHash('sha256').update('$key').digest('hex'))")

docker compose exec -T postgres psql -U ainam -d ainam -q <<SQL
insert into organizations (id, name, slug, created_at) values ('org_smoke','Smoke','smoke', now());
insert into projects (id, organization_id, name, slug, default_locale, locales)
  values ('proj_smoke','org_smoke','Smoke site','smoke-site','en','["en","de"]'::jsonb);
insert into project_api_keys (id, project_id, name, key_hash, prefix, created_by)
  values ('key_smoke','proj_smoke','smoke','$hash','${key:0:16}','user_smoke');
insert into content_entries (id, project_id, key, locale, status, value, version, updated_by) values
  ('s1','proj_smoke','home/hero/title','en','published','"published"'::jsonb, 1, '{"kind":"agent","name":"smoke"}'::jsonb),
  ('s2','proj_smoke','home/hero/secret','en','draft','"draft"'::jsonb, 0, '{"kind":"agent","name":"smoke"}'::jsonb);
SQL

published=$(curl --silent --fail --max-time 10 \
  -H "Authorization: Bearer $key" "http://localhost:${CMS_PORT}/v1/content/proj_smoke")
echo "    $published"
echo "$published" | grep -q '"home/hero/title":"published"' || {
  echo "FAIL: published content was not returned" >&2; exit 1; }
echo "$published" | grep -q 'secret' && {
  echo "FAIL: a draft entry leaked into the published content API" >&2; exit 1; }

echo "==> a key may not read another project"
cross=$(curl --silent --max-time 10 \
  -H "Authorization: Bearer $key" "http://localhost:${CMS_PORT}/v1/content/proj_other")
echo "$cross" | grep -q '"code":"not_found"' || {
  echo "FAIL: cross-tenant read did not return not_found: $cross" >&2; exit 1; }

echo "==> an unauthenticated read is rejected"
curl --silent --max-time 10 "http://localhost:${CMS_PORT}/v1/content/proj_smoke" |
  grep -q '"code":"unauthorized"' || {
    echo "FAIL: content API served an unauthenticated request" >&2; exit 1; }

echo "==> smoke passed"
