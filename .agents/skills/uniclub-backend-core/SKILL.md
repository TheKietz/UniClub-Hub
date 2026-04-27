---
name: uniclub-backend-core
description: Expert in Modular Monolith architecture for the UniClub Hub project. Use this when writing C# code, designing APIs, or handling Backend business logic.
---

# UniClub Backend Skill

## Architectural Principles (Modular Monolith)

- **Shared Project**: Contains all Entities, Migrations, and the `UniClubDbContext`.
- **Module Projects**: Contain internal Services, DTOs, and Interfaces.
- **API Project**: Strictly for Controllers, Middleware, and Startup configurations.

## C# Coding Standards

- **No Repository Pattern**: Use `UniClubDbContext` directly within the Service layer.
- **DTOs**: Always utilize DTOs (Data Transfer Objects) for receiving and returning data through the API.
- **Dependency Injection**: Register services within the `DependencyInjection.cs` file of each module using Extension Methods.
