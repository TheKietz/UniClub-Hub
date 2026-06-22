---
trigger: always_on
---

# Testing Standards

## What to Test

- Service layer (business logic): unit tests, mock UniClubDbContext via EF InMemory or Respawn.
- API endpoints: integration tests using WebApplicationFactory.
- Frontend: component tests for form validation and state logic only.

## What NOT to Test

- DTOs, simple mappings, or EF entity configurations.
- Controller routing (covered by integration tests).

## Test Project Location

- `UniClub-Hub.Tests/` at solution root.
- Mirror module structure: `Tests/Operations/`, `Tests/Membership/`, `Tests/Portal/`.

## Database Isolation

- Each test must run against an isolated state.
- Use Respawn to reset DB between tests, NOT EF InMemory
  (InMemory doesn't enforce constraints and hides real bugs).

## Naming Convention

[MethodName]_[Scenario]_[ExpectedResult]
Example: CreateTask_WithInvalidDeadline_ReturnsBadRequest
