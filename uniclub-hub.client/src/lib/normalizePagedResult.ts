import type { PagedResult } from '@/components/membership/services/admin.types'

/** Accept legacy array responses or paged `{ items, totalCount, ... }` envelopes. */
export function normalizePagedResult<T>(
  data: PagedResult<T> | T[] | null | undefined,
): PagedResult<T> {
  if (!data) return { items: [], totalCount: 0, page: 1, pageSize: 0, totalPages: 0 }
  if (Array.isArray(data)) {
    return {
      items: data,
      totalCount: data.length,
      page: 1,
      pageSize: data.length || 20,
      totalPages: 1,
    }
  }
  return {
    items: data.items ?? [],
    totalCount: data.totalCount ?? 0,
    page: data.page ?? 1,
    pageSize: data.pageSize ?? 20,
    totalPages: data.totalPages ?? 1,
  }
}
