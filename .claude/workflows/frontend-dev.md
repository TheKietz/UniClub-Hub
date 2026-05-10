---
description: Guide the Agent to build a complete UI feature from API integration to component following the Vercel + UniClub Hub standard. Applies to all modules: Membership, Operations, Portal.
---

# Workflow: /frontend-dev [ModuleName] [FeatureName]

> **Examples**:
> `/frontend-dev Operations KanbanBoard`
> `/frontend-dev Membership CreateMemberForm`

---

## Step 0 — Read context before doing anything

- `@project-description.md` → confirm the feature is in the correct module, no cross-scope work
- `@uniclub-monolith-standard` → recall frontend folder structure
- `@architecture.md` → confirm API base URL pattern (`/api/v1/[module]/[resource]`)
- `TODO.md` → update the related task to `[~] Doing`

**Scope check**: Kanban / Task / SignalR features → Operations. Registration forms / member management → Membership. Landing page / CMS → Portal.

---

## Step 1 — Confirm the API contract

Before writing a single line of UI, clarify the API being called:

- Endpoint URL: `GET/POST/PUT/DELETE /api/v1/[module]/[resource]`
- Request shape (body / query params)
- Response shape (field names, types, pagination if applicable)
- Error cases (400 field validation / 403 / 404)

If the backend endpoint does not exist yet → **stop**, tell the user to run `/backend-dev` first.

---

## Step 2 — Define TypeScript types

Create at: `src/features/[module]/types/` or `src/types/` if shared across modules

```typescript
// 1-to-1 mapping with the backend Response DTO
// Backend PascalCase → Frontend camelCase (axios converts automatically if configured)
export interface TaskResponse {
  id: string;
  title: string;
  status: "Todo" | "Doing" | "Done" | "Cancelled";
  priority: "Low" | "Medium" | "High";
  deadline?: string; // ISO 8601 string — use date-fns to parse for display
  createdAt: string;
  assignedToMemberId?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}
```

**Date/time rule** — see `date-timezone-handling`:

- TypeScript type for API dates is always `string`
- Only parse to a `Date` object when formatting for display — use `parseISO()` from `date-fns`
- Never use `new Date(string)` directly on ISO strings with a timezone offset

---

## Step 3 — Build the API layer

Apply skill: **`react-query-api-integration`** (Steps 2–3)

**3a. Add query keys to `src/lib/api/queryKeys.ts`:**

```typescript
export const queryKeys = {
  // ...existing keys...
  [featureName]: {
    all: () => ["[featureName]"] as const,
    detail: (id: string) => ["[featureName]", id] as const,
    // Add context-specific keys if filtering is needed
  },
};
```

**3b. Create the API function file:**

```
src/features/[module]/api/[featureName]Api.ts
```

- Each function calls `apiClient` (the axios instance from `src/lib/api/axios.ts`)
- Return `.then(r => r.data)` — never return raw `AxiosResponse`
- Typed with the Request/Response interfaces from Step 2

**3c. Create custom hooks:**

```
src/features/[module]/hooks/use[FeatureName].ts
```

- `useQuery` for GET — always add `enabled: !!id` when the query depends on a possibly-undefined param
- `useMutation` for POST/PUT/DELETE — `onSuccess` must `invalidateQueries` with the correct key
- Use `useQueries` for multiple independent requests — see `async-parallel` rule

---

## Step 4 — Design the Component Architecture

Apply skill: **`vercel-composition-patterns`**

Before writing code, sketch the component tree:

```
[FeatureName]Page
├── [FeatureName]Header
├── [FeatureName]List / [FeatureName]Board
│   └── [Item]Card  (receives data via props)
└── [FeatureName]CreateModal
    └── [FeatureName]Form
```

**Component rules:**

- Apply `architecture-avoid-boolean-props`: do not use boolean props like `isLoading`, `isEditing`, `isAdmin` to control behavior — use composition or variant patterns instead
- Apply `architecture-compound-components` for complex UI with multiple sub-parts (Modal, Tabs, Dropdown)
- Apply `state-lift-state` if 2+ sibling components need to share state
- Components receive data via props — do not fetch directly inside leaf components

---

## Step 5 — Build the Form (if the feature has create/edit)

