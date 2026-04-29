---
name: react-query-api-integration
description: Data fetching, caching, and mutation with TanStack Query (react-query)
  for UniClub Hub frontend. Use when fetching server state, submitting forms to the
  API, or invalidating cached data after mutations. This is the only data-fetching
  approach used in this project — do not use useEffect + fetch or axios directly
  in components.
---

# TanStack Query — API Integration (UniClub Hub)

## When to Use

- Fetching any data from the ASP.NET Core API
- Submitting create/update/delete operations
- Keeping UI in sync after mutations (invalidate + refetch)
- Showing loading and error states without manual `useState`

## When Not to Use

- Client-only state (UI toggles, modal open/close) → use `useState`
- Form state → use `react-hook-form` (see `react-form-validation` skill)
- Realtime updates already pushed via SignalR → update the cache directly (see `aspnetcore-signalr-realtime`)

## Stack

```bash
npm install @tanstack/react-query axios
npm install -D @tanstack/react-query-devtools
```

---

## Workflow

### Step 1: Set up the QueryClient and axios instance

```typescript
// src/lib/api/axios.ts
import axios from "axios";
import toast from "react-hot-toast";  // or your toast library

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api/v1",
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global error handler — show toast for server errors
// Field validation errors (400) are handled per-form via setError (see react-form-validation skill)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const detail = error.response?.data?.detail ?? "An unexpected error occurred";

    if (status === 401) {
      // Token expired — redirect to login
      window.location.href = "/login";
    } else if (status === 403) {
      toast.error("You do not have permission to perform this action");
    } else if (status === 500) {
      toast.error("Server error. Please try again later");
    } else if (status !== 400) {
      // 400 errors are handled by the form — don't show a toast for them
      toast.error(detail);
    }

    return Promise.reject(error);
  }
);
```

```typescript
// src/main.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,   // 2 minutes — data considered fresh
      retry: 1,                    // Retry once on failure
      refetchOnWindowFocus: false, // Disable for internal tools — annoying for forms
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* ... */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
```

---

### Step 2: Define query key constants

Query keys must be centralized — never write raw arrays in components.
This prevents key mismatch when invalidating after mutations.

```typescript
// src/lib/api/queryKeys.ts

export const queryKeys = {
  // Operations module
  tasks: {
    all:            () => ["tasks"] as const,
    byActivity:     (activityId: string) => ["tasks", "activity", activityId] as const,
    detail:         (taskId: string) => ["tasks", taskId] as const,
  },
  activities: {
    all:            () => ["activities"] as const,
    bySprint:       (sprintId: string) => ["activities", "sprint", sprintId] as const,
    detail:         (activityId: string) => ["activities", activityId] as const,
  },
  sprints: {
    all:            () => ["sprints"] as const,
    byClub:         (clubId: string) => ["sprints", "club", clubId] as const,
  },
  // Membership module (read-only from Operations perspective)
  members: {
    byClub:         (clubId: string) => ["members", "club", clubId] as const,
  },
} as const;
```

---

### Step 3: Define typed API functions

Keep API call functions separate from hooks — one file per resource.

```typescript
// src/features/operations/api/tasksApi.ts
import { apiClient } from "@/lib/api/axios";

export interface TaskResponse {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  deadline?: string;
  assignedToMemberId?: string;
  createdAt: string;
}

export interface CreateTaskRequest {
  activityId: string;
  title: string;
  description?: string;
  priority: string;
  deadline?: Date;
  assignedToMemberId?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export const tasksApi = {
  getByActivity: (activityId: string, page = 1, pageSize = 20) =>
    apiClient
      .get<PaginatedResponse<TaskResponse>>(`/operations/tasks`, {
        params: { activityId, page, pageSize },
      })
      .then((r) => r.data),

  getById: (taskId: string) =>
    apiClient
      .get<TaskResponse>(`/operations/tasks/${taskId}`)
      .then((r) => r.data),

  create: (data: CreateTaskRequest) =>
    apiClient
      .post<TaskResponse>("/operations/tasks", data)
      .then((r) => r.data),

  updateStatus: (taskId: string, status: string) =>
    apiClient
      .patch<TaskResponse>(`/operations/tasks/${taskId}/status`, { status })
      .then((r) => r.data),

  delete: (taskId: string) =>
    apiClient.delete(`/operations/tasks/${taskId}`),
};
```

---

### Step 4: Build custom hooks with useQuery and useMutation

