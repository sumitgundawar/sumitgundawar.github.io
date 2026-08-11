# Slack site agent — setup

Say what you want in the agent's Slack channel. A GitHub Action runs Claude Code
against this repo, verifies the build, and pushes a branch. React ✅ on the
bot's proposal and it goes live at www.sumitgundawar.com.

There is no command prefix: in that channel, anything you say is the task. Keep
it for commands only — a stray note becomes a build.

No server, no always-on laptop, nothing billed beyond your Claude subscription.

Do **Phase 1** first and confirm it works end to end. Phase 2 only makes it faster.

---

# Phase 1 — get it working (5-minute latency)

## 1. Mint a Claude token

```sh
claude setup-token
```

Copy what it prints. This is what keeps the whole thing free — Claude Code in CI
authenticates as your subscription instead of metered API billing.

## 2. Create the Slack app

1. <https://api.slack.com/apps> → **Create New App** → **From scratch**.
2. Name it (e.g. `site-agent`), pick your new workspace, create.
3. **OAuth & Permissions** → scroll to **Bot Token Scopes** → **Add an OAuth Scope**,
   add exactly these five:

   | Scope | Why |
   |---|---|
   | `channels:history` | read your commands |
   | `chat:write` | reply to you |
   | `reactions:read` | see which commands it already handled |
   | `reactions:write` | mark them handled |
   | `channels:read` | resolve the channel |

4. Scroll **up** → **Install to Workspace** → Allow.
5. Copy the **Bot User OAuth Token** (starts `xoxb-`).
6. While you're here: **Basic Information** → **App Credentials** → copy the
   **Signing Secret** too. Phase 2 needs it; save yourself the second trip.

## 3. Make the channel and invite the bot

In Slack, create a channel — `#site` is fine — then in it:

```
/invite @site-agent
```

The bot must be a member or it cannot read your commands.

## 4. Collect two IDs

- **Channel ID** — click the channel name → scroll to the bottom of the popup →
  `C…`
- **Your member ID** — your avatar → Profile → ⋮ → **Copy member ID** → `U…`

## 5. Add four GitHub secrets

GitHub → your repo → **Settings** → **Secrets and variables** → **Actions** →
**New repository secret**:

| Secret | Value |
|---|---|
| `CLAUDE_CODE_OAUTH_TOKEN` | from step 1 |
| `SLACK_BOT_TOKEN` | `xoxb-…` |
| `SLACK_CHANNEL_ID` | `C…` |
| `SLACK_ALLOWED_USER_ID` | `U…` |

`SLACK_ALLOWED_USER_ID` is the authorisation boundary: the agent ignores every
message from anyone else, so adding people to the channel never gives them the
ability to publish to your site.

## 6. Test it

Push this branch. Then in `#site`:

```
add a two-line description to each article explaining why it is worth reading
```

Don't wait for the cron on the first run — **Actions → Slack site agent → Run
workflow**. The bot reacts ⏳ on your message while it works, then posts what it
changed with a diff link. React ✅ on that message to publish, or ❌ to bin it.

---

# Phase 2 — make it instant (optional)

Phase 1 polls every 5 minutes, and GitHub's cron often runs late. The Worker in
`worker/` turns that into a near-instant trigger. It carries no payload — it just
tells the Action "wake up and check Slack now" — so the polling fallback keeps
working if the Worker ever goes down.

## 1. Create a GitHub token for the Worker

GitHub → Settings → Developer settings → **Fine-grained tokens** → Generate new:

- Repository access: **only this repo**
- Permissions: **Contents → Read and write** (this is what `repository_dispatch`
  requires)

## 2. Fill in the config and deploy

Edit `worker/wrangler.jsonc` and set `SLACK_CHANNEL_ID` and
`SLACK_ALLOWED_USER_ID` to the same values from Phase 1. Then:

```sh
cd worker
npm install
npx wrangler secret put SLACK_SIGNING_SECRET   # from Phase 1 step 2.6
npx wrangler secret put GITHUB_TOKEN           # from just above
npx wrangler deploy
```

Copy the deployed URL (`https://site-agent-relay.<subdomain>.workers.dev`).

## 3. Point Slack at it

In your Slack app → **Event Subscriptions**:

1. Toggle **Enable Events** on.
2. **Request URL**: paste the Worker URL. Slack immediately sends a challenge —
   the Worker answers it, and you should see **Verified**.
3. **Subscribe to bot events** → add **both**:
   - `message.channels` — your task messages
   - `reaction_added` — your ✅ / ❌ decisions

   Miss the second one and approvals still work, but wait for the next cron tick
   instead of firing immediately.
4. **Save Changes**, then reinstall the app if Slack prompts you to.

Now both commands and approvals fire within a second or two.

---

# Reference

## How you drive it

| You do | Effect |
|---|---|
| Send any message | Claude makes the change, builds it, pushes `bot/pending`, posts a proposal |
| React ✅ on the proposal | Fast-forwards `main` — Pages deploys, live in ~2 min |
| React ❌ on the proposal | Deletes the pending branch, publishes nothing |

## Reactions the bot uses

All state lives in these — there is no database or state file.

| On your message | Meaning |
|---|---|
| ⏳ | working on it |
| 👀 | proposal posted, waiting on you |
| 🚀 | published |
| ⚠️ | failed — the bot explains why in the channel |

## Things worth knowing

- **Nothing publishes without you.** The agent only ever pushes to `bot/pending`;
  `main` moves solely on your ✅ reaction.
- **One pending change at a time.** A new task force-updates
  `bot/pending`, discarding an unapproved one. Decide before starting the next.
- **One command per run**, oldest first, and runs never overlap (`concurrency` in
  the workflow). Queue several and they drain over successive runs.
- **Claude has no Bash tool here** — file edits and web research only. The workflow
  runs git and the build itself, so a prompt injected into a page Claude reads
  while researching cannot execute commands.
- **The build is the safety gate.** If `npm run build` fails, nothing is pushed and
  the bot reports the error instead.
- **Scheduled workflows auto-disable after 60 days** of no repo activity. Publishing
  regularly keeps it alive; otherwise re-enable in the Actions tab.

## If something misbehaves

| Symptom | Likely cause |
|---|---|
| Bot never reacts | Not invited to the channel, or `SLACK_CHANNEL_ID` wrong |
| `not_in_channel` in the Action log | Run `/invite @site-agent` |
| `missing_scope` | A scope was skipped in step 2.3 — add it and **reinstall** the app |
| Messages ignored silently | `SLACK_ALLOWED_USER_ID` is not your member ID |
| Slack won't verify the Worker URL | `SLACK_SIGNING_SECRET` mismatch — re-put the secret |
