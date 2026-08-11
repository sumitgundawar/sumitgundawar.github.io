#!/usr/bin/env bash
#
# Sets the four GitHub Actions secrets the site agent needs.
#
# Run this yourself:   bash scripts/set-secrets.sh
#
# Secret values are read with a hidden prompt and piped to `gh` over stdin, so
# they never appear in your shell history, in `ps` output, or in any transcript.

set -euo pipefail

REPO="sumitgundawar/sumitgundawar.github.io"

# Not secrets — safe to hardcode, and the Worker uses the same values.
CHANNEL_ID="C0BPGE51GTX"
USER_ID="U0BPJ0ULVDL"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh is not installed. Run:  brew install gh"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Not logged in to GitHub. Run:  gh auth login"
  exit 1
fi

# Read a secret without echoing it, then hand it to gh over stdin rather than
# as an argument (argv is visible to any process via `ps`).
put_secret() {
  local name="$1" prompt="$2" value=""
  printf '%s: ' "$prompt" >&2
  read -rs value
  printf '\n' >&2
  if [ -z "$value" ]; then
    echo "  skipped (empty)" >&2
    return
  fi
  printf '%s' "$value" | gh secret set "$name" --repo "$REPO"
  echo "  set $name" >&2
}

echo "Setting secrets on $REPO"
echo

# Non-secret identifiers: no need to hide these.
printf '%s' "$CHANNEL_ID" | gh secret set SLACK_CHANNEL_ID --repo "$REPO"
echo "  set SLACK_CHANNEL_ID"
printf '%s' "$USER_ID" | gh secret set SLACK_ALLOWED_USER_ID --repo "$REPO"
echo "  set SLACK_ALLOWED_USER_ID"
echo

echo "Paste the two tokens (input stays hidden; press Enter to skip either):"
put_secret SLACK_BOT_TOKEN "  Slack bot token (xoxb-...)"
put_secret CLAUDE_CODE_OAUTH_TOKEN "  Claude token (from: claude setup-token)"

echo
echo "Done. Current secrets:"
gh secret list --repo "$REPO"
