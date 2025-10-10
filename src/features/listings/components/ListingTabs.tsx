import { ArrowForwardIcon } from '@chakra-ui/icons';
import { Box, Button, Flex, HStack, Image, Link, Text } from '@chakra-ui/react';
import dynamic from 'next/dynamic';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { usePostHog } from 'posthog-js/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { dayjs } from '@/utils/dayjs';

import { type Listing } from '../types';
import { ListingCard, ListingCardSkeleton } from './ListingCard';

interface TabProps {
  id: string;
  title: string;
  content: JSX.Element;
  posthog: string;
}
interface ListingTabsProps {
  isListingsLoading: boolean;
  bounties: Listing[] | undefined;
  take?: number;
  emoji?: string;
  title: string;
  viewAllLink?: string;
  showViewAll?: boolean;
  showNotifSub?: boolean;
}

interface ContentProps {
  bounties?: Listing[];
  take?: number;
  isListingsLoading: boolean;
  filterFunction: (bounty: Listing) => boolean;
  sortCompareFunction?: ((a: Listing, b: Listing) => number) | undefined;
  emptyTitle: string;
  emptyMessage: string;
  showNotifSub?: boolean;
}

const EmptySection = dynamic(
  () =>
    import('@/components/shared/EmptySection').then((mod) => mod.EmptySection),
  { ssr: false },
);

const generateTabContent = ({
  bounties,
  take,
  isListingsLoading,
  filterFunction,
  sortCompareFunction,
  emptyTitle,
  emptyMessage,
  showNotifSub,
}: ContentProps) => {
  return (
    <Flex className="ph-no-capture" direction={'column'} rowGap={1}>
      {isListingsLoading ? (
        Array.from({ length: 8 }, (_, index) => (
          <ListingCardSkeleton key={index} />
        ))
      ) : !!bounties?.filter(filterFunction).length ? (
        bounties
          .filter(filterFunction)
          .sort(sortCompareFunction ? sortCompareFunction : () => 0)
          .slice(0, take ? take + 1 : undefined)
          .map((bounty) => <ListingCard key={bounty.id} bounty={bounty} />)
      ) : (
        <Flex align="center" justify="center" mt={8}>
          <EmptySection
            showNotifSub={showNotifSub}
            title={emptyTitle}
            message={emptyMessage}
          />
        </Flex>
      )}
    </Flex>
  );
};

