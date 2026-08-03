#!/usr/bin/env bash
# Roll out .github/workflows/deploy-alert.yml to every repo in the aylith-labs org
# that ships something, so a failed deploy or publish opens a GitHub issue instead
# of going unnoticed. Idempotent — creates or updates the workflow via the GitHub
# contents API (no clone). Requires `gh` authed with `repo` + `workflow` scope.
#
# The target repos and the workflows each one watches come from
# .aylith/deploy-alert-targets.json, which also records the inclusion criterion.
# That list is deliberately explicit: auto-detecting "a workflow that deploys"
# from file contents mis-fires (aylith-media's ci.yml mentions rsync), and a
# false positive here means alerting on ordinary CI, which is the noise this
# whole layer exists to avoid.
#
# The contents API commits straight to each repo's default branch, which is what
# makes the workflow live: workflow_run only ever runs the default branch's copy.
#
# Usage:
#   scripts/rollout-deploy-alert.sh            # apply to every target repo
#   scripts/rollout-deploy-alert.sh --dry-run  # show what would change, touch nothing
#   scripts/rollout-deploy-alert.sh --audit    # check the manifest against the org, change nothing
set -euo pipefail

ORG="aylith-labs"
WORKFLOW_PATH=".github/workflows/deploy-alert.yml"
PLACEHOLDER="__WATCHED_WORKFLOWS__"
# The alerter itself matches the ship-workflow name patterns below; it is never
# a target of itself.
SELF_WORKFLOW_NAME="Deploy alert"
SHIP_PATTERN='deploy|publish|release|pages'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE="$SCRIPT_DIR/../.aylith/templates/deploy-alert.yml"
MANIFEST="$SCRIPT_DIR/../.aylith/deploy-alert-targets.json"

MODE="apply"
case "${1:-}" in
  --dry-run) MODE="dry-run" ;;
  --audit) MODE="audit" ;;
  "") ;;
  *) echo "Unknown argument: $1" >&2; exit 2 ;;
esac

for required in "$TEMPLATE" "$MANIFEST"; do
  [[ -f "$required" ]] || { echo "Not found: $required" >&2; exit 1; }
done

mapfile -t TARGETS < <(jq -r '.targets | keys[]' "$MANIFEST")
echo "${#TARGETS[@]} target repos in $(basename "$MANIFEST")."

# Substitute by index rather than sed/awk regex so a workflow name containing
# & or / cannot corrupt the replacement.
render() {
  awk -v repl="$1" -v needle="$PLACEHOLDER" '{
    idx = index($0, needle)
    if (idx > 0) {
      print substr($0, 1, idx - 1) repl substr($0, idx + length(needle))
    } else {
      print
    }
  }' "$TEMPLATE"
}

if [[ "$MODE" == "audit" ]]; then
  echo "Auditing every non-archived repo against the manifest…"
  drift=0
  mapfile -t ALL < <(gh repo list "$ORG" --no-archived --limit 500 --json name --jq '.[].name')
  for repo in "${ALL[@]}"; do
    live="$(gh api "repos/$ORG/$repo/actions/workflows" --paginate \
      --jq '.workflows[] | select(.state == "active") | .name' 2>/dev/null || true)"
    [[ -z "$live" ]] && continue
    declared="$(jq -r --arg repo "$repo" '.targets[$repo][]? // empty' "$MANIFEST")"

    # A ship-shaped workflow nobody is watching.
    while IFS= read -r name; do
      [[ -z "$name" || "$name" == "$SELF_WORKFLOW_NAME" ]] && continue
      if grep -qiE "$SHIP_PATTERN" <<<"$name" && ! grep -qxF "$name" <<<"$declared"; then
        echo "  drift  $repo: workflow \"$name\" looks like a ship path but is not in the manifest"
        drift=$((drift + 1))
      fi
    done <<<"$live"

    # A manifest entry that matches no live workflow — a rename would break the
    # workflow_run filter silently, with no error anywhere.
    while IFS= read -r name; do
      [[ -z "$name" ]] && continue
      if ! grep -qxF "$name" <<<"$live"; then
        echo "  stale  $repo: manifest lists \"$name\" but no active workflow has that name"
        drift=$((drift + 1))
      fi
    done <<<"$declared"
    sleep 1
  done
  echo "Audit done — $drift item(s) needing attention."
  exit 0
fi

for repo in "${TARGETS[@]}"; do
  full="$ORG/$repo"
  watched="$(jq -c --arg repo "$repo" '.targets[$repo]' "$MANIFEST")"
  rendered="$(mktemp)"
  render "$watched" > "$rendered"

  # Parse what is about to be pushed rather than trusting the substitution. YAML
  # 1.1 reads a bare `on` as the boolean true, so accept either key.
  python3 - "$rendered" <<'PY' || { echo "Rendered workflow for $full is not valid YAML: $rendered" >&2; exit 1; }
import sys, yaml
doc = yaml.safe_load(open(sys.argv[1]))
triggers = doc.get("on", doc.get(True))
watched = triggers["workflow_run"]["workflows"]
assert isinstance(watched, list) and watched, "watched workflow list is empty"
assert doc["jobs"]["alert"]["steps"], "alert job has no steps"
PY

  # Gate on gh's exit code: on 404 gh dumps the error body to stdout and skips
  # --jq, so only trust the output when the call actually succeeded.
  if sha="$(gh api "repos/$full/contents/$WORKFLOW_PATH" --jq '.sha' 2>/dev/null)"; then
    :
  else
    sha=""
  fi

  if [[ "$MODE" == "dry-run" ]]; then
    if [[ -n "$sha" ]]; then
      echo "  would UPDATE $full  watching $watched"
    else
      echo "  would CREATE $full  watching $watched"
    fi
    rm -f "$rendered"
    continue
  fi

  payload="$(mktemp)"
  content_b64="$(base64 -w0 "$rendered")"
  # [skip ci] because this file is inert until a watched workflow completes —
  # nothing here needs a gate run. It also keeps the rollout from tripping the
  # push-triggered ship workflows it is here to watch: compokit's release.yml
  # bumps a version, tags and cuts a GitHub release on every push to main.
  if [[ -n "$sha" ]]; then
    jq -n --arg msg "chore: update deploy-failure alerting [skip ci]" \
          --arg content "$content_b64" --arg sha "$sha" \
          '{message:$msg, content:$content, sha:$sha}' > "$payload"
  else
    jq -n --arg msg "chore: add deploy-failure alerting [skip ci]" \
          --arg content "$content_b64" \
          '{message:$msg, content:$content}' > "$payload"
  fi

  gh api -X PUT "repos/$full/contents/$WORKFLOW_PATH" --input "$payload" >/dev/null
  rm -f "$payload" "$rendered"
  echo "  ✓ $full  watching $watched"
  # Stay gentle on the API and the box.
  sleep 1
done

echo "Done."
