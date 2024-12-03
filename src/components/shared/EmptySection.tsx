/**
 * 空状态区域组件
 * 用于显示数据为空或无内容时的提示信息
 * 包含信息图标、标题和可选的副标题消息
 */

import { Flex, Text } from '@chakra-ui/react';
import { AiOutlineInfoCircle } from 'react-icons/ai';

/**
 * EmptySection组件
 * @param {object} props - 组件属性
 * @param {string} [props.title] - 空状态标题，默认为"没有发现"
 * @param {string} [props.message] - 空状态提示信息，默认为"发错误，请重试!"
 * @param {boolean} [props.showNotifSub=true] - 是否显示提示信息，默认为true
 * 
 * 功能：
 * 1. 显示信息图标（52px）
 * 2. 显示可自定义的空状态标题
 * 3. 可选显示提示信息
 * 4. 使用较浅的颜色以表示非活动状态
 */
export function EmptySection({
  title,
  message,
  showNotifSub = true,
}: {
  title?: string;
  message?: string;
  showNotifSub?: boolean;
}) {
  return (
    <Flex align={'center'} justify="center" w="full">
      <Flex align={'center'} justify="center" direction={'column'}>
        <AiOutlineInfoCircle fontSize={52} color="#94a3b8" />
        <Text mt={2} color="brand.slate.400" fontSize="lg" fontWeight={700}>
          {title || '没有发现'}
        </Text>
        {showNotifSub && (
          <Text mt={2} color="brand.slate.300">
            {message || '发错误，请重试!'}
          </Text>
        )}
      </Flex>
    </Flex>
  );
}
