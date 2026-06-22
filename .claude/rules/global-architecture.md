---
trigger: always_on
---

# Global Architecture Enforcement

The AI Agent must comply with the following architectural constraints within this Solution:

### Restrictions

- DO NOT create `Models`, `Entities`, or `DTOs` directories
  inside specific Module projects (Operations, Portal, Membership).
- DO NOT reference Module projects from other Module projects in `.csproj`.
- DO NOT duplicate Entity classes across modules —
  always import from `UniClub-Hub.Shared`.
- Cross-module communication must go through the Shared project
  or via API contracts (DTOs in Shared), never direct object passing.

### Permissions

- References are only permitted from a Module to the `Shared` project.
- New Entities may only be created within the `Shared` project following explicit user approval of the schema.
