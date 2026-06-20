---
trigger: always_on
---

# Rule: Sync Progress with TODO.md

1. At the start of each session, attempt to read `TODO.md`.
   If the file does not exist, notify the user and skip sync.
2. Cross-reference the request with `UniClub-Hub.sln` to confirm
   the correct project scope before writing any code.
3. Only update task status in `TODO.md` when a feature is
   **fully completed** (not just started). Use status values:
   `[ ] Todo` → `[~] Doing` → `[x] Done`.
4. Do NOT modify TODO.md for minor fixes, refactors, or bug fixes
   that are not listed as discrete tasks.
