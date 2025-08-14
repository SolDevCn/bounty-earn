import { queryOptions } from '@tanstack/react-query';
import axios from 'axios';
import { QUERY_KEYS } from '@/lib/cache';

const checkUserSubmission = async (listingId: string) => {
  const { data } = await axios.get('/api/submission/check/', {
    params: { listingId },
  });
  return data;
};

export const userSubmissionQuery = (
  listingId: string,
  userId: string | undefined,
) =>
  queryOptions({
    queryKey: QUERY_KEYS.USER_SUBMISSION(listingId, userId || ''),
    queryFn: () => checkUserSubmission(listingId),
    enabled: !!userId && !!listingId,
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 404 or 401 errors
      if (error?.status === 404 || error?.status === 401) return false;
      return failureCount < 2;
    },
  });
