---
trigger: always_on
---

# Integration Standards

1. **Naming Conventions**: Use **PascalCase** for Backend and **camelCase** for Frontend. The AI must automatically convert these cases during data mapping.
2. **Error Handling**:
   - The Backend must return standard `ProblemDetails` responses.
   - The Frontend must implement filters to display error messages to the user via Toast notifications.
3. **Loading States**: Every API call on the Frontend must include a Loading state to prevent duplicate user submissions and improve UX.
4. **API Versioning**: All endpoints must be prefixed with `/api/v1/`.
5. **DTO Separation**: Never expose Entity classes directly from API
   endpoints — always use DTOs. Request DTOs and Response DTOs
   must be separate classes.
6. **SignalR Contracts**: Hub method names and event names must be
   defined as constants in `Shared/Constants/` to avoid string mismatch
   between frontend and backend.
