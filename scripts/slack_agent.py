#!/usr/bin/env python3
"""
Slack -> Claude Code -> GitHub Pages.

Polls one Slack channel for `!site` commands, hands the instruction to Claude
Code inside this repo, verifies the build, and pushes a branch. Nothing reaches
www.sumitgundawar.com until you reply `!site approve`.

Runs inside GitHub Actions on a schedule. No server, no always-on machine.

State lives in Slack itself: a processed command carries a :white_check_mark:
reaction from the bot, so there is no database, cache, or state file to keep in
sync with anything.
"""

import json
import os
import subprocess
import sys
import urllib.parse
import urllib.request

SLACK_API = "https://slack.com/api/"
TRIGGER = "!site"
BRANCH = "bot/pending"          # one pending change at a time — no state to track
DONE = "white_check_mark"
WORKING = "hourglass_flowing_sand"
FAILED = "x"

# Claude gets no Bash tool. This workflow does git and the build itself, so an
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
    """Slack Web API. GET for reads, POST for writes — Slack accepts both as
    form-encoded with the token in the header."""
    url = SLACK_API + method
    data = urllib.parse.urlencode(params).encode()
    req = urllib.request.Request(
        url, data=data,
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


def say(text, thread_ts=None):
    kwargs = {"channel": CHANNEL, "text": text}
    if thread_ts:
        kwargs["thread_ts"] = thread_ts
    slack("chat.postMessage", **kwargs)


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
        pass  # never blocks the actual work


def pending_commands():
    """Unprocessed `!site` commands from the allowed user, oldest first.

    Authorisation is the Slack user ID, not the message text: only that account
    can put a qualifying message in this channel.
    """
    history = slack("conversations.history", channel=CHANNEL, limit=30)
    out = []
    for msg in history.get("messages", []):
        text = (msg.get("text") or "").strip()
        if not text.lower().startswith(TRIGGER):
            continue
        if msg.get("user") != ALLOWED_USER:
            continue
        reactions = {r["name"] for r in msg.get("reactions", [])}
        if DONE in reactions or FAILED in reactions:
            continue
        out.append({"ts": msg["ts"], "body": text[len(TRIGGER):].strip()})
    return list(reversed(out))


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
- Do not touch .github/, scripts/, package.json dependencies, or CNAME files.
- Do not commit; the surrounding workflow handles git.
- Finish with a one-paragraph plain-text summary of what you changed."""


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
# commands
# --------------------------------------------------------------------------

def do_task(cmd, ts):
    git("fetch", "origin", "main")
    git("checkout", "-B", BRANCH, "origin/main")

    summary = run_claude(cmd)

    if not git("status", "--porcelain"):
        say(f"No file changes for: _{cmd[:120]}_\nTry rephrasing.", ts)
        return False

    ok, tail = build()
    if not ok:
        say(f"Build failed, nothing pushed.\n```{tail[-400:]}```", ts)
        return False

    git("add", "-A")
    git("commit", "-m", f"{cmd[:70]}\n\nRequested via Slack.")
    git("push", "--force", "origin", BRANCH)

    link = f"https://github.com/{REPO}/compare/main...{BRANCH}"
    say(f"{summary[:1200]}\n\nBuild passed. Review: {link}\nReply `{TRIGGER} approve` to publish.", ts)
    return True


def do_approve(ts):
    git("fetch", "origin", BRANCH, check=False)
    if not git("rev-parse", "--verify", f"origin/{BRANCH}", check=False):
        say("Nothing pending to approve.", ts)
        return True
    git("push", "origin", f"origin/{BRANCH}:refs/heads/main")
    say("Pushed to main. Pages is deploying — live in about two minutes at www.sumitgundawar.com", ts)
    return True


def do_discard(ts):
    git("push", "origin", "--delete", BRANCH, check=False)
    say("Discarded the pending change.", ts)
    return True


def handle(cmd, ts):
    verb = cmd.split()[0].lower() if cmd else ""
    if verb == "approve":
        return do_approve(ts)
    if verb in ("discard", "cancel"):
        return do_discard(ts)
    say(f"Working on: _{cmd[:150]}_", ts)
    return do_task(cmd, ts)


def main():
    commands = pending_commands()
    if not commands:
        print("nothing to do")
        return

    # One command per run. The next scheduled run picks up the rest, so a slow
    # task can never overlap with the job that follows it.
    job = commands[0]
    ts, cmd = job["ts"], job["body"]
    if not cmd:
        return

    print(f"handling: {cmd[:120]}")
    react(ts, WORKING)
    try:
        ok = handle(cmd, ts)
    except Exception as exc:  # noqa: BLE001 - always report back into Slack
        print(f"error: {exc}", file=sys.stderr)
        say(f"Failed: {str(exc)[:600]}", ts)
        ok = False
    finally:
        unreact(ts, WORKING)
    react(ts, DONE if ok else FAILED)


if __name__ == "__main__":
    main()
