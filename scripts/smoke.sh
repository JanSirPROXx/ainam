#!/usr/bin/env bash
# Proves the claim in README and CLAUDE.md: a clean checkout runs the stack.
# Runs in CI on every push, so the claim cannot quietly stop being true.
set -euo pipefail

CMS_PORT="${CMS_PORT:-8787}"
DASHBOARD_PORT="${DASHBOARD_PORT:-3000}"
STARTER_PORT="${STARTER_PORT:-3200}"
MARKETING_PORT="${MARKETING_PORT:-3300}"
# Derived rather than hardcoded further down: Better Auth checks the Origin on
# every state-changing call, so claiming an origin the server does not trust
# fails every sign-in — and does so only when someone overrides the port.
DASHBOARD_ORIGIN="${DASHBOARD_ORIGIN:-http://localhost:${DASHBOARD_PORT}}"
export CMS_PORT DASHBOARD_PORT STARTER_PORT MARKETING_PORT DASHBOARD_ORIGIN

# SMOKE_KEEP=1 leaves the stack running after a failure, so the state that broke
# can be inspected instead of reconstructed.
cleanup() {
  if [ -n "${SMOKE_KEEP:-}" ]; then
    echo "==> stack left running (SMOKE_KEEP). Tear it down with: docker compose down -v"
    return
  fi
  docker compose down -v --remove-orphans >/dev/null 2>&1 || true
}
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

echo "==> GET / on the marketing site"
marketing=$(curl --silent --fail --max-time 20 "http://localhost:${MARKETING_PORT}/")
# Our own site, on the same fallback path as a customer's: unconfigured in this
# stack, so it must render from its committed snapshot.
echo "$marketing" | grep -q 'The AI-native CMS layer' || {
  echo "FAIL: the marketing site did not render its snapshot content" >&2; exit 1; }
# The section toggles default to off, and a site that ignored them would show a
# logo wall and a quote with nobody in them. `if`, not `grep ... && { }`: under
# `set -e` the latter aborts the run on the passing case, where grep finds
# nothing and the list returns non-zero.
if echo "$marketing" | grep -q 'Teams shipping content with AINAM'; then
  echo "FAIL: the logo wall rendered while home/logos/visible is false" >&2; exit 1
fi

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

echo "==> the editor lists fields in the order they were declared"
# JSONB normalises key order, so reading it back out of the stored document
# listed a customer's fields in an order nobody chose. The order is recorded at
# push time; this asserts it survives the round trip.
curl --silent --fail --max-time 10 -X POST \
  -H "Authorization: Bearer $write_key" -H 'content-type: application/json' \
  "http://localhost:${CMS_PORT}/v1/schema/proj_smoke" -d '{
    "defaultLocale":"en","locales":["en"],"schema":{
      "z/last":{"type":"text","label":"Declared first","required":false,"multiline":false,"default":""},
      "home/hero/title":{"type":"text","label":"T","required":true,"multiline":false,"default":"seeded copy"},
      "a/first":{"type":"text","label":"Declared last","required":false,"multiline":false,"default":""}}}' >/dev/null

order=$(docker compose exec -T postgres psql -U ainam -d ainam -tAc \
  "select key_order from content_schemas where project_id='proj_smoke'")
echo "    $order"
# Order-sensitive and tolerant of how psql spaces a jsonb array.
echo "$order" | grep -q '^\["z/last".*"home/hero/title".*"a/first"\]$' || {
  echo "FAIL: the declared key order was not recorded: $order" >&2; exit 1; }

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
origin="Origin: ${DASHBOARD_ORIGIN}"

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

# ---------------------------------------------------------------- M4

# Reads one expression out of a JSON body on stdin. `node -e` rather than jq,
# which is not on the CI image and would be a dependency for six lines.
json() {
  node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{
    const v=JSON.parse(s)
    const out=new Function('v','return '+process.argv[1])(v)
    console.log(out===undefined||out===null?'':out)})" "$1"
}
admin() { curl --silent --fail-with-body -b "$jar" -c "$jar" -H "$origin" \
  -H 'content-type: application/json' "$@"; }
