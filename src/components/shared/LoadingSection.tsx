/**
 * 加载区域组件
 * 用于显示一个占据大部分视口高度的加载状态区域
 * 包含加载动画和加载提示文本
 */

import { Flex, Text } from '@chakra-ui/react';

import { Loading } from './Loading';

/**
 * LoadingSection组件
 * 功能：
 * 1. 创建一个最小高度为92vh的全宽容器
 * 2. 在容器中垂直居中显示Loading组件
 * 3. 在Loading组件下方显示加载提示文本
 */
export function LoadingSection() {
  return (
    <Flex align={'center'} justify="center" w="full" minH={'92vh'}>
      <Flex align={'center'} justify="center" direction={'column'}>
        <Loading />
        <Text mt={2} color="brand.slate.300">
          ...
        </Text>
      </Flex>
    </Flex>
  );
}
