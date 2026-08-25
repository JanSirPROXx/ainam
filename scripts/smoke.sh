#!/usr/bin/env bash
# Proves the claim in README and CLAUDE.md: a clean checkout runs the stack.
# Runs in CI on every push, so the claim cannot quietly stop being true.
set -euo pipefail

CMS_PORT="${CMS_PORT:-8787}"
DASHBOARD_PORT="${DASHBOARD_PORT:-3000}"
STARTER_PORT="${STARTER_PORT:-3200}"
export CMS_PORT DASHBOARD_PORT STARTER_PORT

cleanup() { docker compose down -v --remove-orphans >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "==> docker compose up"
# --build, not just up: without it Compose reuses a cached image and the test
# passes against code that is no longer in the checkout. Cost a debugging
# session once already.
docker compose up -d --build --wait --wait-timeout 600

echo "==> GET /health"
body=$(curl --silent --fail --max-time 10 http://localhost:${CMS_PORT}/health)
echo "    $body"
echo "$body" | grep -q '"database":"up"' || {
  echo "FAIL: cms-server reachable but its database is not" >&2
  exit 1
}

echo "==> GET /openapi.json"
curl --silent --fail --max-time 10 http://localhost:${CMS_PORT}/openapi.json >/dev/null

echo "==> GET / on the starter template"
starter=$(curl --silent --fail --max-time 20 "http://localhost:${STARTER_PORT:-3200}/")
# Unconfigured, it must still render — from the committed snapshot, which is the
# same path a configured site takes during an AINAM outage.
echo "$starter" | grep -q 'Content, decoupled' || {
  echo "FAIL: the starter did not render its snapshot content" >&2; exit 1; }

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

echo "==> bootstrap: the only way into a fresh self-hosted install"
boot=$(docker compose exec -T cms-server node dist/bootstrap.mjs \
  --org Smoke --project Smoke --slug smoke-boot --locale en)
boot_project=$(echo "$boot" | grep AINAM_PROJECT_ID | cut -d= -f2)
boot_key=$(echo "$boot" | grep AINAM_API_KEY | cut -d= -f2)
[ -n "$boot_project" ] && [ -n "$boot_key" ] || {
  echo "FAIL: bootstrap printed no credentials" >&2; exit 1; }

# The credentials it prints have to work immediately — they are the entire
# onboarding path for someone who just ran `docker compose up`.
curl --silent --fail --max-time 10 -X POST \
  -H "Authorization: Bearer $boot_key" -H 'content-type: application/json' \
  "http://localhost:${CMS_PORT}/v1/schema/${boot_project}" -d '{
    "defaultLocale":"en","locales":["en"],
    "schema":{"a/b":{"type":"text","label":"A","required":false,"multiline":false,"default":"works"}}}' >/dev/null || {
  echo "FAIL: the key bootstrap printed does not work" >&2; exit 1; }

if docker compose exec -T cms-server node dist/bootstrap.mjs >/dev/null 2>&1; then
  echo "FAIL: bootstrap ran a second time instead of refusing" >&2; exit 1
fi

echo "==> seed an organisation, a project and two scoped keys"
mkkey() { node -e "const c=require('crypto');const k='ainam_sk_'+c.randomBytes(32).toString('base64url');console.log(k+' '+c.createHash('sha256').update(k).digest('hex'));"; }
read -r write_key write_hash <<< "$(mkkey)"
read -r read_key read_hash <<< "$(mkkey)"

docker compose exec -T postgres psql -U ainam -d ainam -q <<SQL
insert into organizations (id,name,slug,created_at) values ('org_smoke','Smoke','smoke',now());
insert into projects (id,organization_id,name,slug,default_locale,locales)
  values ('proj_smoke','org_smoke','Smoke','smoke','en','["en"]'::jsonb);
insert into project_api_keys (id,project_id,name,scopes,key_hash,prefix,created_by) values
  ('k_w','proj_smoke','dev','["content:read","schema:write"]'::jsonb,'$write_hash','${write_key:0:16}','u'),
  ('k_r','proj_smoke','site','["content:read"]'::jsonb,'$read_hash','${read_key:0:16}','u');
SQL

echo "==> a fresh project serves nothing yet"
[ "$(curl --silent --fail -H "Authorization: Bearer $read_key" \
  "http://localhost:${CMS_PORT}/v1/content/proj_smoke")" = "{}" ] || {
  echo "FAIL: expected an empty map before any schema was pushed" >&2; exit 1; }

echo "==> push a schema; declared defaults are seeded"
curl --silent --fail --max-time 10 -X POST \
  -H "Authorization: Bearer $write_key" -H 'content-type: application/json' \
  "http://localhost:${CMS_PORT}/v1/schema/proj_smoke" -d '{
    "defaultLocale":"en","locales":["en"],
    "schema":{"home/hero/title":{"type":"text","label":"T","required":true,"multiline":false,"default":"seeded copy"}}}' >/dev/null

published=$(curl --silent --fail -H "Authorization: Bearer $read_key" \
  "http://localhost:${CMS_PORT}/v1/content/proj_smoke")
echo "    $published"
# The defect this guards: without seeded defaults the first integration renders
# a blank page and the developer concludes the product does not work.
echo "$published" | grep -q '"home/hero/title":"seeded copy"' || {
  echo "FAIL: push did not seed the declared default" >&2; exit 1; }

