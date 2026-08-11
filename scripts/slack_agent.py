#!/usr/bin/env python3
"""
Slack -> Claude Code -> GitHub Pages.

Say what you want in the agent's Slack channel. Claude makes the change, the
build is verified, and a branch is pushed. React :white_check_mark: on the bot's
proposal to publish it, or :x: to bin it. Nothing reaches
www.sumitgundawar.com without that reaction.

Runs inside GitHub Actions on a schedule. No server, no always-on machine.

All state lives in Slack as reactions, so there is no database or state file:

  on your message      ⏳ working   👀 awaiting your call   🚀 published   ⚠️ failed
  on the bot's reply   ✅ you approve   ❌ you discard      🚀/🗑️ bot handled it
"""

import json
import os
import subprocess
import sys
import urllib.parse
import urllib.request

SLACK_API = "https://slack.com/api/"
BRANCH = "bot/pending"        # one pending change at a time — nothing to track

# Reactions the bot puts on your message.
WORKING = "hourglass_flowing_sand"
AWAITING = "eyes"
SHIPPED = "rocket"
FAILED = "warning"
# Reactions you put on the bot's proposal.
APPROVE = "white_check_mark"
REJECT = "x"
# Reactions the bot puts on its own proposal once it has acted.
DISCARDED = "wastebasket"

# Marks a bot message as a proposal awaiting a decision.
PROPOSAL_MARK = "React :white_check_mark: to publish"

# Claude gets no Bash tool. This script runs git and the build itself, so an
# instruction injected by a web page Claude researched cannot run commands.
CLAUDE_TOOLS = "Read,Edit,Write,Glob,Grep,WebSearch,WebFetch"

SLACK_TOKEN = os.environ["SLACK_BOT_TOKEN"]
CHANNEL = os.environ["SLACK_CHANNEL_ID"]
ALLOWED_USER = os.environ["SLACK_ALLOWED_USER_ID"]
REPO = os.environ["GITHUB_REPOSITORY"]


# --------------------------------------------------------------------------
# Slack
# --------------------------------------------------------------------------

