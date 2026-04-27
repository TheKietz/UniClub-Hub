---
trigger: always_on
---

# Rule: Git & GitHub Restrictions

To ensure source code integrity and user control, the Agent must follow these strict restrictions:

### Strictly Forbidden Actions

1. **Git Remote Commands**: Do not execute `git push`, `git pull`, `git fetch`, `git merge`, or `git rebase` to any remote repositories.
2. **Repository Management**: Do not attempt to create, modify, or delete Pull Requests (PRs), Issues, or Releases on GitHub.
3. **GitHub API/CLI**: Do not use tools or scripts to interact with the GitHub API or GitHub CLI (`gh`).
4. **Credential Security**: Do not attempt to read or utilize GitHub Personal Access Tokens (PATs) or SSH Keys stored in the system.

### Permitted Scope

- Operations are limited strictly to the **Local Workspace**.
- The Agent may propose **Commit Messages**, but the final execution of the `git commit` command remains the user's sole authority.
- The Agent may generate `.gitignore` files to assist in local file management upon request.
