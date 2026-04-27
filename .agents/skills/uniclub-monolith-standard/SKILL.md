---
name: uniclub-monolith-standard
description: Expert in building Modular Monoliths. Use this to develop features for ANY module (Membership, Operations, Portal) within UniClub Hub.
---

# UniClub Hub Development Standards

## 1. File Structure (File Locations)

- **Entities**: Always located in `UniClubHub.Shared/Models/` or `UniClubHub.Shared/Entities/`.
- **Services/DTOs**: Located in the respective `UniClubHub.[ModuleName]/` project.
- **Controllers**: Located in `UniClubHub.API/Controllers/[ModuleName]/`.

## 2. Backend Standards

- Strictly prohibit the Repository Pattern; utilize `UniClubDbContext` directly for data access.
- Register services via a `DependencyInjection.cs` file located at the root of each Module.

## 3. Frontend Standards (Integration with Vercel Skills)

- Implement `async-parallel` (SKILL1) for efficient data fetching from APIs.
- Apply the `architecture-avoid-boolean-props` (SKILL) principle when designing UI components to ensure scalability.