Apply skill: **`react-form-validation`**

**5a. Create the zod schema:**

```
src/features/[module]/schemas/[featureName]Schema.ts
```

Schema checklist:

- [ ] All required fields have custom error messages — never rely on zod defaults
- [ ] Date fields use `z.coerce.date()` — never `z.date()`
- [ ] Enum fields use `z.enum([...])` with values matching the backend
- [ ] Cross-field validation uses `.refine()` — never validate cross-field logic in the component

**5b. Form component:**

- `useForm` with `zodResolver`
- Submit button: `disabled={isSubmitting}` — required, prevents double submission
- Backend 400 errors: map to form fields using `mapApiErrorsToForm()` — do not show a toast only

**5c. Edit form:**

- `defaultValues` receives data from `useQuery`
- Date fields: convert ISO string → `datetime-local` format using the `toDatetimeLocal()` helper

---

## Step 6 — Operations module-specific features

Only apply when the feature belongs to the **Operations module**:

**Kanban Board:**
Apply skill: **`kanban-board-react`**

- Use `@dnd-kit/core` — never `react-beautiful-dnd`
- `PointerSensor` with `activationConstraint: { distance: 8 }`
- `DragOverlay` is required — never let the layout collapse during drag
- Optimistic update inside `useUpdateTaskStatus` — no visible lag after drop

**SignalR realtime:**
Apply skill: **`aspnetcore-signalr-realtime`** (Step 6)

- Singleton `HubConnection` — never create a new connection per component
- Event names from `src/constants/signalREvents.ts` — never hardcode strings
- Always clean up with `hub.off()` in the `useEffect` return
- On receiving an event: use `queryClient.setQueryData()` for optimistic cache update, or `invalidateQueries()` for a full refetch

---

## Step 7 — Display date/time

Apply skill: **`date-timezone-handling`** (Frontend section)

- Parse ISO string from API: `parseISO(isoString)` from `date-fns`
- Format for display: use constants from `DATE_FORMATS` — never hardcode format strings
- Overdue deadlines: use `isPast()` to show a warning color
- Relative time ("3 hours ago"): use `formatDistanceToNow()`
- `datetime-local` input: use `toDatetimeLocal()` for display and `fromDatetimeLocal()` for submission

---

## Step 8 — Loading, Error, and Empty states

Every component that fetches data must handle all 3 states — none can be skipped:

```typescript
const { data, isLoading, isError } = useFeatureQuery(id);

if (isLoading) return <FeatureSkeleton />;             // Skeleton, not a full-page spinner
if (isError)   return <ErrorMessage />;                // Inline error, not an alert dialog
if (!data || data.length === 0) return <EmptyState />; // Empty state with a CTA
```

**Loading state**: use a Skeleton component (CSS pulse) — avoid full-page spinners unless the entire UI must be blocked.

---

## Step 9 — Optimization and Accessibility

Apply skills: **`vercel-react-best-practices`**, **`web-design-guidelines`**

**Bundle:**

- [ ] Direct imports only — no barrel file index: `import { Button } from "@/components/ui/Button"` not `from "@/components/ui"`
- [ ] Heavy components (Gantt chart, rich text editor) use lazy loading: `const Gantt = lazy(() => import(...))`

**Re-render:**

- [ ] Never define a component inside another component (`rerender-no-inline-components`)
- [ ] Use `useCallback` for event handlers passed down to child components
- [ ] Hoist static JSX (icons, unchanging labels) outside of the component

**Accessibility:**

- [ ] Every input has an `id` and a matching `<label htmlFor>`
- [ ] Error messages have `role="alert"`
- [ ] Interactive elements have `aria-label` if there is no visible text label
- [ ] Drag-and-drop has a keyboard alternative (Operations module)

---

## Step 10 — Final checklist before marking as complete

- [ ] All types are fully defined — no `any`
- [ ] Query keys use `queryKeys` constants — no raw arrays
- [ ] All 3 states (loading / error / empty) are handled
- [ ] Forms have validation and backend error mapping
- [ ] Date display uses `parseISO` + `date-fns`
- [ ] No `useEffect` + `fetch` directly — use `useQuery`
- [ ] No direct imports between features in different modules
- [ ] `TODO.md` updated: related task → `[x] Done`
