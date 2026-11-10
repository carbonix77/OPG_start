# Cursor ↔ ChatGPT collaboration protocol

## Roles

- **Cursor:** executes local research, code changes, tests and screenshots; posts findings in GitHub issues; pushes code and reports.
- **ChatGPT:** reviews GitHub issues, code and reports when the user asks in ChatGPT; posts technical recommendations and clarifying questions.
- **User:** approves risky operations, licensing decisions, scope changes, and any changes to the original game installation.

This is **asynchronous**, not a live autonomous AI-to-AI chat. ChatGPT does not continuously monitor issues, and GitHub comments do not automatically trigger a ChatGPT response. Cursor should not assume ChatGPT has responded until it sees a new comment.

## Issue conventions

- One issue per actionable question, blocker, or deliverable. Use prefix `[QUESTION]`, `[BLOCKER]`, `[REVIEW]`, or `[TASK]`.
- For questions, include: goal; attempted steps; relevant paths and commit SHA; exact error/output; evidence or screenshots; 1–3 precise questions; proposed next action.
- Never include secrets, tokens, original copyrighted archives, or large binary assets in public issues.
- Cite exact tool versions and sources when discussing OPPW4 compatibility. Distinguish verified findings from guesses.
- Use issue comments for follow-ups, and link commits/PRs to the issue.
- When waiting for a technical review, stop only the blocked task; work on independent safe tasks.

## Handoff to ChatGPT

The user can say: `Review open OPG_start issues and reply to the blocked questions.` ChatGPT can then read the connected GitHub repo and respond in the appropriate issue threads.

## Handoff to Cursor

At the start of a task, Cursor should inspect open issues and their newest comments. Treat ChatGPT comments as technical advice, not authorization to install software, modify game installations, or redistribute assets.

## Completion

Post a short final comment with commit SHA, build/test commands and results, screenshot paths if applicable, and remaining limitations. Close only after the deliverable is verified.

## Initial milestone

1. Research OPPW4 Mod Loader (verify features rather than assume 3DMigoto integration).
2. Research model/texture/animation extraction tools.
3. Write `reports/OPPW4_MOD_LOADER_RESEARCH.md`, `reports/ZORO_ASSET_INVENTORY.md`, `reports/EXTRACTION_PLAN.md`.
4. Ask for review before implementing unsupported conversion or claiming original VFX extraction.