echo "==> the schema reads back, which is what ainam pull generates types from"
stored=$(curl --silent --fail --max-time 10 -H "Authorization: Bearer $read_key" \
  "http://localhost:${CMS_PORT}/v1/schema/proj_smoke")
echo "$stored" | grep -q '"home/hero/title"' || {
  echo "FAIL: pushed schema did not read back" >&2; exit 1; }
# A read key is enough to pull: generating types is not a privileged action.
echo "$stored" | grep -q '"defaultLocale":"en"' || {
  echo "FAIL: schema response is missing its locales" >&2; exit 1; }

echo "==> a read-only key may not push"
curl --silent -X POST -H "Authorization: Bearer $read_key" -H 'content-type: application/json' \
  "http://localhost:${CMS_PORT}/v1/schema/proj_smoke" \
  -d '{"defaultLocale":"en","locales":["en"],"schema":{}}' |
  grep -q '"code":"forbidden"' || {
    echo "FAIL: a content:read key was allowed to rewrite the schema" >&2; exit 1; }

echo "==> a key may not read another project"
curl --silent -H "Authorization: Bearer $read_key" \
  "http://localhost:${CMS_PORT}/v1/content/proj_other" |
  grep -q '"code":"not_found"' || {
    echo "FAIL: cross-tenant read did not return not_found" >&2; exit 1; }

echo "==> an unauthenticated read is rejected"
curl --silent "http://localhost:${CMS_PORT}/v1/content/proj_smoke" |
  grep -q '"code":"unauthorized"' || {
    echo "FAIL: content API served an unauthenticated request" >&2; exit 1; }

echo "==> a person signs in, edits a draft, and publishes it"
jar=$(mktemp)
origin="Origin: http://localhost:3000"

curl --silent --fail --max-time 10 -c "$jar" -X POST \
  "http://localhost:${CMS_PORT}/api/auth/sign-up/email" -H 'content-type: application/json' \
  -d '{"email":"smoke@example.test","password":"correct-horse-battery","name":"Smoke"}' >/dev/null

# Better Auth requires an Origin on state-changing calls; that is its CSRF
# protection, not a quirk to work around.
org=$(curl --silent --fail --max-time 10 -b "$jar" -c "$jar" -H "$origin" -X POST \
  "http://localhost:${CMS_PORT}/api/auth/organization/create" -H 'content-type: application/json' \
  -d '{"name":"Smoke org","slug":"smoke-org"}')
org_id=$(echo "$org" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).id))")

docker compose exec -T postgres psql -U ainam -d ainam -q <<SQL
update projects set organization_id='$org_id' where id='proj_smoke';
SQL

[ "$(curl --silent --fail -b "$jar" "http://localhost:${CMS_PORT}/admin/projects" |
     grep -c proj_smoke)" -ge 1 ] || {
  echo "FAIL: the editor cannot see a project in their own organisation" >&2; exit 1; }

version=$(curl --silent --fail -b "$jar" \
  "http://localhost:${CMS_PORT}/admin/projects/proj_smoke/content" |
  node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{
    const e=JSON.parse(s).entries.find(x=>x.key==='home/hero/title');console.log(e.draft.version)})")

curl --silent --fail --max-time 10 -b "$jar" -H "$origin" -X PATCH \
  "http://localhost:${CMS_PORT}/admin/projects/proj_smoke/content" -H 'content-type: application/json' \
  -d "{\"locale\":\"en\",\"entries\":[{\"key\":\"home/hero/title\",\"value\":\"edited by a human\",\"expectedVersion\":$version}]}" >/dev/null

# The whole point of drafts: the public must not see this yet.
curl --silent --fail -H "Authorization: Bearer $read_key" \
  "http://localhost:${CMS_PORT}/v1/content/proj_smoke" | grep -q '"edited by a human"' && {
  echo "FAIL: an unpublished draft leaked into the public content API" >&2; exit 1; }

echo "==> publish, and the change reaches the live content API"
curl --silent --fail --max-time 10 -b "$jar" -H "$origin" -X POST \
  "http://localhost:${CMS_PORT}/admin/projects/proj_smoke/publish" -H 'content-type: application/json' \
  -d '{"locale":"en"}' >/dev/null
live=$(curl --silent --fail -H "Authorization: Bearer $read_key" \
  "http://localhost:${CMS_PORT}/v1/content/proj_smoke")
echo "    $live"
echo "$live" | grep -q '"edited by a human"' || {
  echo "FAIL: a published edit did not reach the content API" >&2; exit 1; }

echo "==> a second editor saving against a stale version is refused"
curl --silent -b "$jar" -H "$origin" -X PATCH \
  "http://localhost:${CMS_PORT}/admin/projects/proj_smoke/content" -H 'content-type: application/json' \
  -d "{\"locale\":\"en\",\"entries\":[{\"key\":\"home/hero/title\",\"value\":\"stale write\",\"expectedVersion\":$version}]}" |
  grep -q '"code":"conflict"' || {
    echo "FAIL: a stale write was accepted, so one editor can silently overwrite another" >&2; exit 1; }

echo "==> smoke passed"
