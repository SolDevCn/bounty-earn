import { queryOptions } from '@tanstack/react-query';
import axios from 'axios';

import { QUERY_OPTIONS, QUERY_KEYS } from '@/lib/cache';
import { type SubmissionWithUser } from '@/interface/submission';

const fetchSubmissions = async (
  slug: string,
  isHackathon?: boolean,
): Promise<SubmissionWithUser[]> => {
  const { data } = await axios.get(
    `/api/sponsor-dashboard/${slug}/submissions`,
    {
      params: { isHackathon },
    },
  );
  return data;
};

export const submissionsQuery = (slug: string, isHackathon?: boolean) =>
  queryOptions({
    queryKey: QUERY_KEYS.SPONSOR_SUBMISSIONS(slug, isHackathon),
    queryFn: () => fetchSubmissions(slug, isHackathon),
    enabled: !!slug,
    ...QUERY_OPTIONS.FAST,
  });