# For the checks that assert a refusal: same call, without turning a 4xx into a
# non-zero exit that `set -e` would treat as the test itself failing.
admin_expect_error() { curl --silent -b "$jar" -c "$jar" -H "$origin" \
  -H 'content-type: application/json' "$@"; }

# Docker collects container output asynchronously, so a log line can lag the
# response that produced it. Polling rather than reading once, or this reports a
# missing mail transport when the mail was in fact sent.
wait_for_log() {
  local attempts=20
  while [ "$attempts" -gt 0 ]; do
    docker compose logs cms-server 2>&1 | grep -q "$1" && return 0
    attempts=$((attempts - 1))
    sleep 0.5
  done
  return 1
}

echo "==> a preview key reads drafts, and the key the site builds with cannot"
read -r preview_key preview_hash <<< "$(mkkey)"
docker compose exec -T postgres psql -U ainam -d ainam -q <<SQL
insert into project_api_keys (id,project_id,name,scopes,key_hash,prefix,created_by) values
  ('k_p','proj_smoke','preview','["content:read:draft"]'::jsonb,'$preview_hash','${preview_key:0:16}','u');
SQL

# The defect this guards: a build key sits in CI and in every deploy
# environment, so it is the one most likely to leak. Unpublished work must not
# be reachable with it.
curl --silent -H "Authorization: Bearer $read_key" \
  "http://localhost:${CMS_PORT}/v1/preview/content/proj_smoke" |
  grep -q '"code":"forbidden"' || {
    echo "FAIL: the build key was allowed to read unpublished drafts" >&2; exit 1; }

# A second key so a restore can be told apart from an unrelated edit.
curl --silent --fail --max-time 10 -X POST \
  -H "Authorization: Bearer $write_key" -H 'content-type: application/json' \
  "http://localhost:${CMS_PORT}/v1/schema/proj_smoke" -d '{
    "defaultLocale":"en","locales":["en"],"schema":{
      "home/hero/title":{"type":"text","label":"T","required":true,"multiline":false,"default":"seeded copy"},
      "home/hero/subtitle":{"type":"text","label":"S","required":false,"multiline":false,"default":"seeded subtitle"}}}' >/dev/null

sub_version=$(admin "http://localhost:${CMS_PORT}/admin/projects/proj_smoke/content" |
  json "v.entries.find(e=>e.key==='home/hero/subtitle').draft.version")

admin -X PATCH "http://localhost:${CMS_PORT}/admin/projects/proj_smoke/content" \
  -d "{\"locale\":\"en\",\"entries\":[{\"key\":\"home/hero/subtitle\",\"value\":\"draft only\",\"expectedVersion\":$sub_version}]}" >/dev/null

curl --silent --fail -H "Authorization: Bearer $preview_key" \
  "http://localhost:${CMS_PORT}/v1/preview/content/proj_smoke" | grep -q '"draft only"' || {
  echo "FAIL: the preview endpoint did not show an unpublished draft" >&2; exit 1; }
# Same moment, the published endpoint must still say the old thing.
curl --silent --fail -H "Authorization: Bearer $read_key" \
  "http://localhost:${CMS_PORT}/v1/content/proj_smoke" | grep -q '"draft only"' && {
  echo "FAIL: an unpublished draft leaked into the published content API" >&2; exit 1; }
# And preview falls back to published for keys with no separate draft, or a
# preview would render a page with holes in it.
curl --silent --fail -H "Authorization: Bearer $preview_key" \
  "http://localhost:${CMS_PORT}/v1/preview/content/proj_smoke" | grep -q '"edited by a human"' || {
  echo "FAIL: preview did not fall back to published values" >&2; exit 1; }

echo "==> restore, then an unrelated publish, does not bring the old value back"
# The stale-draft trap: a restore that writes only the published row leaves the
# replaced value in the editor, and the next unrelated publish puts it back.
admin -X POST "http://localhost:${CMS_PORT}/admin/projects/proj_smoke/restore" \
  -d '{"locale":"en","key":"home/hero/title","version":1}' >/dev/null

admin -X POST "http://localhost:${CMS_PORT}/admin/projects/proj_smoke/publish" \
  -d '{"locale":"en"}' >/dev/null

live=$(curl --silent --fail -H "Authorization: Bearer $read_key" \
  "http://localhost:${CMS_PORT}/v1/content/proj_smoke")
