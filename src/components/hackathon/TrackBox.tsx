// 导入必要的UI组件和类型
import { Box, Flex, Image, Text } from '@chakra-ui/react';
import NextLink from 'next/link';

import { tokenList } from '@/constants';
import { type TrackProps } from '@/interface/hackathon';

// 黑客马拉松赛道展示组件
export const TrackBox = ({
  title,                    // 赛道标题
  sponsor,                  // 赞助商信息
  token,                    // 奖励代币类型
  rewardAmount,            // 奖励金额
  slug,                    // 赛道URL标识
}: TrackProps) => {
  return (
    // 可点击的赛道卡片，链接到详情页
    <Box
      as={NextLink}
      p={{ base: 3, md: 4 }}
      borderWidth={'1px'}
      borderColor="brand.slate.200"
      borderRadius={8}
      href={`/listings/hackathon/${slug}`}
    >
      {/* 赛道基本信息区域 */}
      <Flex align="center" gap={3}>
        {/* 赞助商Logo */}
        <Image
          w={{ base: 12, md: 14 }}
          h={{ base: 12, md: 14 }}
          borderRadius={3}
          objectFit={'cover'}
          alt={sponsor.name}
          src={sponsor.logo}
        />
        {/* 赛道标题和赞助商名称 */}
        <Flex direction={'column'}>
          <Text
            color={'brand.slate.900'}
            fontSize={{ base: 'sm', md: 'md' }}
            fontWeight={500}
          >
            {title}
          </Text>
          <Text
            color={'brand.slate.500'}
            fontSize={{ base: 'sm', md: 'md' }}
            fontWeight={400}
          >
            {sponsor.name}
          </Text>
        </Flex>
      </Flex>
      {/* 奖励信息区域 */}
      <Flex align="center" justify={'end'} gap={1}>
        {/* 代币图标 */}
        <Image
          w={{ base: 4, md: 6 }}
          h={{ base: 4, md: 6 }}
          alt={token}
          rounded={'full'}
          src={tokenList.find((t) => t.tokenSymbol === token)?.icon || ''}
        />
        {/* 奖励金额 */}
        <Text
          color={'brand.slate.700'}
          fontSize={{ base: 'sm', md: 'md' }}
          fontWeight={600}
        >
          {rewardAmount?.toLocaleString()}
        </Text>
        {/* 代币符号 */}
        <Text
          color={'brand.slate.400'}
          fontSize={{ base: 'sm', md: 'md' }}
          fontWeight={600}
        >
          {token}
        </Text>
      </Flex>
    </Box>
  );
};
