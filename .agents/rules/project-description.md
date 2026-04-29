---
trigger: always_on
---

# Rule: Core Project Knowledge

1. **Functional Alignment**: Always reference `@project-description.md` to ensure generated code aligns with the specific functional requirements of each sub-project.
2. **Scope Isolation**: Strictly prevent functional overlap between the three sub-projects (e.g., Sub-project 2 must not implement the Member Management features assigned to Sub-project 1).
3. **Sub-project Boundaries** (quick reference):
   - Sub-project 1 (Membership): Club info, org structure,
     member lifecycle, KPI, RBAC, shared modules.
   - Sub-project 2 (Operations): Activities, events, tasks,
     sprints, Kanban/Gantt, workload, realtime via SignalR.
   - Sub-project 3 (Portal): Public landing page, CMS,
     registration form, analytics, SEO.