```typescript
// src/features/operations/hooks/useTasks.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/queryKeys";
import { tasksApi, type CreateTaskRequest } from "../api/tasksApi";

// Query hook — fetch tasks for an activity
export function useTasksByActivity(activityId: string) {
  return useQuery({
    queryKey: queryKeys.tasks.byActivity(activityId),
    queryFn: () => tasksApi.getByActivity(activityId),
    enabled: !!activityId,  // Don't fetch until activityId is available
  });
}

// Mutation hook — create a task
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaskRequest) => tasksApi.create(data),

    onSuccess: (newTask) => {
      // Invalidate the task list for this activity — triggers a refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.byActivity(newTask.activityId),
      });
    },
    // Global error handling is in the axios interceptor
    // Per-form field errors are handled in the form component via setError
  });
}

// Mutation hook — update task status (used from Kanban board)
export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) =>
      tasksApi.updateStatus(taskId, status),

    // Optimistic update — update UI immediately, roll back on error
    onMutate: async ({ taskId, status }) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all() });

      // Snapshot the previous value for rollback
      const previousTasks = queryClient.getQueriesData({ queryKey: queryKeys.tasks.all() });

      // Optimistically update the cache
      queryClient.setQueriesData(
        { queryKey: queryKeys.tasks.all() },
        (old: { data: { id: string; status: string }[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((t) =>
              t.id === taskId ? { ...t, status } : t
            ),
          };
        }
      );

      return { previousTasks };
    },

    onError: (_error, _variables, context) => {
      // Roll back to snapshot on error
      context?.previousTasks.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },

    onSettled: () => {
      // Always refetch after mutation to sync with server
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all() });
    },
  });
}
```

---

### Step 5: Use hooks in components

```typescript
// src/features/operations/components/TaskList.tsx
import { useTasksByActivity } from "../hooks/useTasks";

export function TaskList({ activityId }: { activityId: string }) {
  const { data, isLoading, isError, error } = useTasksByActivity(activityId);

  // Always handle all three states
  if (isLoading) return <TaskListSkeleton />;
  if (isError)   return <ErrorMessage message={(error as Error).message} />;

  return (
    <ul>
      {data?.data.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </ul>
  );
}
```

---

### Step 6: Parallel queries (required by vercel-react-best-practices async-parallel)

```typescript
// Fetch multiple independent resources in parallel
import { useQueries } from "@tanstack/react-query";

export function useActivityDashboard(activityId: string, clubId: string) {
  const results = useQueries({
    queries: [
      {
        queryKey: queryKeys.activities.detail(activityId),
        queryFn: () => activitiesApi.getById(activityId),
      },
      {
        queryKey: queryKeys.tasks.byActivity(activityId),
        queryFn: () => tasksApi.getByActivity(activityId),
      },
      {
        queryKey: queryKeys.members.byClub(clubId),
        queryFn: () => membersApi.getByClub(clubId),
      },
    ],
  });

  return {
    activity: results[0],
    tasks:    results[1],
    members:  results[2],
    isLoading: results.some((r) => r.isLoading),
  };
}
```

---

## Validation Checklist

- [ ] `QueryClientProvider` wraps the app in `main.tsx`
- [ ] Query keys use `queryKeys` constants — no raw arrays in components
- [ ] API functions are in `api/` files — not inline in hooks
- [ ] Every `useQuery` handles `isLoading`, `isError`, and success states
- [ ] Mutations invalidate relevant queries in `onSuccess`
- [ ] Optimistic updates include `onError` rollback
- [ ] `enabled: !!id` used when query depends on a possibly-undefined value
- [ ] Independent requests use `useQueries` for parallel fetching

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Raw query key arrays in components | Key mismatch on invalidation, cache never cleared | Use `queryKeys` constants file |
| Fetching in `useEffect` + `useState` | No caching, no dedup, manual loading/error state | Use `useQuery` |
| Calling `mutateAsync` without try/catch | Unhandled promise rejection | Wrap in try/catch or use `onError` in mutation options |
| Invalidating too broadly (`queryKeys.tasks.all()`) | Refetches unrelated queries | Invalidate the most specific key that covers affected data |
| No `enabled` guard on dependent queries | Fetches with `undefined` ID, 404 error | Add `enabled: !!id` |
| Showing raw `error.message` to users | Leaks internal details | The axios interceptor already shows a toast — show a generic inline fallback in the component |
