import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from 'sonner';

import { useLoadingState } from '@/store/loading';

interface UseApiQueryOptions<TData, TError> {
  queryKey: string[];
  queryFn: () => Promise<TData>;
  enabled?: boolean;
  retry?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
  errorMessage?: string;
}

interface UseApiMutationOptions<TData, TVariables> {
  mutationKey: string[];
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: any, variables: TVariables) => void;
  invalidateQueries?: string[][];
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
  errorMessage?: string;
  enableGlobalLoading?: boolean;
}

export function useApiQuery<TData, TError = unknown>({
  queryKey,
  queryFn,
  enabled = true,
  retry = true,
  showErrorToast = true,
  successMessage,
  errorMessage,
}: UseApiQueryOptions<TData, TError>) {
  const { setLoading, setError, clearError } = useLoadingState(queryKey.join('-'));
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      setLoading(true);
      clearError();
      try {
        const result = await queryFn();
        if (successMessage) {
          toast.success(successMessage);
        }
        return result;
      } catch (error: any) {
        setError(error.message || errorMessage || '请求失败');
        if (showErrorToast) {
          toast.error(error.message || errorMessage || '请求失败');
        }
        throw error;
      } finally {
        setLoading(false);
      }
    },
    enabled,
    retry: retry ? (failureCount, error: any) => {
      // Don't retry on 404 or 401 errors
      if (error?.status === 404 || error?.status === 401) return false;
      return failureCount < 3;
    } : false,
  });

  const refetchWithLoading = useCallback(async () => {
    setLoading(true);
    clearError();
    try {
      const result = await query.refetch();
      if (result.isSuccess && successMessage) {
        toast.success(successMessage);
      }
      return result;
    } catch (error: any) {
      setError(error.message || errorMessage || '请求失败');
      if (showErrorToast) {
        toast.error(error.message || errorMessage || '请求失败');
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, [query, setLoading, setError, clearError, successMessage, errorMessage, showErrorToast]);

  return {
    ...query,
    refetchWithLoading,
  };
}

export function useApiMutation<TData, TVariables = unknown>({
  mutationKey,
  mutationFn,
  onSuccess,
  onError,
  invalidateQueries = [],
  showSuccessToast = true,
  showErrorToast = true,
  successMessage,
  errorMessage,
  enableGlobalLoading = false,
}: UseApiMutationOptions<TData, TVariables>) {
  const { setLoading, setError, clearError } = useLoadingState(mutationKey.join('-'));
  const { setGlobalLoading } = useLoadingState('global');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationKey,
    mutationFn: async (variables: TVariables) => {
      if (enableGlobalLoading) {
        setGlobalLoading(true);
      }
      setLoading(true);
      clearError();
      try {
        const result = await mutationFn(variables);
        if (showSuccessToast) {
          toast.success(successMessage || '操作成功');
        }
        return result;
      } catch (error: any) {
        setError(error.message || errorMessage || '操作失败');
        if (showErrorToast) {
          toast.error(error.message || errorMessage || '操作失败');
        }
        throw error;
      } finally {
        setLoading(false);
        if (enableGlobalLoading) {
          setGlobalLoading(false);
        }
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate specified queries
      invalidateQueries.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey });
      });
      
      // Call custom success handler
      onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      // Call custom error handler
      onError?.(error, variables);
    },
  });

  return mutation;
}

// Hook for managing form submissions with loading states
export function useFormSubmission<TData, TVariables>({
  mutationFn,
  onSuccess,
  onError,
  invalidateQueries = [],
  showSuccessToast = true,
  showErrorToast = true,
  successMessage,
  errorMessage,
}: Omit<UseApiMutationOptions<TData, TVariables>, 'mutationKey'>) {
  const mutation = useApiMutation({
    mutationKey: ['form-submission'],
    mutationFn,
    onSuccess,
    onError,
    invalidateQueries,
    showSuccessToast,
    showErrorToast,
    successMessage,
    errorMessage,
    enableGlobalLoading: false,
  });

  const handleSubmit = useCallback(async (variables: TVariables) => {
    try {
      const result = await mutation.mutateAsync(variables);
      return result;
    } catch (error) {
      throw error;
    }
  }, [mutation]);

  return {
    ...mutation,
    handleSubmit,
    isSubmitting: mutation.isPending,
    submitError: mutation.error,
  };
}