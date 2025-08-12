# Cache Management Guidelines

## Overview

This document outlines the cache management strategy and best practices for the Solar Earn application. We use React Query for server state management with a standardized approach to caching.

## Cache Configuration

All cache configurations are defined in `src/lib/cache.ts`.

### Cache Time Constants

- **REALTIME (1s)**: Data that needs immediate updates (e.g., submission status)
- **FAST (2s)**: Frequently changing data (e.g., sponsor dashboard)
- **NORMAL (5s)**: Standard data with moderate update frequency
- **SLOW (30s)**: Data that changes infrequently
- **STATIC (30min)**: Rarely changing data (e.g., static content)

### Query Key Patterns

Consistent query keys are crucial for effective cache management:

```typescript
// User-related
QUERY_KEYS.USER_SUBMISSION(listingId, userId)

// Listings
QUERY_KEYS.LISTING_SUBMISSIONS({ slug, isWinner? })
QUERY_KEYS.SUBMISSION_COUNT(slug)

// Sponsor Dashboard
QUERY_KEYS.SPONSOR_SUBMISSIONS(slug, isHackathon?)
```

## Best Practices

### 1. Choose the Right Cache Strategy

#### Real-time Data (Sponsor Dashboard, Submissions)
```typescript
export const submissionsQuery = (slug: string, isHackathon?: boolean) =>
  queryOptions({
    queryKey: QUERY_KEYS.SPONSOR_SUBMISSIONS(slug, isHackathon),
    queryFn: () => fetchSubmissions(slug, isHackathon),
    ...QUERY_OPTIONS.FAST, // 2s stale time, 10s refetch interval
  });
```

#### Standard Data (Listings, User Profiles)
```typescript
export const listingQuery = (slug: string) =>
  queryOptions({
    queryKey: QUERY_KEYS.LISTING(slug),
    queryFn: () => fetchListing(slug),
    ...QUERY_OPTIONS.NORMAL, // 5s stale time
  });
```

#### Static Data (Configuration, Settings)
```typescript
export const settingsQuery = () =>
  queryOptions({
    queryKey: ['settings'],
    queryFn: () => fetchSettings(),
    ...QUERY_OPTIONS.STATIC, // 30min stale time
  });
```

### 2. Cache Invalidation

Use the provided cache invalidation helpers:

```typescript
// After mutation success
onSuccess: () => {
  // Invalidate all listing-related queries
  CACHE_INVALIDATION.LISTING(queryClient, slug);
  
  // Or invalidate specific queries
  queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.SUBMISSION_COUNT(slug),
  });
}
```

### 3. Optimistic Updates

For better user experience, implement optimistic updates:

```typescript
onMutate: async (newData) => {
  // Cancel any outgoing refetches
  await queryClient.cancelQueries({ queryKey: QUERY_KEYS.SUBMISSIONS(slug) });
  
  // Snapshot the previous value
  const previousData = queryClient.getQueryData(QUERY_KEYS.SUBMISSIONS(slug));
  
  // Optimistically update to the new value
  queryClient.setQueryData(QUERY_KEYS.SUBMISSIONS(slug), old => ({
    ...old,
    submissions: [...old.submissions, newData],
  }));
  
  return { previousData };
},
onError: (err, newData, context) => {
  // Rollback on error
  queryClient.setQueryData(QUERY_KEYS.SUBMISSIONS(slug), context.previousData);
},
```

### 4. Background Refetching

For critical data that needs to stay up-to-date:

```typescript
export const realtimeQuery = () =>
  queryOptions({
    queryKey: ['realtime-data'],
    queryFn: () => fetchRealtimeData(),
    ...QUERY_OPTIONS.REALTIME, // 1s stale time, 5s refetch interval
    refetchIntervalInBackground: true, // Continue when tab is inactive
  });
```

## Cache Invalidation Strategies

### After User Actions

1. **Submission Created/Updated**
   ```typescript
   CACHE_INVALIDATION.LISTING(queryClient, slug);
   ```

2. **Winner Status Changed**
   ```typescript
   CACHE_INVALIDATION.SPONSOR_DASHBOARD(queryClient, slug);
   ```

3. **User Profile Updated**
   ```typescript
   CACHE_INVALIDATION.USER(queryClient, userId);
   ```

### Automatic Invalidation

React Query automatically handles:
- Window focus refetching
- Reconnection refetching
- Stale data refetching

## Performance Considerations

1. **Memory Usage**: Set appropriate `gcTime` to prevent memory leaks
2. **Network Requests**: Use `staleTime` to reduce unnecessary requests
3. **Background Updates**: Use sparingly to avoid excessive battery usage
4. **Cache Size**: Monitor cache size and implement pagination for large datasets

## Debugging

### React Query Devtools

Enable devtools in development:

```typescript
// _app.tsx
<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

### Cache Inspection

```typescript
// Get all cached data
const cache = queryClient.getQueryCache().getAll();

// Inspect specific query
const query = queryClient.getQueryCache().find(QUERY_KEYS.LISTING(slug));
console.log('Query state:', query?.state);
```

## Migration Guide

### From Local State to React Query

Before:
```typescript
const [submissions, setSubmissions] = useState<Submission[]>([]);
const [isLoading, setIsLoading] = useState(false);

const fetchData = async () => {
  setIsLoading(true);
  const data = await fetchSubmissions(slug);
  setSubmissions(data);
  setIsLoading(false);
};
```

After:
```typescript
const { data: submissions, isLoading } = useQuery({
  ...listingSubmissionsQuery({ slug }),
});
```

### From Manual Cache Updates to Optimistic Updates

Before:
```typescript
// Manual update
const newSubmissions = [...submissions, newSubmission];
setSubmissions(newSubmissions);
```

After:
```typescript
// Automatic with React Query
queryClient.setQueryData(QUERY_KEYS.LISTING_SUBMISSIONS({ slug }), old => ({
  ...old,
  submissions: [...old.submissions, newSubmission],
}));
```

## Common Pitfalls

1. **Inconsistent Query Keys**: Always use the `QUERY_KEYS` helpers
2. **Missing Error Handling**: Always handle loading and error states
3. **Over-fetching**: Use appropriate `staleTime` values
4. **Memory Leaks**: Clean up subscriptions and set proper `gcTime`
5. **Race Conditions**: Use `cancelQueries` in `onMutate`

## Testing

### Testing Queries

```typescript
// Mock successful response
const mockedSubmissions = [...];
useQuery.mockReturnValue({
  data: mockedSubmissions,
  isLoading: false,
  error: null,
});

// Test loading state
useQuery.mockReturnValue({
  data: undefined,
  isLoading: true,
  error: null,
});

// Test error state
useQuery.mockReturnValue({
  data: undefined,
  isLoading: false,
  error: new Error('Failed to fetch'),
});
```

### Testing Mutations

```typescript
const mockedMutation = useMutation.mockReturnValue({
  mutate: jest.fn(),
  isLoading: false,
  isSuccess: true,
  isError: false,
});

// Test mutation triggers
fireEvent.click(submitButton);
expect(mockedMutation.mutate).toHaveBeenCalledWith(expectedData);
```

## Future Enhancements

1. **Offline Support**: Implement offline persistence with `persistQueryClient`
2. **Cache Analytics**: Add performance monitoring for cache hit/miss ratios
3. **Smart Refetching**: Implement adaptive refetching based on user activity
4. **Cache Partitioning**: Separate cache for different user roles