export const ListingTabs = ({
  isListingsLoading,
  bounties,
  take,
  emoji,
  title,
  viewAllLink,
  showViewAll = false,
  showNotifSub = true,
}: ListingTabsProps) => {
  const router = useRouter();
  const tabs: TabProps[] = [
    {
      id: 'tab1',
      title: '进行中',
      posthog: 'open_listings',
      content: generateTabContent({
        bounties: bounties,
        take,
        isListingsLoading,
        filterFunction: (bounty) =>
          bounty.status === 'OPEN' &&
          !dayjs().isAfter(bounty.deadline) &&
          !bounty.isWinnersAnnounced,
        emptyTitle: '暂无可用机会！',
        emptyMessage:
          '更新您的电子邮件偏好设置（从用户菜单）以接收新的工作机会通知。',
        showNotifSub,
      }),
    },
    {
      id: 'tab2',
      title: '审核中',
      posthog: 'in review_listing',
      content: generateTabContent({
        bounties: bounties,
        take,
        isListingsLoading,
        filterFunction: (bounty) =>
          !bounty.isWinnersAnnounced &&
          dayjs().isAfter(bounty.deadline) &&
          bounty.status === 'OPEN',
        emptyTitle: '暂无审核中的任务！',
        emptyMessage: '订阅通知以获取更新信息。',
        showNotifSub,
      }),
    },
    {
      id: 'tab3',
      title: '已完成',
      posthog: 'completed_listing',
      content: generateTabContent({
        bounties: bounties,
        take,
        isListingsLoading,
        filterFunction: (bounty) => bounty.isWinnersAnnounced || false,
        sortCompareFunction: (a, b) => {
          const dateA = a.winnersAnnouncedAt
            ? new Date(a.winnersAnnouncedAt)
            : a.deadline
              ? new Date(a.deadline)
              : null;
          const dateB = b.winnersAnnouncedAt
            ? new Date(b.winnersAnnouncedAt)
            : b.deadline
              ? new Date(b.deadline)
              : null;

          if (dateA === null && dateB === null) {
            return 0;
          }
          if (dateB === null) {
            return 1;
          }
          if (dateA === null) {
            return -1;
          }

          return dateB.getTime() - dateA.getTime();
        },
        emptyTitle: '暂无已完成的任务！',
        emptyMessage: '订阅通知以获取信息。',
        showNotifSub,
      }),
    },
  ];

  const posthog = usePostHog();
  const isInitialRender = useRef(true);

  // Tab mapping constants
  const tabMap = useMemo(() => ({
    open: 'tab1',
    review: 'tab2',
    completed: 'tab3',
  }), []);

  const tabParamMap = useMemo(() => ({
    tab1: 'open',
    tab2: 'review',
    tab3: 'completed',
  }), []);

  // Get initial tab from URL or default
  const getInitialTab = useCallback(() => {
    const tabParam = router.query.tab as string;
    return (tabParam && tabMap[tabParam as keyof typeof tabMap]) ? tabMap[tabParam as keyof typeof tabMap] : tabs[0]!.id;
  }, [router.query.tab, tabMap, tabs]);

  const [activeTab, setActiveTab] = useState<string>(() => getInitialTab());

  // Handle URL-driven tab changes (browser navigation, direct URL access)
  useEffect(() => {
    const newTab = getInitialTab();
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
    isInitialRender.current = false;
  }, [router.query.tab, getInitialTab, activeTab]);

  // Handle tab change from user interaction
  const handleTabChange = useCallback((tabId: string, posthogEvent: string) => {
    if (tabId === activeTab) return; // No change needed
    
    // Update PostHog immediately
    posthog.capture(posthogEvent);
    
    // Update state
    setActiveTab(tabId);
    
    // Update URL only if not initial render
    if (!isInitialRender.current) {
      const newTabParam = tabParamMap[tabId as keyof typeof tabParamMap];
      if (router.query.tab !== newTabParam) {
        router.push(
          {
            pathname: router.pathname,
            query: { ...router.query, tab: newTabParam },
          },
          undefined,
          { shallow: true }
        );
      }
    }
  }, [activeTab, posthog, tabParamMap, router]);

  // Generate view all link with current tab parameter
  const getViewAllLinkWithTab = useCallback(() => {
    if (!viewAllLink) return '';
    
    const tabParam = tabParamMap[activeTab as keyof typeof tabParamMap];
    
    // Check if the link already has query parameters
    const hasQuery = viewAllLink.includes('?');
    return `${viewAllLink}${hasQuery ? '&' : '?'}tab=${tabParam}`;
  }, [viewAllLink, tabParamMap, activeTab]);

  // Don't render anything until activeTab is set
  if (!activeTab) {
    return <Box mt={5} mb={10} />;
  }

  return (
    <Box mt={5} mb={10}>
      <HStack
        align="center"
        justify="space-between"
        mb={4}
        pb={3}
        borderBottom="2px solid"
        borderBottomColor="#E2E8F0"
      >
        <Flex
          align={'center'}
          justify={{ base: 'space-between', sm: 'unset' }}
          w="100%"
        >
          <Flex align={'center'}>
            {emoji && (
              <Image
                display={{ base: 'none', xs: 'flex' }}
                w={5}
                h={5}
                mr={2}
                alt="emoji"
                src={emoji}
              />
            )}
            <Text
              pr={2}
              color={'#334155'}
              fontSize={['14', '15', '16', '16']}
              fontWeight={'600'}
              whiteSpace={'nowrap'}
            >
              {title}
            </Text>
          </Flex>
          <Flex align="center">
            <Text
              mx={{ base: 0, sm: 3 }}
              mr={3}
              color={'brand.slate.300'}
              fontSize="xx-small"
            >
              |
            </Text>
            {tabs.map((tab) => (
              <Box
                className="ph-no-capture"
                key={tab.id}
                sx={{
                  ...(tab.id === activeTab && {
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      right: 0,
                      bottom: '-13px',
                      left: 0,
                      height: '2px',
                      backgroundColor: '#6366f1',
                    },
                  }),
                }}
                pos="relative"
                p={{ base: 1, sm: 2 }}
                color={
                  tab.id === activeTab ? 'brand.slate.700' : 'brand.slate.500'
                }
                cursor="pointer"
                onClick={() => handleTabChange(tab.id, tab.posthog)}
              >
                <Text
                  fontSize={['13', '13', '14', '14']}
                  fontWeight={500}
                  whiteSpace={'nowrap'}
                >
                  {tab.title}
                </Text>
              </Box>
            ))}
          </Flex>
        </Flex>
        {showViewAll && (
          <Flex
            className="ph-no-capture"
            display={{ base: 'none', sm: 'flex' }}
          >
            <Link as={NextLink} href={getViewAllLinkWithTab()}>
              <Button
                px={2}
                py={1}
                color="brand.slate.400"
                fontSize={['x-small', 'sm', 'sm', 'sm']}
                onClick={() => posthog.capture('viewall top_listngs')}
                size={{ base: 'x-small', md: 'sm' }}
                variant={'ghost'}
              >
                查看全部
              </Button>
            </Link>
          </Flex>
        )}
      </HStack>

      {tabs.map((tab) => tab.id === activeTab && tab.content)}

      {showViewAll && (
        <Link className="ph-no-capture" as={NextLink} href={viewAllLink}>
          <Button
            w="100%"
            my={8}
            py={5}
            color="brand.slate.400"
            borderColor="brand.slate.300"
            onClick={() => posthog.capture('viewall bottom_listings')}
            rightIcon={<ArrowForwardIcon />}
            size="sm"
            variant="outline"
          >
            查看全部
          </Button>
        </Link>
      )}
    </Box>
  );
};
