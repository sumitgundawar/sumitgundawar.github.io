#!/usr/bin/env python3
"""
Slack -> Claude Code -> GitHub Pages.

Say what you want in the agent's Slack channel. Claude makes the change, the
build is verified, and a branch is pushed. React :white_check_mark: on the bot's
proposal to publish it, or :x: to bin it. Nothing reaches
www.sumitgundawar.com without that reaction.

Questions work too — ask one and you get an answer back rather than a change.

Runs inside GitHub Actions on a schedule. No server, no always-on machine.

All state lives in Slack as reactions, so there is no database or state file:

  on your message      ⏳ working   👀 awaiting your call   💬 answered   ⚠️ failed
  on the bot's reply   ✅ you approve   ❌ you discard      🚀/🗑️ bot handled it
"""

import json
import os
import re
import subprocess
import sys
import urllib.parse
import urllib.request
from datetime import datetime

SLACK_API = "https://slack.com/api/"
BRANCH_PREFIX = "bot/"

# Words that mean "put the site back", not "make me a change".
UNDO_WORDS = {"revert", "undo", "rollback", "roll back", "revert last", "undo last"}

# Reactions the bot puts on your message.
WORKING = "hourglass_flowing_sand"
AWAITING = "eyes"
ANSWERED = "speech_balloon"
SHIPPED = "rocket"
FAILED = "warning"
# Reactions you put on the bot's proposal.
APPROVE = "white_check_mark"
REJECT = "x"
# Reactions the bot puts on its own proposal once it has acted.
DISCARDED = "wastebasket"

# Marks a bot message as a proposal awaiting a decision, and records which
# branch it is for — proposals are the only place that mapping is stored.
PROPOSAL_MARK = "React :white_check_mark: to publish"
BRANCH_MARK = "branch:"

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


SLACK_LIMIT = 3500  # Slack hard-truncates around 4000; leave headroom.


def split_for_slack(text, limit=SLACK_LIMIT):
    """Break long text on paragraph, then line, then character boundaries.

    Truncating is the wrong trade here: the summary is the only thing seen
    before approving, so losing its end loses the caveats.
    """
    if len(text) <= limit:
        return [text]
    chunks, current = [], ""
    for para in text.split("\n\n"):
        if len(para) > limit:  # a single paragraph too big to fit
            if current:
                chunks.append(current)
                current = ""
            for i in range(0, len(para), limit):
                chunks.append(para[i : i + limit])
            continue
        candidate = f"{current}\n\n{para}" if current else para
        if len(candidate) > limit:
            chunks.append(current)
            current = para
        else:
            current = candidate
    if current:
        chunks.append(current)
    return chunks


def say(text):
    """Proposals must be top-level messages: conversations.history does not
    return thread replies, so a threaded proposal's reactions are invisible.

    Returns the ts of the last message sent — for a split proposal that is the
    part carrying the diff link and the react-to-publish line.
    """
    ts = None
    for chunk in split_for_slack(text):
        ts = slack("chat.postMessage", channel=CHANNEL, text=chunk)["ts"]
    return ts


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
    """A run only ever sees this window, so anything that scrolls out of it is
    never processed. 200 keeps a busy evening safely inside one page."""
    return slack("conversations.history", channel=CHANNEL, limit=200).get("messages", [])


def branch_in(text):
    """Each proposal names its own branch, so several can be open at once and a
    decision always applies to the change you are actually looking at."""
    for line in (text or "").splitlines():
        line = line.strip()
        if line.lower().startswith(BRANCH_MARK):
            name = line[len(BRANCH_MARK):].strip().strip("`")
            if name.startswith(BRANCH_PREFIX):
                return name
    return None


def find_decision(messages):
    """Newest bot proposal you have reacted to but the bot hasn't acted on."""
    for msg in messages:  # newest first
        if not msg.get("bot_id"):
            continue
        text = msg.get("text") or ""
        if PROPOSAL_MARK not in text:
            continue
        if reaction_names(msg) & {SHIPPED, DISCARDED}:
            continue  # already handled
        branch = branch_in(text)
        if not branch:
            continue  # pre-dates per-branch proposals; nothing safe to act on
        if reacted_by_you(msg, APPROVE):
            return msg["ts"], branch, "approve"
        if reacted_by_you(msg, REJECT):
            return msg["ts"], branch, "discard"
    return None, None, None


def find_task(messages):
    """Oldest message of yours the bot has not started on.

    There is no command prefix: in this channel, anything you say is the task.
    """
    # Every outcome must appear here. A missing one means the message still
    # looks untouched and gets worked again on the next run, forever.
    handled = {WORKING, AWAITING, ANSWERED, SHIPPED, FAILED}
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

def trigger_deploy():
    """Ask GitHub Pages to rebuild.

    A push made with GITHUB_TOKEN deliberately does not start other workflows —
    GitHub suppresses those events to prevent recursion — so deploy.yml never
    sees our push to main and the site silently stays on the previous build.
    workflow_dispatch is one of only two events that always create a run, even
    from GITHUB_TOKEN, so ask for the deploy explicitly instead.
    """
    token = os.environ.get("GH_API_TOKEN")
    if not token:
        raise RuntimeError("GH_API_TOKEN missing — pushed to main but could not deploy")
    req = urllib.request.Request(
        f"https://api.github.com/repos/{REPO}/actions/workflows/deploy.yml/dispatches",
        data=json.dumps({"ref": "main"}).encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "User-Agent": "site-agent",
            "Content-Type": "application/json",
        },
    )
    urllib.request.urlopen(req, timeout=20)  # 204 on success


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