echo "    $live"
echo "$live" | grep -q '"home/hero/title":"seeded copy"' || {
  echo "FAIL: the restored-away value came back on the next unrelated publish" >&2; exit 1; }
echo "$live" | grep -q '"home/hero/subtitle":"draft only"' || {
  echo "FAIL: the unrelated edit did not publish" >&2; exit 1; }

echo "==> the history lists both events, with their authors"
publishes=$(admin "http://localhost:${CMS_PORT}/admin/projects/proj_smoke/publishes")
[ "$(echo "$publishes" | json 'v.publishes.length')" -ge 3 ] || {
  echo "FAIL: expected the push, the edit, the restore and the publish in the history" >&2; exit 1; }
# An agent edit is attributed to the agent, never to whoever was signed in.
echo "$publishes" | grep -q '"name":"ainam push"' || {
  echo "FAIL: the schema push is missing from the history" >&2; exit 1; }
echo "$publishes" | json 'Object.values(v.people)[0]' | grep -q . || {
  echo "FAIL: a publish by a person has no resolvable author name" >&2; exit 1; }
# The publish list is a raw SQL query, so it does not get Drizzle's column
# mapping and once returned a Postgres timestamp string where the rest of the
# API returns ISO 8601. Asserted rather than assumed.
echo "$publishes" | json "v.publishes[0].publishedAt === new Date(v.publishes[0].publishedAt).toISOString()" |
  grep -q true || {
    echo "FAIL: publishedAt is not ISO 8601: $(echo "$publishes" | json 'v.publishes[0].publishedAt')" >&2
    exit 1; }

echo "==> reverting a publish returns the page to its previous state"
latest=$(echo "$publishes" | json 'v.publishes[0].publishId')
admin -X POST "http://localhost:${CMS_PORT}/admin/projects/proj_smoke/revert" \
  -d "{\"publishId\":\"$latest\"}" >/dev/null
curl --silent --fail -H "Authorization: Bearer $read_key" \
  "http://localhost:${CMS_PORT}/v1/content/proj_smoke" |
  grep -q '"home/hero/subtitle":"seeded subtitle"' || {
    echo "FAIL: reverting a publish did not restore the previous value" >&2; exit 1; }

echo "==> reverting the publish that introduced a key reports it rather than blanking it"
push_publish=$(echo "$publishes" | json "v.publishes.find(p=>p.author.kind==='agent').publishId")
skipped=$(admin -X POST "http://localhost:${CMS_PORT}/admin/projects/proj_smoke/revert" \
  -d "{\"publishId\":\"$push_publish\"}" | json 'v.skipped.join(",")')
echo "    skipped: $skipped"
# Nothing preceded a key its first publish created. Blanking it would render an
# empty page, which is not what "undo" was asked for.
[ -n "$skipped" ] || {
  echo "FAIL: reverting a key's first publish should have reported it as skipped" >&2; exit 1; }

echo "==> pagination refuses a cursor this server did not issue"
admin_expect_error "http://localhost:${CMS_PORT}/admin/projects/proj_smoke/publishes?cursor=nonsense" |
  grep -q '"code":"bad_request"' || {
    echo "FAIL: a corrupt cursor silently returned the first page" >&2; exit 1; }

echo "==> an owner invites an editor, on an instance with no SMTP configured"
as() { local cookies="$1"; shift; curl --silent -b "$cookies" -c "$cookies" -H "$origin" \
  -H 'content-type: application/json' "$@"; }

invite=$(admin -X POST "http://localhost:${CMS_PORT}/api/auth/organization/invite-member" \
  -d "{\"email\":\"editor@example.test\",\"role\":\"editor\",\"organizationId\":\"$org_id\"}")
invitation_id=$(echo "$invite" | json 'v.id')
[ -n "$invitation_id" ] || {
  echo "FAIL: inviting an editor did not return an invitation: $invite" >&2; exit 1; }

# MAIL_TRANSPORT is console here, which is the self-hosted default: no mail
# server, no external account. The link has to be somewhere an owner can reach
# it, or the first invitation on a fresh install goes nowhere.
wait_for_log 'Mail not sent' || {
  echo "FAIL: the console transport did not print the invitation" >&2; exit 1; }
