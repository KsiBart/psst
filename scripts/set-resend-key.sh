#!/usr/bin/env bash
# Saves your Resend API key without echoing it to the screen or shell history.
#  - writes RESEND_API_KEY into .env.local (git-ignored) for local development
#  - optionally pushes it to your Vercel project (needs the Vercel CLI, `vercel link` done)
# Usage: ./scripts/set-resend-key.sh
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE=".env.local"

read -r -s -p "Paste your Resend API key (input hidden): " KEY
echo
if [[ ! "$KEY" =~ ^re_[A-Za-z0-9_]+$ ]]; then
  echo "That doesn't look like a Resend key (expected it to start with 're_'). Nothing saved." >&2
  exit 1
fi

touch "$ENV_FILE"
chmod 600 "$ENV_FILE"
# drop any previous value, then append the new one
grep -v '^RESEND_API_KEY=' "$ENV_FILE" > "$ENV_FILE.tmp" || true
mv "$ENV_FILE.tmp" "$ENV_FILE"
chmod 600 "$ENV_FILE"
printf 'RESEND_API_KEY=%s\n' "$KEY" >> "$ENV_FILE"
echo "Saved RESEND_API_KEY to $ENV_FILE"

read -r -p "Sender address, e.g. 'Psst! <onboarding@resend.dev>' (Enter to keep current/default): " FROM
if [[ -n "$FROM" ]]; then
  grep -v '^EMAIL_FROM=' "$ENV_FILE" > "$ENV_FILE.tmp" || true
  mv "$ENV_FILE.tmp" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  printf 'EMAIL_FROM=%s\n' "$FROM" >> "$ENV_FILE"
  echo "Saved EMAIL_FROM to $ENV_FILE"
fi

if command -v vercel >/dev/null 2>&1 && [[ -d .vercel ]]; then
  read -r -p "Also save it to the linked Vercel project (production + preview)? [y/N] " YES
  if [[ "$YES" =~ ^[Yy]$ ]]; then
    for target in production preview; do
      vercel env rm RESEND_API_KEY "$target" --yes >/dev/null 2>&1 || true
      printf '%s' "$KEY" | vercel env add RESEND_API_KEY "$target" >/dev/null
      if [[ -n "$FROM" ]]; then
        vercel env rm EMAIL_FROM "$target" --yes >/dev/null 2>&1 || true
        printf '%s' "$FROM" | vercel env add EMAIL_FROM "$target" >/dev/null
      fi
      echo "Saved to Vercel ($target)."
    done
    echo "Redeploy for the change to take effect: vercel --prod"
  fi
else
  echo "Tip: to put it on Vercel, run 'vercel link' first and re-run this script,"
  echo "     or add RESEND_API_KEY in Vercel → Project → Settings → Environment Variables."
fi
unset KEY
