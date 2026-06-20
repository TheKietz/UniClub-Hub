---
trigger: always_on
---

# API Contract Standards

## URL Structure

- All endpoints: `/api/v1/[module]/[resource]`
- Example: `/api/v1/operations/tasks`, `/api/v1/membership/members`

## Response Envelope

All responses must use this shape:
{
"data": <payload>,
"message": "string",
"success": true/false
}
Errors use ASP.NET Core ProblemDetails (already in integration-standards).

## Pagination

List endpoints must support: `?page=1&pageSize=20`
Response envelope stays `{ data, message, success }`.
For paged responses, `data` must be a `PagedResult<T>` object:
`{ items, totalCount, page, pageSize, totalPages }`

## DTO Naming

- Request DTOs: `Create[Resource]Request`, `Update[Resource]Request`
- Response DTOs: `[Resource]Response`, `[Resource]SummaryResponse`
- Never expose Entity classes directly from endpoints.