wait_for_log "accept-invitation/${invitation_id}" || {
  echo "FAIL: the printed invitation does not carry a link anyone can open" >&2; exit 1; }

editor_jar=$(mktemp)
as "$editor_jar" --fail -X POST "http://localhost:${CMS_PORT}/api/auth/sign-up/email" \
  -d '{"email":"editor@example.test","password":"correct-horse-battery","name":"Ed"}' >/dev/null
as "$editor_jar" --fail -X POST "http://localhost:${CMS_PORT}/api/auth/organization/accept-invitation" \
  -d "{\"invitationId\":\"$invitation_id\"}" >/dev/null

echo "==> the editor can edit and publish, and cannot change settings or keys"
as "$editor_jar" --fail "http://localhost:${CMS_PORT}/admin/projects/proj_smoke/content" >/dev/null || {
  echo "FAIL: an invited editor cannot open the content they were invited to edit" >&2; exit 1; }

# The split that makes the agency handover possible: the client edits the copy,
# and cannot repoint the webhook or rotate the key the agency's build depends on.
as "$editor_jar" -X PATCH "http://localhost:${CMS_PORT}/admin/projects/proj_smoke" \
  -d '{"name":"Renamed by an editor"}' | grep -q '"code":"forbidden"' || {
  echo "FAIL: an editor was allowed to change project settings" >&2; exit 1; }
as "$editor_jar" -X POST "http://localhost:${CMS_PORT}/admin/projects/proj_smoke/webhook-secret" |
  grep -q '"code":"forbidden"' || {
  echo "FAIL: an editor was allowed to rotate the webhook secret" >&2; exit 1; }

echo "==> a member of another organisation is refused on every admin route"
outsider_jar=$(mktemp)
as "$outsider_jar" --fail -X POST "http://localhost:${CMS_PORT}/api/auth/sign-up/email" \
  -d '{"email":"outsider@example.test","password":"correct-horse-battery","name":"Otto"}' >/dev/null
as "$outsider_jar" --fail -X POST "http://localhost:${CMS_PORT}/api/auth/organization/create" \
  -d '{"name":"Outside org","slug":"outside-org"}' >/dev/null

# 404 rather than 403 throughout: confirming that someone else's project exists
# is itself a disclosure, and one route answering differently would reveal it
# by contrast.
#
# Every body below is one the endpoint accepts. A body that fails validation is
# refused before the handler runs, so the request would never reach the check
# this is here to prove.
while IFS='|' read -r method path body; do
  [ -n "$method" ] || continue
  answer=$(as "$outsider_jar" -X "$method" "http://localhost:${CMS_PORT}${path}" -d "$body")
  echo "$answer" | grep -q '"code":"not_found"' || {
    echo "FAIL: $method $path leaked another organisation's project: $answer" >&2; exit 1; }
done <<'ROUTES'
GET|/admin/projects/proj_smoke|
GET|/admin/projects/proj_smoke/content|
GET|/admin/projects/proj_smoke/publishes|
GET|/admin/projects/proj_smoke/versions?key=home/hero/title|
GET|/admin/projects/proj_smoke/preview-link|
POST|/admin/projects/proj_smoke/publish|{"locale":"en"}
POST|/admin/projects/proj_smoke/restore|{"locale":"en","key":"home/hero/title","version":1}
POST|/admin/projects/proj_smoke/revert|{"publishId":"pub_whatever"}
POST|/admin/projects/proj_smoke/webhook-secret|
PATCH|/admin/projects/proj_smoke|{"name":"Renamed by an outsider"}
ROUTES

echo "==> a malformed request answers in the same envelope as every other error"
# Request validation runs before the handler, so without a hook it answers in
# the validator's own shape — the one response a client cannot branch on.
malformed=$(admin_expect_error -X POST "http://localhost:${CMS_PORT}/admin/projects/proj_smoke/publish" -d '{}')
echo "$malformed" | grep -q '"code":"validation_failed"' || {
  echo "FAIL: a validation failure did not use the shared error envelope: $malformed" >&2; exit 1; }
