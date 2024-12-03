/**
 * 错误页面区域组件
 * 用于显示一个占据大部分视口高度的错误状态区域
 * 包含警告图标、错误标题和错误信息
 */

import { Flex, Text } from '@chakra-ui/react';
import { AiOutlineWarning } from 'react-icons/ai';

/**
 * ErrorSection组件
 * @param {object} props - 组件属性
 * @param {string} [props.title] - 错误标题，默认为"发生错误"
 * @param {string} [props.message] - 错误信息，默认为"发生错误，请重试"
 * 
 * 功能：
 * 1. 创建一个最小高度为92vh的全宽容器
 * 2. 在容器中垂直居中显示错误信息
 * 3. 显示大尺寸警告图标（96px）
 * 4. 显示可自定义的错误标题和信息
 */
export function ErrorSection({
  title,
  message,
}: {
  title?: string;
  message?: string;
}) {
  return (
    <Flex align={'center'} justify="center" w="full" minH={'92vh'}>
      <Flex align={'center'} justify="center" direction={'column'}>
        <AiOutlineWarning fontSize={96} color="brand.slate.500" />
        <Text mt={2} color="brand.slate.500" fontSize="lg" fontWeight={700}>
          {title || '发生错误'}
        </Text>
        <Text mt={2} color="brand.slate.500">
          {message || '发生错误，请重试'}
        </Text>
      </Flex>
    </Flex>
  );
}
