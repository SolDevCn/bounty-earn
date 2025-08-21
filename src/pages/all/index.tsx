import { Box } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';

import { listingsQuery, ListingTabs } from '@/features/listings';
import { Home } from '@/layouts/Home';

function AllListingsPage() {
  const { data: listings, isLoading } = useQuery(
    listingsQuery({
      take: 500,
      type: 'bounty',
    }),
  );

  return (
    <Home type="listing">
      <Box w={'100%'}>
        <ListingTabs
          bounties={listings}
          isListingsLoading={isLoading}
          emoji=""
          title="赏金任务"
          viewAllLink="/all"
        />
      </Box>
    </Home>
  );
}

export default AllListingsPage;