def slack(method, **params):
    req = urllib.request.Request(
        SLACK_API + method,
        data=urllib.parse.urlencode(params).encode(),
        headers={
            "Authorization": f"Bearer {SLACK_TOKEN}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        body = json.loads(resp.read())
    if not body.get("ok"):
        raise RuntimeError(f"slack {method} failed: {body.get('error')}")
    return body


def say(text):
    """Proposals must be top-level messages: conversations.history does not
    return thread replies, so a threaded proposal's reactions are invisible."""
    return slack("chat.postMessage", channel=CHANNEL, text=text)["ts"]


def react(ts, name):
    try:
        slack("reactions.add", channel=CHANNEL, timestamp=ts, name=name)
    except RuntimeError as exc:
        if "already_reacted" not in str(exc):
            raise


def unreact(ts, name):
    try:
        slack("reactions.remove", channel=CHANNEL, timestamp=ts, name=name)
    except RuntimeError:
        pass  # cosmetic only — never block the real work


def reaction_names(msg):
    return {r["name"] for r in msg.get("reactions", [])}


def reacted_by_you(msg, name):
    for r in msg.get("reactions", []):
        if r["name"] == name and ALLOWED_USER in r.get("users", []):
            return True
    return False


def read_channel():
    return slack("conversations.history", channel=CHANNEL, limit=40).get("messages", [])


def find_decision(messages):
    """Newest bot proposal you have reacted to but the bot hasn't acted on."""
    for msg in messages:  # newest first
        if not msg.get("bot_id"):
            continue
        if PROPOSAL_MARK not in (msg.get("text") or ""):
            continue
        if reaction_names(msg) & {SHIPPED, DISCARDED}:
            continue  # already handled
        if reacted_by_you(msg, APPROVE):
            return msg["ts"], "approve"
        if reacted_by_you(msg, REJECT):
            return msg["ts"], "discard"
    return None, None


def find_task(messages):
    """Oldest message of yours the bot has not started on.

    There is no command prefix: in this channel, anything you say is the task.
    """
    handled = {WORKING, AWAITING, SHIPPED, FAILED}
    for msg in reversed(messages):  # oldest first
        if msg.get("bot_id") or msg.get("subtype"):
            continue
        if msg.get("user") != ALLOWED_USER:
            continue
        text = (msg.get("text") or "").strip()
        if not text:
            continue
        if reaction_names(msg) & handled:
            continue
        return msg["ts"], text
    return None, None


# --------------------------------------------------------------------------
# git + build
# --------------------------------------------------------------------------

def git(*args, check=True):
    res = subprocess.run(["git", *args], capture_output=True, text=True)
    if check and res.returncode != 0:
        raise RuntimeError(f"git {' '.join(args)}: {res.stderr.strip()[:300]}")
    return res.stdout.strip()


def build():
    res = subprocess.run(
        ["npm", "run", "build"], capture_output=True, text=True, timeout=900
    )
    return res.returncode == 0, (res.stderr or res.stdout)[-600:]


# --------------------------------------------------------------------------
# Claude
# --------------------------------------------------------------------------

TASK_PROMPT = """You are updating the source of a personal website live at www.sumitgundawar.com.

Repo layout:
- Site content lives in `src/data/content.ts` — prefer editing data there over hardcoding JSX.
- Components are in `src/components/`. Styling is Tailwind v4.
- Vite + React + TypeScript. It must compile with `tsc`.

House voice, follow exactly: dry, precise, confident. No emoji, no exclamation
marks, no marketing buzzwords. Where existing prose leaves the current employer
unnamed, keep it unnamed.

Task from the site owner:
{task}

Rules:
- Make the smallest coherent change that fully does the task.
- Keep TypeScript types correct; do not introduce `any`.
- Do not touch .github/, scripts/, worker/, package.json dependencies, or CNAME files.

You have no shell, and that is deliberate. Do not ask for one, and do not ask
for permission to run anything. After you finish, the surrounding workflow runs
`tsc` and the production build and blocks the change if either fails, so
verification is already covered.

Nobody reads your output until the task is done, so a question ends the run
without an answer. Make the reasonable call and note it instead of asking.

Your final message is posted verbatim to the site owner as the description of
this change, and it is all they see before deciding whether to publish. End with
a short plain-text paragraph covering what you changed and anything they should
know. No preamble, no questions, no offers of further work."""


def run_claude(task):
    res = subprocess.run(
        [
            "claude", "-p", TASK_PROMPT.format(task=task),
            "--output-format", "json",
            "--permission-mode", "acceptEdits",
            "--allowedTools", CLAUDE_TOOLS,
        ],
        capture_output=True, text=True, timeout=1800,
    )
    if res.returncode != 0:
        raise RuntimeError(f"claude exited {res.returncode}: {res.stderr.strip()[:400]}")
    try:
        return json.loads(res.stdout).get("result", "").strip()
    except json.JSONDecodeError:
        return res.stdout.strip()[:600]


# --------------------------------------------------------------------------
# actions
# --------------------------------------------------------------------------

def do_task(task, ts):
    git("fetch", "origin", "main")
    git("checkout", "-B", BRANCH, "origin/main")

    summary = run_claude(task)

    if not git("status", "--porcelain"):
        say(f"No file changes came out of: _{task[:150]}_\nTry rephrasing it.")
        return FAILED

    ok, tail = build()
    if not ok:
        say(f"Build failed, so nothing was pushed.\n```{tail[-400:]}```")
        return FAILED

    git("add", "-A")
    git("commit", "-m", f"{task[:70]}\n\nRequested via Slack.")
    git("push", "--force", "origin", BRANCH)

    diff = f"https://github.com/{REPO}/compare/main...{BRANCH}"
    say(
        f"{summary[:1200]}\n\n"
        f"Build passed. Diff: {diff}\n\n"
        f"{PROPOSAL_MARK}, :x: to discard."
    )
    return AWAITING


def do_approve(proposal_ts):
    git("fetch", "origin", "main", BRANCH)

    # The branch was cut when the task ran, so anything landing on main since
    # then leaves it behind and a fast-forward push would be rejected. Replay it
    # onto current main instead of failing an approval for a change that is fine.
    git("checkout", "-B", "bot/approving", f"origin/{BRANCH}")
    rebase = subprocess.run(
        ["git", "rebase", "origin/main"], capture_output=True, text=True
    )
    if rebase.returncode != 0:
        subprocess.run(["git", "rebase", "--abort"], capture_output=True)
        raise RuntimeError(
            "this change conflicts with main as it now stands — "
            "nothing was published. Ask for it again and it will be rebuilt "
            "against the current site."
        )

    ok, tail = build()
    if not ok:
        raise RuntimeError(
            f"the change no longer builds against current main, so nothing was "
            f"published.\n```{tail[-400:]}```"
        )

    git("push", "origin", "HEAD:refs/heads/main")
    react(proposal_ts, SHIPPED)
    say("Pushed to main. Pages is deploying — live in about two minutes at www.sumitgundawar.com")


def do_discard(proposal_ts):
    git("push", "origin", "--delete", BRANCH, check=False)
    react(proposal_ts, DISCARDED)
    say("Discarded. Nothing was published.")


def main():
    messages = read_channel()

    # A decision you have already made outranks starting new work.
    proposal_ts, decision = find_decision(messages)
    if decision:
        print(f"decision: {decision}")
        try:
            if decision == "approve":
                do_approve(proposal_ts)
            else:
                do_discard(proposal_ts)
        except Exception as exc:  # noqa: BLE001 - report back into Slack
            print(f"error: {exc}", file=sys.stderr)
            react(proposal_ts, DISCARDED)  # stop it being retried forever
            say(f"Could not complete that: {str(exc)[:500]}")
        return

    task_ts, task = find_task(messages)
    if not task:
        print("nothing to do")
        return

    print(f"task: {task[:120]}")
    react(task_ts, WORKING)
    outcome = FAILED
    try:
        outcome = do_task(task, task_ts)
    except Exception as exc:  # noqa: BLE001 - report back into Slack
        print(f"error: {exc}", file=sys.stderr)
        say(f"Failed: {str(exc)[:600]}")
    finally:
        unreact(task_ts, WORKING)
        react(task_ts, outcome)


if __name__ == "__main__":
    main()
