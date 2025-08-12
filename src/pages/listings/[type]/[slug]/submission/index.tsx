import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { GetServerSideProps } from 'next';
import React from 'react';

import { type Listing, SubmissionList, listingSubmissionsQuery } from '@/features/listings';
import { ListingPageLayout } from '@/layouts/Listing';
import { getURL } from '@/utils/validUrl';

const SubmissionPage = ({
  slug,
  bounty: bountyB,
}: {
  slug: string;
  bounty: Listing;
}) => {
  const { data: submissionsData, refetch } = useQuery({
    ...listingSubmissionsQuery({ slug }),
    initialData: { bounty: bountyB, submission: [] },
  });

  return (
    <ListingPageLayout bounty={submissionsData?.bounty || bountyB}>
      {submissionsData?.bounty && submissionsData.submission && (
        <SubmissionList
          bounty={submissionsData.bounty}
          setUpdate={() => refetch()}
          submissions={submissionsData.submission}
          endTime={submissionsData.bounty.deadline as string}
        />
      )}
    </ListingPageLayout>
  );
};
export const getServerSideProps: GetServerSideProps = async (context) => {
  const { slug, type } = context.query;

  let bountyData;
  try {
    const bountyDetails = await axios.get(
      `${getURL()}api/listings/submissions/${slug}`,
      {
        params: { type },
      },
    );
    bountyData = bountyDetails.data;
  } catch (e) {
    console.log(e);
    bountyData = null;
  }

  return {
    props: {
      slug,
      bounty: bountyData?.bounty || null,
    },
  };
};
export default SubmissionPage;
