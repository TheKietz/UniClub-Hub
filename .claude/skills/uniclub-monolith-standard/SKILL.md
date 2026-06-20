---
name: uniclub-monolith-standard
description: Expert in building Modular Monoliths. Use this to develop features for ANY module (Membership, Operations, Portal) within UniClub Hub.
---

# UniClub Hub Development Standards

## 1. File Structure (File Locations)

- **Entities**: Always located in `UniClub-Hub.Shared/Models/`.
- **Services/DTOs**: Located in the respective `UniClub-Hub.[ModuleName]/` project.
- **Controllers**: Located in `UniClub-Hub.Server/Controllers/[ModuleName]/`.

## 2. Backend Standards

- Strictly prohibit the Repository Pattern; utilize `UniClubDbContext` directly for data access.
- Register services via a `DependencyInjection.cs` file located at the root of each Module.

## 3. Frontend Standards

- Use `Promise.all()` for independent API calls (see `vercel-react-best-practices` → `async-parallel`).
- Avoid boolean props on components; use composition (see `vercel-composition-patterns` → `architecture-avoid-boolean-props`).

## 4. Cross-Module Data Access

When Module A needs data owned by Module B:

- Query the Shared entity directly via UniClubDbContext (read-only).
- Never import or instantiate a Service class from another Module.
- Never create a duplicate DTO — reuse from Shared if it exists.
