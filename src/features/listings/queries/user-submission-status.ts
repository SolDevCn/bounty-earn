import { queryOptions } from '@tanstack/react-query';
import axios from 'axios';

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
    queryKey: ['user-submission', listingId, userId], // Fixed: align with cache invalidation logic
    queryFn: () => checkUserSubmission(listingId),
    enabled: !!userId,
    staleTime: 5 * 1000, // 5 seconds for submission status
  });
