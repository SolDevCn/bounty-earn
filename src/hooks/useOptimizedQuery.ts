import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useLoadingState } from '@/store/loading';

interface UseOptimizedQueryOptions {
  queryKey: string[];
  queryFn: () => Promise<any>;
  enabled?: boolean;
  staleTime?: number;
  retryOnMount?: boolean;
  showErrorToast?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

export function useOptimizedQuery({
  queryKey,
  queryFn,
  enabled = true,
  staleTime,
  retryOnMount = true,
  showErrorToast = true,
  onSuccess,
  onError,
}: UseOptimizedQueryOptions) {
  const { loading, error, setLoading, setError, clearError } = useLoadingState(queryKey.join('-'));
  const [hasLoaded, setHasLoaded] = useState(false);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      setLoading(true);
      clearError();
      try {
        const result = await queryFn();
        setHasLoaded(true);
        onSuccess?.(result);
        return result;
      } catch (err: any) {
        setError(err.message || '请求失败');
        onError?.(err);
        if (showErrorToast) {
          console.error('Query error:', err);
        }
        throw err;
      } finally {
        setLoading(false);
      }
    },
    enabled,
    staleTime,
    retryOnMount,
    retry: (failureCount, error: any) => {
      // Don't retry on 404 or 401 errors
      if (error?.status === 404 || error?.status === 401) return false;
      return failureCount < 2;
    },
  });

  // Auto-retry on error after 5 seconds
  useEffect(() => {
    if (error && !query.isFetching && enabled) {
      const timer = setTimeout(() => {
        query.refetch();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, query.isFetching, enabled, query]);

  return {
    ...query,
    loading,
    error,
    hasLoaded,
    retry: () => query.refetch(),
  };
}

// Hook for managing dependent queries
export function useDependentQueries(
  queries: Array<{
    key: string;
    fn: () => Promise<any>;
    enabled?: boolean;
  }>,
) {
  const results = queries.map(({ key, fn, enabled = true }) => {
    return useOptimizedQuery({
      queryKey: [key],
      queryFn: fn,
      enabled,
    });
  });

  const isLoading = results.some(r => r.loading);
  const isError = results.some(r => r.isError);
  const errors = results.map(r => r.error).filter(Boolean);
  const data = results.map(r => r.data);

  return {
    data,
    isLoading,
    isError,
    errors,
    results,
    retry: () => results.forEach(r => r.retry()),
  };
}