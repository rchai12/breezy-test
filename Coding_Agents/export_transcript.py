"""Convert this project's session logs (.jsonl) into readable Markdown transcripts.

Claude Code sessions go in Coding_Agents/claude/, indexed by claude_transcripts.md.
The Cursor session goes in Coding_Agents/cursor_transcripts.md.
Only prompts and replies are copied, verbatim. Thinking, reasoning and commands are left out.

Usage:
  python export_transcript.py            # export every session of this project
  (as a Claude Code Stop hook, the hook's stdin JSON is read and ignored)
"""
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
INDEX = HERE / "claude_transcripts.md"
SESSIONS_DIR = HERE / "claude"
PROJECT_LOGS = Path.home() / ".claude" / "projects" / "c--Users-digit-take-home-test"
CURSOR_INDEX = HERE / "cursor_transcripts.md"
CURSOR_LOGS = (
    Path.home() / ".cursor" / "projects" / "c-Users-digit-take-home-test" / "agent-transcripts"
)


def read_records(session):
    records = []
    for line in session.read_text(encoding="utf-8").splitlines():
        try:
            records.append(json.loads(line))
        except json.JSONDecodeError:
            continue  # a session still being written can end mid-line
    return records


def is_user_prompt(rec, text):
    return not rec.get("isMeta") and not text.startswith(("<ide_", "<system-reminder>"))


def summarize(records):
    """First timestamp, first real user prompt, and number of user prompts."""
    start, first_prompt, prompts = None, None, 0
    for rec in records:
        if rec.get("type") not in ("user", "assistant") or rec.get("isSidechain"):
            continue
        start = start or rec.get("timestamp")
        content = (rec.get("message") or {}).get("content")
        if isinstance(content, str):
            content = [{"type": "text", "text": content}]
        for block in content or []:
            if rec["type"] == "user" and block.get("type") == "text" and is_user_prompt(rec, block["text"]):
                prompts += 1
                first_prompt = first_prompt or block["text"].strip()
    return start, first_prompt, prompts


def render(session, records):
    out = [
        "# Claude Code Transcript",
        "",
        f"Session: `{session.stem}`  ",
        "Generated automatically from the Claude Code session log by "
        "`export_transcript.py`. Prompts and replies are unedited; Claude's tool calls, "
        "tool output and internal reasoning are left out.",
        "",
    ]
    for rec in records:
        if rec.get("type") not in ("user", "assistant") or rec.get("isSidechain"):
            continue
        msg = rec.get("message") or {}
        content = msg.get("content")
        if isinstance(content, str):
            content = [{"type": "text", "text": content}]
        stamp = rec.get("timestamp", "")[:19].replace("T", " ")

        # Only the user's prompts and Claude's replies; tool calls, tool results,
        # reasoning, IDE context and system-inserted text are left out.
        for block in content or []:
            if block.get("type") != "text":
                continue
            text = block["text"]
            if rec["type"] == "user" and is_user_prompt(rec, text):
                out += [f"---\n\n## 🧑 User  <sub>{stamp} UTC</sub>\n", text, ""]
            elif rec["type"] == "assistant":
                out += [f"### 🤖 Claude  <sub>{stamp} UTC</sub>\n", text, ""]
    return "\n".join(out)


def cursor_prompt(text):
    query = re.search(r"<user_query>\s*(.*?)\s*</user_query>", text, re.S)
    if not query:
        return None
    stamp = re.search(r"<timestamp>\s*(.*?)\s*</timestamp>", text, re.S)
    return (stamp.group(1) if stamp else ""), query.group(1).strip()


def export_cursor():
    """One file of prompts and replies. Tool calls and the text beside them are left out."""
    if not CURSOR_LOGS.is_dir():
        return
    sessions = sorted(CURSOR_LOGS.glob("*/*.jsonl"))
    if not sessions:
        return
    # This project has one Cursor conversation. If more appear, keep the longest.
    session = max(sessions, key=lambda path: path.stat().st_size)
    out = [
        "# Cursor transcript",
        "",
        f"Session: `{session.parent.name}`  ",
        "Generated from the Cursor session log by `export_transcript.py`. "
        "Prompts and replies are unedited. Thinking, reasoning and commands are left out.",
        "",
    ]
    for line in session.read_text(encoding="utf-8").splitlines():
        try:
            rec = json.loads(line)
        except json.JSONDecodeError:
            continue
        content = (rec.get("message") or {}).get("content")
        if isinstance(content, str):
            content = [{"type": "text", "text": content}]
        if not isinstance(content, list):
            continue
        if rec.get("role") == "user":
            texts = [block.get("text", "") for block in content if block.get("type") == "text"]
            prompt = cursor_prompt("\n".join(texts))
            if not prompt or not prompt[1]:
                continue
            stamp = f"  <sub>{prompt[0]}</sub>" if prompt[0] else ""
            out += [f"---\n\n## User{stamp}\n", prompt[1], ""]
        elif rec.get("role") == "assistant":
            if any(block.get("type") == "tool_use" for block in content):
                continue
            texts = [
                block["text"].strip()
                for block in content
                if block.get("type") == "text" and block.get("text", "").strip()
            ]
            if texts:
                out += ["### Assistant\n", "\n\n".join(texts), ""]
    CURSOR_INDEX.write_text("\n".join(out).rstrip() + "\n", encoding="utf-8")


def main():
    if not sys.stdin.isatty():
        sys.stdin.read()  # hook payload; every session is exported regardless
    export_cursor()
    SESSIONS_DIR.mkdir(exist_ok=True)
    rows = []
    for session in PROJECT_LOGS.glob("*.jsonl"):
        records = read_records(session)
        start, first_prompt, prompts = summarize(records)
        if not prompts:
            continue  # nothing the user typed, e.g. an aborted session
        name = f"{start[:10]}_{start[11:16].replace(':', '')}_{session.stem[:8]}.md"
        (SESSIONS_DIR / name).write_text(render(session, records), encoding="utf-8")
        preview = " ".join(first_prompt.split())
        preview = preview[:90] + ("…" if len(preview) > 90 else "")
        rows.append((start, name, prompts, preview.replace("|", "\\|")))

    lines = [
        "# Claude Code Transcripts",
        "",
        "One file per Claude Code session in this project, generated from the session logs by "
        "`export_transcript.py` after every reply. Prompts and replies are unedited; "
        "Claude's tool calls, tool output and internal reasoning are left out.",
        "",
        "| Started (UTC) | Prompts | First prompt | Transcript |",
        "|---|---|---|---|",
    ]
    for start, name, prompts, preview in sorted(rows):
        lines.append(f"| {start[:16].replace('T', ' ')} | {prompts} | {preview} | [{name}](claude/{name}) |")
    INDEX.write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
