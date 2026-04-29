---
name: react-form-validation
description: Form handling with react-hook-form and zod schema validation for
  UniClub Hub frontend. Use when building any form — task creation, event planning,
  member registration, club settings. Covers validation, error display, loading
  state, and API submission pattern.
---

# React Form Handling — react-hook-form + zod (UniClub Hub)

## When to Use

- Any form that submits data to the backend API
- Forms with validation rules (required fields, length limits, date constraints)
- Multi-field forms where field interactions matter (e.g., end date must be after start date)
- Forms that need loading state to prevent double submission

## When Not to Use

- Single-button actions with no input (use a plain `onClick` handler)
- Read-only data display (no form needed)
- Search/filter inputs that trigger immediate queries (use controlled `useState` + debounce)

## Stack

```bash
npm install react-hook-form zod @hookform/resolvers
```

These are the only form libraries used in UniClub Hub.
Do NOT introduce Formik, Yup, or other alternatives.

---

## Workflow

### Step 1: Define the zod schema

Define the schema in the same file as the form component, or in a separate
`schemas/` file if reused across multiple components.

```typescript
// src/features/operations/schemas/createTaskSchema.ts
import { z } from "zod";

export const createTaskSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less"),

  description: z
    .string()
    .max(2000, "Description must be 2000 characters or less")
    .optional(),

  // Date as string from <input type="datetime-local">, then coerced to Date
  deadline: z.coerce
    .date()
    .min(new Date(), "Deadline must be in the future")
    .optional(),

  priority: z.enum(["Low", "Medium", "High"], {
    errorMap: () => ({ message: "Select a valid priority" }),
  }),

  assignedToMemberId: z.string().uuid("Invalid member").optional(),
});

// Derive the TypeScript type from the schema — single source of truth
export type CreateTaskFormValues = z.infer<typeof createTaskSchema>;
```

**Zod rules for this project:**
- Use `.min(1, ...)` not `.nonempty()` — clearer error message control
- Use `z.coerce.date()` for date inputs (HTML inputs return strings)
- Always provide a custom error message string — never rely on zod defaults
- Use `z.enum()` for status/priority fields — matches backend enum values

---

### Step 2: Build the form component

```typescript
// src/features/operations/components/CreateTaskForm.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createTaskSchema, type CreateTaskFormValues } from "../schemas/createTaskSchema";
import { useCreateTask } from "../hooks/useCreateTask";

interface CreateTaskFormProps {
  activityId: string;
  onSuccess: () => void;
}

export function CreateTaskForm({ activityId, onSuccess }: CreateTaskFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setError,
  } = useForm<CreateTaskFormValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      priority: "Medium",
    },
  });

  const { mutateAsync: createTask } = useCreateTask();

  async function onSubmit(values: CreateTaskFormValues) {
    try {
      await createTask({ activityId, ...values });
      reset();
      onSuccess();
    } catch (error) {
      // Map backend ProblemDetails field errors to form fields
      if (isApiValidationError(error)) {
        mapApiErrorsToForm(error, setError);
      }
      // Global errors are handled by the axios interceptor (Toast)
    }
  }

  return (
    // Never use <form onSubmit={onSubmit}> directly — always wrap with handleSubmit
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <label htmlFor="title">Title</label>
        <input
          id="title"
          type="text"
          {...register("title")}
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? "title-error" : undefined}
        />
        {errors.title && (
          <span id="title-error" role="alert">
            {errors.title.message}
          </span>
        )}
      </div>

      <div>
        <label htmlFor="priority">Priority</label>
        <select id="priority" {...register("priority")}>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
        {errors.priority && <span role="alert">{errors.priority.message}</span>}
      </div>

      <div>
        <label htmlFor="deadline">Deadline</label>
        <input id="deadline" type="datetime-local" {...register("deadline")} />
        {errors.deadline && <span role="alert">{errors.deadline.message}</span>}
      </div>

      {/* isSubmitting prevents double submission automatically */}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create Task"}
      </button>
    </form>
  );
}
```

---

### Step 3: Map backend validation errors to form fields

The backend returns `ProblemDetails` with a `errors` map on validation failure (400).
Map these to form fields so users see inline errors, not just a toast.

```typescript
// src/lib/api/mapApiErrors.ts
import type { UseFormSetError, FieldValues, Path } from "react-hook-form";

interface ProblemDetails {
  errors?: Record<string, string[]>;
}

// Type guard for API validation errors
export function isApiValidationError(error: unknown): error is { data: ProblemDetails } {
  return (
    typeof error === "object" &&
    error !== null &&
    "data" in error &&
    typeof (error as { data: unknown }).data === "object"
  );
}

// Map ProblemDetails.errors to react-hook-form field errors
export function mapApiErrorsToForm<T extends FieldValues>(
  error: { data: ProblemDetails },
  setError: UseFormSetError<T>
): void {
  const apiErrors = error.data?.errors ?? {};

  for (const [field, messages] of Object.entries(apiErrors)) {
    // Backend uses PascalCase, form fields use camelCase
    const formField = field.charAt(0).toLowerCase() + field.slice(1);
    setError(formField as Path<T>, {
      type: "server",
      message: messages[0],  // Show first error message
    });
  }
}
```

---

### Step 4: Handle cross-field validation

Use `.refine()` or `.superRefine()` on the schema — never validate cross-field logic in the component.

```typescript
export const createEventSchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    startDate: z.coerce.date({ required_error: "Start date is required" }),
    endDate: z.coerce.date({ required_error: "End date is required" }),
    maxParticipants: z.number().int().positive().optional(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "End date must be after start date",
    path: ["endDate"],  // Which field the error appears on
  });
```

---

### Step 5: Edit forms — populate with existing data

```typescript
// For edit forms, pass existing data as defaultValues
export function EditTaskForm({ task, onSuccess }: { task: Task; onSuccess: () => void }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<UpdateTaskFormValues>({
      resolver: zodResolver(updateTaskSchema),
      defaultValues: {
        title:       task.title,
        description: task.description ?? "",
        priority:    task.priority,
        // Convert ISO string to datetime-local format for the input
        deadline:    task.deadline
          ? new Date(task.deadline).toISOString().slice(0, 16)
          : undefined,
      },
    });

  // ... same submit pattern as create form
}
```

---

## Validation Checklist

- [ ] Schema defined with zod, type inferred via `z.infer<typeof schema>`
- [ ] `zodResolver` passed to `useForm`
- [ ] Form uses `handleSubmit(onSubmit)` — not raw `onSubmit`
- [ ] Submit button disabled while `isSubmitting` is true
- [ ] All error messages are custom strings, not zod defaults
- [ ] Backend 400 errors are mapped to form fields via `setError`
- [ ] Cross-field validation lives in the schema `.refine()`, not in the component
- [ ] Date inputs use `z.coerce.date()` to handle string-to-Date conversion

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| `<form onSubmit={onSubmit}>` directly | Bypasses react-hook-form's validation pipeline | Always use `handleSubmit(onSubmit)` |
| Controlling inputs with `useState` alongside `register` | Creates conflicting state — inputs flicker | Use either controlled (`Controller`) or uncontrolled (`register`), not both |
| Showing only a toast for 400 errors | User doesn't know which field is wrong | Map `ProblemDetails.errors` to form fields with `setError` |
| `z.date()` on a datetime-local input | HTML returns a string; `z.date()` fails | Use `z.coerce.date()` |
| Not disabling submit on `isSubmitting` | User can submit multiple times | Always `disabled={isSubmitting}` on the submit button |