echo "$malformed" | grep -q '"requestId"' || {
  echo "FAIL: a validation failure carries no request id to quote in a bug report" >&2; exit 1; }
echo "$malformed" | grep -q '"path":"locale"' || {
  echo "FAIL: a validation failure does not name the field that was wrong" >&2; exit 1; }

echo "==> a password reset works with no mail server configured"
curl --silent --fail --max-time 10 -H "$origin" -H 'content-type: application/json' -X POST \
  "http://localhost:${CMS_PORT}/api/auth/request-password-reset" \
  -d "{\"email\":\"editor@example.test\",\"redirectTo\":\"${DASHBOARD_ORIGIN}/reset-password\"}" >/dev/null
wait_for_log 'Set a new AINAM password' || {
  echo "FAIL: no reset link reached the console transport, so a forgotten password is a dead end" >&2
  exit 1; }

echo "==> preview links are refused until the project has somewhere to point"
admin_expect_error "http://localhost:${CMS_PORT}/admin/projects/proj_smoke/preview-link" |
  grep -q '"code":"conflict"' || {
    echo "FAIL: a preview link was minted for a project with no preview URL" >&2; exit 1; }

admin -X PATCH "http://localhost:${CMS_PORT}/admin/projects/proj_smoke" \
  -d "{\"previewUrl\":\"http://localhost:${STARTER_PORT}/api/ainam/preview\"}" >/dev/null
admin -X POST "http://localhost:${CMS_PORT}/admin/projects/proj_smoke/webhook-secret" >/dev/null

link=$(admin "http://localhost:${CMS_PORT}/admin/projects/proj_smoke/preview-link" | json 'v.url')
echo "    $link"
echo "$link" | grep -q 'signature=' || {
  echo "FAIL: the preview link is unsigned, so anyone could read the site's drafts" >&2; exit 1; }

# The starter in this stack has no AINAM_WEBHOOK_SECRET — it is brought up
# before any project exists — so it cannot verify a signature at all. What it
# must not do is fail opaquely: someone debugging their own deployment has to be
# told which variable is missing. The signature checking itself is covered by
# the unit tests in packages/next, which can configure both sides.
tampered="${link%signature=*}signature=0000"
answer=$(curl --silent "$tampered")
echo "$answer" | grep -q 'AINAM_WEBHOOK_SECRET' || {
  echo "FAIL: an unconfigured site does not say what is missing: $answer" >&2; exit 1; }

# Leaving preview must work even then, or a visitor is stuck in draft mode.
[ "$(curl --silent -o /dev/null -w '%{http_code}' \
  "http://localhost:${STARTER_PORT}/api/ainam/preview?exit=1")" = "307" ] || {
  echo "FAIL: a visitor cannot leave draft mode on an unconfigured site" >&2; exit 1; }

# ---------------------------------------------------------------- M5

echo "==> object storage is up and the bucket exists"
docker compose exec -T garage /garage bucket list 2>/dev/null | grep -q "${STORAGE_BUCKET:-ainam}" || {
  echo "FAIL: the bucket was not created, so no upload can succeed" >&2; exit 1; }

# This suite always starts from a wiped volume, so it would never meet the state
# a developer meets on their second `docker compose up`. Running the bootstrap
# again against a configured cluster is that state, and it failed hard until the
# layout step learned to skip itself.
docker compose run --rm garage-init >/dev/null 2>&1 || {
  echo "FAIL: the storage bootstrap is not repeatable, so a second compose up breaks" >&2
  exit 1; }

echo "==> upload an image; the header decides the format, not the filename"
work=$(mktemp -d)
# A 1x1 PNG, written as bytes rather than generated, so this needs no image
# library on the machine running the smoke test.
printf '%s' 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' \
  | base64 -d > "$work/logo.png"

asset=$(curl --silent --fail-with-body -b "$jar" -H "$origin" -X POST \
  "http://localhost:${CMS_PORT}/admin/projects/proj_smoke/assets" -F "file=@$work/logo.png")
echo "    $asset"
asset_id=$(echo "$asset" | json 'v.id')
asset_url=$(echo "$asset" | json 'v.url')
[ -n "$asset_id" ] || { echo "FAIL: the upload returned no asset" >&2; exit 1; }

