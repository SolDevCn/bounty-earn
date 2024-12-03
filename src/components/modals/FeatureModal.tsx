/**
 * 功能介绍模态框组件
 * 用于向已验证的项目方介绍Scout功能
 */

import { ArrowForwardIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  Link,
  Modal,
  ModalContent,
  ModalOverlay,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import NextImage from 'next/image';
import NextLink from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

import { latestActiveSlugQuery } from '@/features/sponsor-dashboard';
import { useUpdateUser, useUser } from '@/store/user';

/**
 * FeatureModal组件
 * @param {object} props - 组件属性
 * @param {boolean} [props.isSponsorsRoute] - 是否在项目方路由下
 * @param {boolean} [props.forceOpen] - 是否强制显示模态框
 * 
 * 功能：
 * 1. 向已验证的项目方介绍Scout功能
 * 2. 控制模态框的显示时机
 * 3. 提供功能预览和快速访问链接
 */
export const FeatureModal = ({
  isSponsorsRoute = false,
  forceOpen = false,
}: {
  isSponsorsRoute?: boolean;
  forceOpen?: boolean;
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const updateUser = useUpdateUser();
  const [isOpen, setIsOpen] = useState(false);

  /**
   * 获取最新活跃的任务slug
   * 用于生成Scout功能的预览链接
   */
  const { data: latestActiveSlug } = useQuery({
    ...latestActiveSlugQuery,
    enabled:
      !!user?.currentSponsorId &&
      user.featureModalShown === false &&
      (isSponsorsRoute || !router.pathname.includes('dashboard')),
  });

  /**
   * 控制模态框显示逻辑
   * 显示条件：
   * 1. 用户是已验证的项目方
   * 2. 之前未显示过该模态框
   * 3. 不在scout参数的页面
   * 4. 在项目方路由下或不在dashboard页面
   * 5. 存在活跃任务
   */
  useEffect(() => {
    const shouldShowModal = async () => {
      if (
        (user?.currentSponsorId &&
          user.featureModalShown === false &&
          (isSponsorsRoute || !router.pathname.includes('dashboard')) &&
          latestActiveSlug &&
          user.currentSponsor?.isVerified) ||
        forceOpen
      ) {
        if (!searchParams.has('scout')) setIsOpen(true);
        if (!forceOpen) {
          await updateUser.mutateAsync({ featureModalShown: true });
        }
      }
    };

    shouldShowModal();
  }, [user, router.pathname, latestActiveSlug, isSponsorsRoute, forceOpen]);

  /**
   * 关闭模态框
   */
  const handleClose = () => {
    setIsOpen(false);
  };

  /**
   * 处理提交操作
   */
  const onSubmit = () => {
    handleClose();
  };

  return (
    <Modal autoFocus={false} isOpen={isOpen} onClose={handleClose} size="sm">
      <ModalOverlay />
      <ModalContent overflow="hidden" rounded="lg">
        {/* Scout功能预览图 */}
        <Box w="full" p={8} bg="#FAF5FF">
          <NextImage
            src="/assets/ScoutAnnouncement.png"
            alt="Scouts Announcement Illustration"
            width={300}
            height={300}
            style={{ width: '92%', height: '100%' }}
          />
        </Box>
        {/* 功能介绍内容 */}
        <VStack align="start" gap={3} p={6}>
          <Text fontSize="lg" fontWeight={600}>
            介绍 Scout 功能
          </Text>
          <Text color="brand.slate.500">
            Solar Earn
            上最优秀人才的精选列表，您可以邀请他们参与您的任务，从而获得高质量的提交！添加新的任务，或查看您当前的任何列表来试用
            Scout。
          </Text>
          {/* 功能访问链接 */}
          <Link
            as={latestActiveSlug ? NextLink : 'div'}
            href={
              latestActiveSlug
                ? `/dashboard/listings/${latestActiveSlug}/submissions?scout`
                : ``
            }
            onClick={onSubmit}
            style={{ width: '100%' }}
          >
            <Button gap={2} w="full" fontSize="sm" fontWeight={500}>
              {latestActiveSlug ? (
                <>
                  Check it out <ArrowForwardIcon />
                </>
              ) : (
                '了解更多！'
              )}
            </Button>
          </Link>
        </VStack>
      </ModalContent>
    </Modal>
  );
};
