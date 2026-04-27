# Portal Module Documentation

The Portal module follows a **Feature-based Architecture** where all related components, hooks, services, and API definitions are isolated within the `src/components/portal` directory. This promotes modularity, maintainability, and scalability.

## example

## Directory Structure

src/components/portal/
├── components/
│ ├── PortalClubList.tsx  
│ ├── PortalClubDetails.tsx  
│ ├── PortalClubCreateForm.tsx
│ └── PortalEventSection.tsx  
├── hooks/
│ └── usePortalData.ts  
├── services/
│ ├── portal.api.ts  
│ └── portal.types.ts
├── pages/
│ └── PortalPage.tsx  
└── utils/
└── getPortalLayoutHelper.ts

### 1. Components

Container components that handle UI rendering and user interactions.

- **`PortalClubList.tsx`**: Displays a list of active clubs with a visually appealing interface (Card view) to help users easily search and join.
- **`PortalClubDetails.tsx`**: Provides an overview of a club's goals, vision, and typical activities for the public.
- **`PortalClubCreateForm.tsx`**: An interface for users who want to submit a proposal to establish a new club to the system.

### 2. Hooks

Custom React hooks for state management and data fetching.

- **`usePortalData.ts`**: A comprehensive hook that:
  - Fetches club data for the current user.
  - Handles loading, error, and success states.
  - Exposes `memberStatus`, `isLoading`, `error`.

### 3. Services

API client layer for data operations.

- **`portal.types.ts`**: TypeScript interfaces and enums for portal-related data.

- **`portal.api.ts`**: API endpoint definitions for portal operations.
  - `getClubOperations(clubId: string)`: Retrieves the current user's operation in a club.

### 4. Pages

Page-level components that integrate the feature components.

- **`PortalPage.tsx`**: The main page for the Portal module. It orchestrates the different components to provide a complete portal management interface.

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
