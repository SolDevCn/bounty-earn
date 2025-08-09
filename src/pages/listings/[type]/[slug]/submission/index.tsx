import axios from 'axios';
import type { GetServerSideProps } from 'next';
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/router';

import { type Listing, SubmissionList } from '@/features/listings';
import type { SubmissionWithUser } from '@/interface/submission';
import { ListingPageLayout } from '@/layouts/Listing';
import { getURL } from '@/utils/validUrl';

const SubmissionPage = ({
  slug,
  bounty: bountyB,
  submission: submissionB,
}: {
  slug: string;
  bounty: Listing;
  submission: SubmissionWithUser[];
}) => {
  const router = useRouter();
  const [bounty] = useState<Listing>(bountyB);
  const [submission, setSubmission] =
    useState<SubmissionWithUser[]>(submissionB);

  const [isLoading, setIsLoading] = useState(false);

  // Auto-refresh when returning to this page
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      if (url.includes(router.asPath)) {
        resetSubmissions();
      }
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.asPath, resetSubmissions]);

  const resetSubmissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const bountyDetails = await axios.get(
        `/api/listings/submissions/${slug}`,
      );
      setSubmission(bountyDetails.data.submission);
      toast.success('刷新成功');
    } catch (e) {
      console.log(e);
      toast.error('刷新失败，请重试');
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  return (
    <ListingPageLayout bounty={bounty}>
      {bounty && submission && (
        <SubmissionList
          bounty={bounty}
          setUpdate={resetSubmissions}
          submissions={submission}
          endTime={bounty.deadline as string}
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
      bounty: bountyData.bounty,
      submission: bountyData.submission,
    },
  };
};
export default SubmissionPage;
