import { Image, Text, VStack } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import React, { useEffect, useRef } from 'react';

import { FeedPageLayout } from '@/layouts/Feed';

import { fetchFeedPostQuery } from '../queries';
import { type FeedPostType } from '../types';
import { FeedCardContainerSkeleton } from './FeedCardContainer';
import { GrantCard } from './grantCard';
import { PowCard } from './powCard';
import { SubmissionCard } from './submissionCard';

interface Props {
  type?: FeedPostType; // ✅ 可选，支持宽容渲染
  id?: string; // ✅ 可选，支持宽容渲染
}

export const FeedPost: React.FC<Props> = ({ type, id }) => {
  const router = useRouter();
  const redirectedRef = useRef(false);

  // ✅ 客户端兜底：参数缺失/非法时跳回 /feed
  useEffect(() => {
    if (!router.isReady) return; // 等待路由准备好
    if (redirectedRef.current) return;

    if (!type || !id) {
      redirectedRef.current = true;
      router.replace('/feed');
    }
  }, [router.isReady, type, id, router]);

  // 若参数未就绪或不合法，先不渲染内容（等待 redirect）
  if (!router.isReady || !type || !id) {
    return null;
  }

  const { data, isLoading } = useQuery(fetchFeedPostQuery({ type, id }), {
    // ✅ 只有参数齐全时才发请求
    enabled: Boolean(type && id),
  });

  if (!data && !isLoading) {
    return (
      <FeedPageLayout>
        <VStack align="center" justify="start" gap={4} minH="100vh" mt={20}>
          <Image alt="404 page" src="/assets/bg/404.svg" />
          <Text color="black" fontSize="xl" fontWeight={500}>
            未找到内容
          </Text>
          <Text
            maxW="2xl"
            color="gray.500"
            fontSize={['md', 'md', 'lg', 'lg']}
            fontWeight={400}
            textAlign="center"
          >
            请检查您的拼写或者看看这只可爱的猫咪吧。
          </Text>
          <Image
            w={['20rem', '20rem', '30rem', '30rem']}
            alt="cat image"
            src="/assets/bg/cat.svg"
          />
        </VStack>
      </FeedPageLayout>
    );
  }

  return (
    <FeedPageLayout>
      {isLoading || !data ? (
        <FeedCardContainerSkeleton />
      ) : (
        <>
          {data.map((item, index) => {
            switch (item.type) {
              case 'submission':
                return (
                  <SubmissionCard
                    key={index}
                    sub={item as any}
                    type="activity"
                  />
                );
              case 'pow':
                return (
                  <PowCard key={index} pow={item as any} type="activity" />
                );
              case 'grant-application':
                return (
                  <GrantCard type="activity" grant={item as any} key={index} />
                );
              default:
                return null;
            }
          })}
        </>
      )}
    </FeedPageLayout>
  );
};
