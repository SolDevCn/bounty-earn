// 导入必要的组件和类型
import { Box, Flex } from '@chakra-ui/react';
import { Regions } from '@prisma/client';
import { useQuery } from '@tanstack/react-query';
import type { GetServerSideProps } from 'next';
import dynamic from 'next/dynamic';
import { getServerSession } from 'next-auth';
import { useEffect, useState } from 'react';

import { CombinedRegions } from '@/constants/Superteam';
import {
  homepageForYouListingsQuery,
  homepageGrantsQuery,
  homepageListingsQuery,
} from '@/features/home';
import {
  getCombinedRegion,
  type Listing,
  ListingSection,
  ListingTabs,
} from '@/features/listings';
import { Home } from '@/layouts/Home';

import { authOptions } from './api/auth/[...nextauth]';
import { getForYouListings } from './api/homepage/for-you';
import { getListings } from './api/homepage/listings';

// 定义页面组件的Props接口
interface Props {
  listings: Listing[];           // 所有列表项
  openForYouListings: Listing[]; // 为用户推荐的开放列表项
  isAuth: boolean;              // 用户是否已认证
  userRegion: string[] | null;  // 用户所在地区
  userGrantsRegion: Regions[] | null; // 用户的资助地区
}

// 动态导入PWA安装模态框组件
const InstallPWAModal = dynamic(
  () =>
    import('@/components/modals/InstallPWAModal').then(
      (mod) => mod.InstallPWAModal,
    ),
  { ssr: false },
);

// 动态导入资助卡片组件
const GrantsCard = dynamic(
  () => import('@/features/grants').then((mod) => mod.GrantsCard),
  { ssr: false },
);

// 动态导入空状态组件
const EmptySection = dynamic(
  () =>
    import('@/components/shared/EmptySection').then((mod) => mod.EmptySection),
  { ssr: false },
);

// 主页组件
export default function HomePage({
  listings,
  isAuth,
  userRegion,
  openForYouListings,
  userGrantsRegion,
}: Props) {
  // 状态管理：合并后的列表项
  const [combinedListings, setCombinedListings] = useState(listings);
  // 状态管理：合并后的推荐列表项
  const [combinedForYouListings, setCombinedForYouListings] =
    useState(listings);

  // 获取审核中的推荐列表项
  const { data: reviewForYouListings } = useQuery({
    ...homepageForYouListingsQuery({
      statusFilter: 'review',
      order: 'desc',
    }),
    enabled: isAuth,
  });

  // 获取已完成的推荐列表项
  const { data: completeForYouListings } = useQuery({
    ...homepageForYouListingsQuery({
      statusFilter: 'completed',
      order: 'desc',
    }),
    enabled: isAuth,
  });

  // 获取审核中的普通列表项
  const { data: reviewListings } = useQuery(
    homepageListingsQuery({
      order: 'desc',
      statusFilter: 'review',
      userRegion,
      excludeIds: reviewForYouListings?.map((l) => l.id!),
    }),
  );

  // 获取已完成的普通列表项
  const { data: completeListings } = useQuery(
    homepageListingsQuery({
      order: 'desc',
      statusFilter: 'completed',
      userRegion,
      excludeIds: completeForYouListings?.map((l) => l.id!),
    }),
  );

  // 获取资助项目数据
  const { data: grants } = useQuery(
    homepageGrantsQuery({
      userRegion: userGrantsRegion,
    }),
  );

  // 当审核和完成的列表项数据更新时，合并列表
  useEffect(() => {
    if (reviewListings && completeListings) {
      setCombinedListings([
        ...listings,
        ...reviewListings,
        ...completeListings,
      ]);
    }
  }, [reviewListings, completeListings, listings]);

  // 当推荐列表项数据更新时，合并推荐列表
  useEffect(() => {
    if (reviewForYouListings && completeForYouListings) {
      setCombinedForYouListings([
        ...openForYouListings,
        ...reviewForYouListings,
        ...completeForYouListings,
      ]);
    }
  }, [reviewForYouListings, completeForYouListings, openForYouListings]);

  return (
    <Home type="landing" isAuth={isAuth}>
      {/* PWA安装提示模态框 */}
      <InstallPWAModal />
      <Box w={'100%'}>
        {/* 列表标签页组件 */}
        <ListingTabs
          bounties={combinedListings}
          forYou={combinedForYouListings}
          isListingsLoading={false}
          emoji="/assets/home/emojis/moneyman.webp"
          title="自由职业机会"
          viewAllLink="/all"
          take={20}
          showViewAll
        />
        {/* 资助项目部分（已注释掉） */}
        {/* <ListingSection
          type="grants"
          title="资助"
          sub="为建设者提供资金支持"
          emoji="/assets/home/emojis/grants.webp"
          showViewAll
        >
          {!grants?.length && (
            <Flex align="center" justify="center" mt={8}>
              <EmptySection
                title="暂无资助可申请！"
                message="订阅通知以便接收关于新资助项目的通知。"
              />
            </Flex>
          )}
          {grants &&
            grants?.map((grant) => {
              return <GrantsCard grant={grant} key={grant.id} />;
            })}
        </ListingSection> */}
      </Box>
    </Home>
  );
}

// 服务器端数据获取函数
export const getServerSideProps: GetServerSideProps<Props> = async (
  context,
) => {
  // 获取用户会话信息
  const session = await getServerSession(context.req, context.res, authOptions);
  let userRegion: string[] | null | undefined = null;
  let userGrantsRegion: Regions[] | null | undefined = null;
  let isAuth = false;

  // 如果用户已登录，设置用户地区信息
  if (session && session.user.id) {
    isAuth = true;
    const matchedRegion = getCombinedRegion(session.user.location);
    if (matchedRegion) {
      userRegion = [matchedRegion.name, Regions.GLOBAL];
    } else {
      userRegion = [Regions.GLOBAL];
    }
    const matchedGrantsRegion = CombinedRegions.find((region) =>
      region.country.includes(session.user.location!),
    );
    if (matchedGrantsRegion?.region) {
      userGrantsRegion = [matchedGrantsRegion.region, Regions.GLOBAL];
    } else {
      userGrantsRegion = [Regions.GLOBAL];
    }
  }

  // 获取为用户推荐的开放列表项
  let openForYouListings: Awaited<ReturnType<typeof getForYouListings>> = [];
  if (session && session.user.id) {
    openForYouListings = await getForYouListings({
      statusFilter: 'open',
      order: 'desc',
      userId: session.user.id,
    });
  }

  // 获取所有开放的列表项
  const openListings = await getListings({
    statusFilter: 'open',
    order: 'desc',
    userRegion,
    excludeIds: openForYouListings.map((listing) => listing.id),
  });

  return {
    props: {
      listings: JSON.parse(JSON.stringify(openListings)),
      openForYouListings: JSON.parse(JSON.stringify(openForYouListings)),
      isAuth,
      userRegion,
      userGrantsRegion,
    },
  };
};