Message from the site owner:
{task}

This may be a request to change the site, or it may be a question about it.
If it is a question, answer it from the code and change nothing — an answer
is a complete response, and editing files to satisfy a question is wrong.

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

Your final message is posted verbatim into Slack and read on a phone. It is all
the site owner sees before deciding whether to publish, so write it for that
moment.

Keep it under roughly 500 characters — two or three sentences, plain text, no
headings or bullets. Lead with what actually changed, then anything surprising
or worth a second look: a judgement call you made, something you touched that
was not asked for, something you could not do.

Do not walk through the change file by file or restate the diff — the diff is
linked next to your message and carries the detail. If you answered a question
rather than changing anything, answer it directly in the same budget and stop.

No preamble, no questions, no offers of further work."""


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

def slugify(text, limit=32):
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug[:limit].rstrip("-") or "change"


def do_task(task, ts):
    branch = f"{BRANCH_PREFIX}{slugify(task)}-{datetime.now():%m%d-%H%M%S}"
    git("fetch", "origin", "main")
    git("checkout", "-B", branch, "origin/main")

    answer = run_claude(task)

    # No edits usually means you asked a question rather than requested a
    # change. Claude has already answered it, so pass that on instead of
    # treating a perfectly good question as a failed task.
    if not git("status", "--porcelain"):
        say(answer or f"Nothing to change for: _{task[:150]}_")
        return ANSWERED

    ok, tail = build()
    if not ok:
        say(f"Build failed, so nothing was pushed.\n```{tail[-400:]}```")
        return FAILED

    git("add", "-A")
    git("commit", "-m", f"{task[:70]}\n\nRequested via Slack.")
    git("push", "--force", "origin", branch)

    diff = f"https://github.com/{REPO}/compare/main...{branch}"
    say(
        f"{answer}\n\n"
        f"Build passed. Diff: {diff}\n"
        f"{BRANCH_MARK} `{branch}`\n\n"
        f"{PROPOSAL_MARK}, :x: to discard."
    )
    return AWAITING


def do_approve(proposal_ts, branch):
    git("fetch", "origin", "main", branch)

    # The branch was cut when the task ran, so anything landing on main since
    # then leaves it behind and a fast-forward push would be rejected. Replay it
    # onto current main instead of failing an approval for a change that is fine.
    git("checkout", "-B", "bot/approving", f"origin/{branch}")
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
    git("push", "origin", "--delete", branch, check=False)
    trigger_deploy()
    react(proposal_ts, SHIPPED)
    say(
        "Pushed to main. Pages is deploying — live in about two minutes at "
        "www.sumitgundawar.com\n\nSay `undo` if it is not right."
    )


def do_discard(proposal_ts, branch):
    git("push", "origin", "--delete", branch, check=False)
    react(proposal_ts, DISCARDED)
    say("Discarded. Nothing was published.")


def do_undo():
    """Revert the most recent change this agent published.

    Deliberately limited to the agent's own commits: reverting whatever happens
    to be at the head of main could undo unrelated work that never went through
    this loop.
    """
    git("fetch", "origin", "main")
    git("checkout", "-B", "bot/undoing", "origin/main")

    sha = git("log", "--format=%H", "--grep", "Requested via Slack.", "-1")
    if not sha:
        say("Nothing to undo — no change published through Slack yet.")
        return ANSWERED

    subject = git("log", "--format=%s", "-1", sha)
    revert = subprocess.run(
        ["git", "revert", "--no-edit", sha], capture_output=True, text=True
    )
    if revert.returncode != 0:
        subprocess.run(["git", "revert", "--abort"], capture_output=True)
        raise RuntimeError(
            f"could not undo _{subject}_ cleanly — the site has changed since. "
            f"Nothing was touched."
        )

    ok, tail = build()
    if not ok:
        raise RuntimeError(f"undoing that does not build, so nothing changed.\n```{tail[-400:]}```")

    git("push", "origin", "HEAD:refs/heads/main")
    trigger_deploy()
    say(f"Undone: _{subject}_\n\nPages is redeploying — back in about two minutes.")
    return ANSWERED


def main():
    messages = read_channel()

    # A decision you have already made outranks starting new work.
    proposal_ts, branch, decision = find_decision(messages)
    if decision:
        print(f"decision: {decision} on {branch}")
        try:
            if decision == "approve":
                do_approve(proposal_ts, branch)
            else:
                do_discard(proposal_ts, branch)
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
        if task.strip().lower().rstrip(".!?") in UNDO_WORDS:
            outcome = do_undo()
        else:
            outcome = do_task(task, task_ts)
    except Exception as exc:  # noqa: BLE001 - report back into Slack
        print(f"error: {exc}", file=sys.stderr)
        say(f"Failed: {str(exc)[:600]}")
    finally:
        unreact(task_ts, WORKING)
        react(task_ts, outcome)


if __name__ == "__main__":
    main()
