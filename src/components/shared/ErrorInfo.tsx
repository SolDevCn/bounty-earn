/**
 * 错误信息组件
 * 用于显示一个紧凑的错误信息提示
 * 包含小型警告图标、错误标题和错误信息
 */

import { Flex, Text } from '@chakra-ui/react';
import { AiOutlineWarning } from 'react-icons/ai';

/**
 * ErrorInfo组件
 * @param {object} props - 组件属性
 * @param {string} [props.title] - 错误标题，默认为"发生错误"
 * @param {string} [props.message] - 错误信息，默认为"发生错误，请重试"
 * 
 * 功能：
 * 1. 显示小尺寸警告图标（52px）
 * 2. 显示可自定义的错误标题
 * 3. 显示较小字号的错误信息
 * 4. 适用于内联或局部的错误提示场景
 */
export function ErrorInfo({
  title,
  message,
}: {
  title?: string;
  message?: string;
}) {
  return (
    <Flex align={'center'} justify="center" direction="column">
      <AiOutlineWarning fontSize={52} color="brand.slate.500" />
      <Text color="brand.slate.500" fontWeight={700}>
        {title || '发生错误'}
      </Text>
      <Text color="brand.slate.500" fontSize="sm">
        {message || '发生错误，请重试'}
      </Text>
    </Flex>
  );
}
