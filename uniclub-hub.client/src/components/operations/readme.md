# Operation Module Documentation

The Operation module follows a **Feature-based Architecture** where all related components, hooks, services, and API definitions are isolated within the `src/components/operations` directory. This promotes modularity, maintainability, and scalability.

## Directory Structure

src/components/operations/
├── components/
│ ├── ClubCreateForm.tsx // Form tạo mới CLB
│ ├── ClubEditForm.tsx // Form chỉnh sửa thông tin CLB
│ ├── ClubDetails.tsx // Chi tiết quản lý nội bộ CLB
│ └── ClubList.tsx // Danh sách CLB dành cho Admin
├── hooks/
│ └── useClubOperations.ts // Logic CRUD cho CLB
├── services/
│ ├── operation.api.ts // Định nghĩa Endpoint API (POST/PUT/DELETE)
│ └── operation.types.ts // Interface: Club, CreateClubDto, v.v.
├── pages/
│ └── OperationPage.tsx // Page quản trị tập trung
└── utils/
└── getOperationStatusIcon.ts

### 1. Components

Container components that handle UI rendering and user interactions.

- **`ClubCreateForm.tsx`**: Displays a single club join request with approval/rejection actions.
- **`ClubEditForm.tsx`**: Renders a table of pending join requests for club administrators.
- **`ClubDetails.tsx`**: Lists all members of a specific club with their roles and status.
- **`ClubList.tsx`**: Displays the current user's membership card and status.

### 2. Hooks

Custom React hooks for state management and data fetching.

- **`useClubOperations.ts`**: A comprehensive hook that:
  - Fetches club membership data for the current user.
  - Fetches pending join requests for the club.
  - Provides functions to approve or reject join requests.
  - Handles loading, error, and success states.
  - Exposes `memberStatus`, `pendingRequests`, `isLoading`, `error`, `approveRequest`, and `rejectRequest`.

### 3. Services

API client layer for data operations.

- **`operation.types.ts`**: TypeScript interfaces and enums for operation-related data.
  - `OperationType` enum: `Pending`, `Member`, `Admin`, `Banned`.
  - `Operation` interface: Represents a user's operation in a club.
  - `JoinRequest` interface: Represents a pending request to join a club.

- **`operation.api.ts`**: API endpoint definitions for operation operations.
  - `getClubOperations(clubId: string)`: Retrieves the current user's operation in a club.
  - `getClubJoinRequests(clubId: string)`: Retrieves pending join requests for a club.
  - `approveJoinRequest(clubId: string, requestId: string)`: Approves a join request.
  - `rejectJoinRequest(clubId: string, requestId: string)`: Rejects a join request.

### 4. Pages

Page-level components that integrate the feature components.

- **`OperationPage.tsx`**: The main page for the Operation module. It orchestrates the different components to provide a complete operation management interface.

### 5. Utils

Helper functions for common utilities.

- **`getOperationStatusIcon.ts`**: Returns appropriate icons based on operation status.

## Data Flow

1. **Initialization**: The `OperationPage` uses `useClubOperations` hook to fetch data.
2. **Data Fetching**: The hook calls `operation.api` endpoints to retrieve operation information and join requests.
3. **State Management**: The hook manages `memberStatus`, `pendingRequests`, `isLoading`, and `error` states.
4. **User Interaction**: Users can interact with components like `ClubJoinRequest` to approve or reject requests.
5. **API Calls**: User actions trigger API calls via the hook, which updates the data and state.

## Usage Example

```typescript
// In a React component within the membership module
import { useClubMembership } from "./hooks/useClubMembership";

function MyComponent({ clubId }: { clubId: string }) {
  const {
    memberStatus,
    pendingRequests,
    isLoading,
    error,
    approveRequest,
    rejectRequest,
  } = useClubMembership(clubId);

  // ... use the data in your component
}
```

## Benefits of this Architecture

- **Modularity**: Easy to find and modify membership-related code.
- **Reusability**: Components and hooks can be reused across different parts of the application.
- **Separation of Concerns**: Clear boundaries between UI, logic, and data layers.
- **Testability**: Individual components and services can be tested in isolation.
- **Scalability**: Easy to add new features to the membership module without affecting other parts of the application.

## Folder Structure Summary

- **`components/`**: UI components for displaying and interacting with operation data.
- **`hooks/`**: Custom React hooks for state management and data fetching logic.
- **`services/`**: API client implementations and type definitions.
- **`pages/`**: Page-level components that integrate the feature components.
- **`utils/`**: Helper functions and utilities.
