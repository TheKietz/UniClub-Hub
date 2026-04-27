---
trigger: always_on
---

# Global Architecture Enforcement

The AI Agent must comply with the following architectural constraints within this Solution:

### Restrictions

- **DO NOT** create `Models` or `Entities` directories inside specific Module projects.
- **DO NOT** establish direct references between Modules (e.g., the Operations module must not reference the Membership module).

### Permissions

- References are only permitted from a Module to the `Shared` project.
- New Entities may only be created within the `Shared` project following explicit user approval of the schema.
