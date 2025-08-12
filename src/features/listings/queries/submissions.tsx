import axios from 'axios';
import { queryOptions } from '@tanstack/react-query';

import { QUERY_KEYS, QUERY_OPTIONS } from '@/lib/cache';
import { type SubmissionWithUser } from '@/interface/submission';

import { type Listing } from '../types';

interface ListingSubmissionParams {
  slug: string;
  isWinner?: boolean;
}

const fetchListingSubmissions = async (
  params: ListingSubmissionParams,
): Promise<{
  bounty: Listing;
  submission: SubmissionWithUser[];
}> => {
  const slug = params.slug;
  delete (params as any).slug;
  const { data } = await axios.get(`/api/listings/submissions/${slug}/`, {
    params,
  });
  return data;
};

export const listingSubmissionsQuery = (params: ListingSubmissionParams) =>
  queryOptions({
    queryKey: QUERY_KEYS.LISTING_SUBMISSIONS(params),
    queryFn: () => fetchListingSubmissions(params),
    ...QUERY_OPTIONS.FAST,
  });
