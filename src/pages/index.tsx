import { Box } from '@chakra-ui/react';
import type { Regions } from '@prisma/client';
import { useQuery } from '@tanstack/react-query';
import type { GetServerSideProps } from 'next';
import dynamic from 'next/dynamic';
import { getServerSession } from 'next-auth';
import { useEffect, useState } from 'react';

// Remove region-related imports for Chinese platform - complete globalization
// import { CombinedRegions } from '@/constants/Superteam';
import { homepageListingsQuery } from '@/features/home';
import {
  // getCombinedRegion,
  type Listing,
  ListingTabs,
} from '@/features/listings';
import { Home } from '@/layouts/Home';

import { authOptions } from './api/auth/[...nextauth]';
import { getListings } from './api/homepage/listings';

interface Props {
  listings: Listing[];
  isAuth: boolean;
  userGrantsRegion: Regions[] | null;
}

const InstallPWAModal = dynamic(
  () =>
    import('@/components/modals/InstallPWAModal').then(
      (mod) => mod.InstallPWAModal,
    ),
  { ssr: false },
);

export default function HomePage({ listings, isAuth }: Props) {
  const [combinedListings, setCombinedListings] = useState(listings);

  const { data: reviewListings } = useQuery(
    homepageListingsQuery({
      order: 'desc',
      statusFilter: 'review',
      userRegion: null, // No region filtering for Chinese platform
    }),
  );

  const { data: completeListings } = useQuery(
    homepageListingsQuery({
      order: 'desc',
      statusFilter: 'completed',
      userRegion: null, // No region filtering for Chinese platform
    }),
  );

  useEffect(() => {
    if (reviewListings && completeListings) {
      setCombinedListings([
        ...listings,
        ...reviewListings,
        ...completeListings,
      ]);
    }
  }, [reviewListings, completeListings, listings]);

  return (
    <Home type="landing" isAuth={isAuth}>
      <InstallPWAModal />
      <Box w={'100%'}>
        <ListingTabs
          bounties={combinedListings}
          isListingsLoading={false}
          emoji=""
          title="赏金任务"
          viewAllLink="/all"
          take={20}
          showViewAll
        />
      </Box>
    </Home>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (
  context,
) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  let userGrantsRegion: Regions[] | null | undefined = null;
  let isAuth = false;

  if (session && session.user.id) {
    isAuth = true;
    // Remove region detection for Chinese platform - complete globalization
    // const matchedRegion = getCombinedRegion(session.user.location);
    // if (matchedRegion) {
    //   userRegion = [matchedRegion.name, Regions.GLOBAL];
    // } else {
    //   userRegion = [Regions.GLOBAL];
    // }
    // const matchedGrantsRegion = CombinedRegions.find((region) =>
    //   region.country.includes(session.user.location!),
    // );
    // if (matchedGrantsRegion?.region) {
    //   userGrantsRegion = [matchedGrantsRegion.region, Regions.GLOBAL];
    // } else {
    //   userGrantsRegion = [Regions.GLOBAL];
    // }

    // For Chinese platform, everything is global - no region filtering needed
    userGrantsRegion = null;
  }

  const tab = (context.query.tab as string) || 'open';

  const openListings = await getListings({
    statusFilter: 'open',
    order: 'desc',
    userRegion: null, // No region filtering for Chinese platform
    tab,
  });

  return {
    props: {
      listings: JSON.parse(JSON.stringify(openListings)),
      isAuth,
      userGrantsRegion,
    },
  };
};