# Re-encoded, never passed through: what a browser gets is a WebP this server
# produced, not bytes a caller supplied.
echo "$asset" | grep -q '"mimeType":"image/webp"' || {
  echo "FAIL: the upload was not re-encoded: $asset" >&2; exit 1; }

echo "==> the image comes from the bucket, not through cms-server"
echo "    $asset_url"
case "$asset_url" in
  *:${GARAGE_WEB_PORT:-3902}/*) ;;
  *) echo "FAIL: the image URL does not point at the bucket: $asset_url" >&2; exit 1 ;;
esac
[ "$(curl --silent -o /dev/null -w '%{http_code}' "$asset_url")" = "200" ] || {
  echo "FAIL: the bucket did not serve the image to an anonymous request" >&2; exit 1; }

echo "==> the same file uploaded twice is one asset"
again=$(curl --silent --fail-with-body -b "$jar" -H "$origin" -X POST \
  "http://localhost:${CMS_PORT}/admin/projects/proj_smoke/assets" -F "file=@$work/logo.png" | json 'v.id')
[ "$again" = "$asset_id" ] || {
  echo "FAIL: re-uploading the same image made a second asset ($again vs $asset_id)" >&2; exit 1; }

echo "==> an SVG is refused, whatever it is called"
printf '%s' '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><script>alert(1)</script></svg>' \
  > "$work/payload.png"
refusal=$(curl --silent -b "$jar" -H "$origin" -X POST \
  "http://localhost:${CMS_PORT}/admin/projects/proj_smoke/assets" -F "file=@$work/payload.png")
echo "    $refusal"
# Named ".png" and still refused: the decoded header is what decides.
echo "$refusal" | grep -q 'script' || {
  echo "FAIL: an SVG named .png was accepted, which is stored XSS on the customer site" >&2; exit 1; }

echo "==> an oversized upload is refused, naming the limit"
head -c 21000000 /dev/zero > "$work/huge.png"
oversized=$(curl --silent -b "$jar" -H "$origin" -X POST \
  "http://localhost:${CMS_PORT}/admin/projects/proj_smoke/assets" -F "file=@$work/huge.png")
echo "$oversized" | grep -q '20 MB' || {
  echo "FAIL: an oversized upload was not refused with the limit: $oversized" >&2; exit 1; }

echo "==> an image reaches the live site with its intrinsic dimensions"
curl --silent --fail --max-time 10 -X POST \
  -H "Authorization: Bearer $write_key" -H 'content-type: application/json' \
  "http://localhost:${CMS_PORT}/v1/schema/proj_smoke" -d '{
    "defaultLocale":"en","locales":["en"],"schema":{
      "home/hero/title":{"type":"text","label":"T","required":true,"multiline":false,"default":"seeded copy"},
      "home/hero/image":{"type":"image","label":"Hero","required":false,"alt":true},
      "home/about/body":{"type":"richText","label":"About","required":false,"default":"Placeholder."}}}' >/dev/null

image_version=$(admin "http://localhost:${CMS_PORT}/admin/projects/proj_smoke/content" |
  json "v.entries.find(e=>e.key==='home/hero/image').draft.version")
admin -X PATCH "http://localhost:${CMS_PORT}/admin/projects/proj_smoke/content" \
  -d "{\"locale\":\"en\",\"entries\":[{\"key\":\"home/hero/image\",\"value\":{\"assetId\":\"$asset_id\",\"alt\":\"A logo\"},\"expectedVersion\":$image_version}]}" >/dev/null
admin -X POST "http://localhost:${CMS_PORT}/admin/projects/proj_smoke/publish" -d '{"locale":"en"}' >/dev/null

live=$(curl --silent --fail -H "Authorization: Bearer $read_key" \
  "http://localhost:${CMS_PORT}/v1/content/proj_smoke")
# The content row holds only the id and the alt text; the URL and the dimensions
# are spliced in, which is what lets storage move without rewriting content.
echo "$live" | json "JSON.stringify(v['home/hero/image'])" | grep -q '"width":1' || {
  echo "FAIL: the published image carries no intrinsic dimensions: $live" >&2; exit 1; }
echo "$live" | json "v['home/hero/image'].url" | grep -q "$asset_id" || {
  echo "FAIL: the published image has no resolvable URL" >&2; exit 1; }

echo "==> rich text is refused when it carries formatting the site cannot render"
body_version=$(admin "http://localhost:${CMS_PORT}/admin/projects/proj_smoke/content" |
  json "v.entries.find(e=>e.key==='home/about/body').draft.version")
bad=$(admin_expect_error -X PATCH "http://localhost:${CMS_PORT}/admin/projects/proj_smoke/content" \
  -d "{\"locale\":\"en\",\"entries\":[{\"key\":\"home/about/body\",\"value\":{\"type\":\"doc\",\"content\":[{\"type\":\"iframe\"}]},\"expectedVersion\":$body_version}]}")
echo "$bad" | grep -q '"code":"validation_failed"' || {
  echo "FAIL: a node no renderer knows was accepted into content: $bad" >&2; exit 1; }

# And a link that would run script, which is the same check on a mark.
script_link=$(admin_expect_error -X PATCH "http://localhost:${CMS_PORT}/admin/projects/proj_smoke/content" \
  -d "{\"locale\":\"en\",\"entries\":[{\"key\":\"home/about/body\",\"value\":{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"x\",\"marks\":[{\"type\":\"link\",\"attrs\":{\"href\":\"javascript:alert(1)\"}}]}]}]},\"expectedVersion\":$body_version}]}")
echo "$script_link" | grep -q '"code":"validation_failed"' || {
  echo "FAIL: a javascript: link was accepted into content" >&2; exit 1; }

echo "==> a value of the wrong kind is refused for its field"
# The edit path never checked this before M5: `contentValueSchema` proves the
# body is a content value, not that it fits the field it was sent for.
wrong=$(admin_expect_error -X PATCH "http://localhost:${CMS_PORT}/admin/projects/proj_smoke/content" \
  -d "{\"locale\":\"en\",\"entries\":[{\"key\":\"home/hero/title\",\"value\":42,\"expectedVersion\":1}]}")
echo "$wrong" | grep -q '"code":"validation_failed"' || {
  echo "FAIL: a number was accepted into a text field: $wrong" >&2; exit 1; }

echo "==> an owner mints the key a deployment reads with"
minted=$(admin -X POST "http://localhost:${CMS_PORT}/admin/projects/proj_smoke/api-keys" \
  -d '{"name":"production","scopes":["content:read"]}')
minted_key=$(echo "$minted" | json 'v.key')
[ -n "$minted_key" ] || { echo "FAIL: creating a key returned nothing usable: $minted" >&2; exit 1; }
curl --silent --fail -H "Authorization: Bearer $minted_key" \
  "http://localhost:${CMS_PORT}/v1/content/proj_smoke" >/dev/null || {
  echo "FAIL: a key minted in the dashboard cannot read content" >&2; exit 1; }

# Revoking takes effect on the next request, not on the next restart.
key_id=$(echo "$minted" | json 'v.id')
admin -X DELETE "http://localhost:${CMS_PORT}/admin/projects/proj_smoke/api-keys/${key_id}" >/dev/null
curl --silent -H "Authorization: Bearer $minted_key" \
  "http://localhost:${CMS_PORT}/v1/content/proj_smoke" | grep -q '"code":"unauthorized"' || {
  echo "FAIL: a revoked key still reads content" >&2; exit 1; }

echo "==> deleting a project takes its stored objects with it"
before=$(docker compose exec -T garage /garage bucket info "${STORAGE_BUCKET:-ainam}" 2>/dev/null | awk '/Objects:/ { print $2 }')
admin -X DELETE "http://localhost:${CMS_PORT}/admin/projects/proj_smoke" >/dev/null
after=$(docker compose exec -T garage /garage bucket info "${STORAGE_BUCKET:-ainam}" 2>/dev/null | awk '/Objects:/ { print $2 }')
echo "    objects: $before -> $after"
# The rows cascade on their own; the bytes do not, and stranded bytes surface
# only as a storage invoice for content nobody can reach.
[ "${after:-1}" -lt "${before:-0}" ] || {
  echo "FAIL: deleting a project left its objects in the bucket" >&2; exit 1; }

echo "==> smoke passed"
