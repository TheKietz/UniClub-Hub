---
trigger: always_on
---

# Integration Standards

1. **Naming Conventions**: Use **PascalCase** for Backend and **camelCase** for Frontend. The AI must automatically convert these cases during data mapping.
2. **Error Handling**:
   - The Backend must return standard `ProblemDetails` responses.
   - The Frontend must implement filters to display error messages to the user via Toast notifications.
3. **Loading States**: Every API call on the Frontend must include a Loading state to prevent duplicate user submissions and improve UX.
