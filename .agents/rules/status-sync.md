---
trigger: always_on
---

# Rule: Sync Progress with TODO.md

Whenever a request is made, the Agent MUST:

1. **Read `@TODO.md`** in the root directory to identify ongoing or pending tasks.
2. **Cross-reference** the request with the project structure defined in `@UniClubHub.sln`.
3. **Automate Status Updates**: If a new feature is requested, automatically update the task status to "Doing" within the `TODO.md` file.
