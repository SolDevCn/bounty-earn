import { queryOptions } from '@tanstack/react-query';
import axios from 'axios';

import { QUERY_KEYS, QUERY_OPTIONS } from '@/lib/cache';

const fetchSubmissionCount = async (slug: string): Promise<number> => {
  const { data } = await axios.get(`/api/listings/${slug}/submission-count/`);
  return data;
};

export const submissionCountQuery = (slug: string) =>
  queryOptions({
    queryKey: QUERY_KEYS.SUBMISSION_COUNT(slug),
    queryFn: () => fetchSubmissionCount(slug),
    enabled: !!slug,
    ...QUERY_OPTIONS.FAST,
  });
