#!/bin/sh
# Brings a fresh Garage node into a state that can hold objects.
#
# Runs once per `docker compose up` and is safe to repeat: every step either
# succeeds or reports that it was already done. Without it the S3 API answers
# every request with "no available nodes", which reads like a network fault
# rather than an unconfigured cluster.
set -eu

ADMIN="http://garage:3903"
TOKEN="${GARAGE_ADMIN_TOKEN:-development-only-admin-token}"
BUCKET="${STORAGE_BUCKET:-ainam}"
KEY_ID="${STORAGE_ACCESS_KEY_ID:?set STORAGE_ACCESS_KEY_ID}"
SECRET="${STORAGE_SECRET_ACCESS_KEY:?set STORAGE_SECRET_ACCESS_KEY}"

admin_get() {
  wget -qO- --header="Authorization: Bearer $TOKEN" "$ADMIN/$1"
}

echo "==> waiting for garage"
until admin_get v2/GetClusterStatus >/dev/null 2>&1; do sleep 1; done

# The CLI addresses a node by its full id, which nothing can know before the
# daemon is up — so the id comes from the admin API and the readable CLI does
# the rest.
node_id=$(admin_get v2/GetClusterStatus | sed -n 's/.*"id": "\([0-9a-f]\{64\}\)".*/\1/p' | head -1)
[ -n "$node_id" ] || { echo "garage reported no node id" >&2; exit 1; }
export GARAGE_RPC_HOST="$node_id@garage:3901"

# A node holds no data until it has a place in the layout. One zone, because
# there is one node.
#
# Skipped once the node has a role, which is the state a second `docker compose
# up` against an existing volume finds. Re-assigning there fails, because the
# layout version has moved on and `apply --version 1` is no longer the next one.
if admin_get v2/GetClusterStatus | grep -q '"role": null'; then
  echo "==> assigning layout"
  garage layout assign -z dev -c 1G "$node_id"

  version=$(admin_get v2/GetClusterStatus | sed -n 's/.*"layoutVersion": \([0-9]*\).*/\1/p' | head -1)
  garage layout apply --version "$((${version:-0} + 1))"
fi

garage bucket create "$BUCKET" 2>/dev/null || true

# Imported rather than generated, so the credentials are the ones already in
# .env — a generated key would have to be copied out of a log by hand before
# anything could use it.
garage key import "$KEY_ID" "$SECRET" --yes -n ainam 2>/dev/null || true
garage bucket allow "$BUCKET" --key "$KEY_ID" --read --write 2>/dev/null || true

# Website mode is what makes an object fetchable by a browser, which cannot
# sign an S3 request. Garage resolves the bucket from the Host header, so the
# alias is the host a browser actually sends — which keeps URLs path-style.
garage bucket website --allow "$BUCKET" 2>/dev/null || true
garage bucket alias "$BUCKET" localhost 2>/dev/null || true

echo "==> garage ready: bucket $BUCKET, website enabled"
