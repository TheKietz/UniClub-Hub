---
trigger: always_on
---

# Database Safety Rules

The AI Agent must strictly adhere to the following data-tier protocols:

1. **Authority Limitation**: The AI is STRICTLY PROHIBITED from directly modifying any files within the `UniClubHub.Shared/Entities/` directory.
2. **Approval Workflow**:
   - **Step 1**: Propose the schema (table/column structure) within the chat interface.
   - **Step 2**: Await explicit confirmation ("Approve" or "Agree") before proceeding.
3. **Execution Restriction**: Never execute the `dotnet ef database update` command. The Agent may only suggest the appropriate Migration commands for the user to execute manually.
