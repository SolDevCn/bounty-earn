/**
 * 分享图标组件
 * 使用react-icons的IoIosShareAlt图标
 * 在移动端和桌面端有不同的左边距设置
 */

import { Icon } from '@chakra-ui/react';
import React from 'react';
import { IoIosShareAlt } from 'react-icons/io';

/**
 * ShareIcon组件
 * 功能：
 * 1. 渲染一个分享图标
 * 2. 移动端(base)时左边距为0
 * 3. 桌面端(md)时左边距为-3
 */
export function ShareIcon() {
  return <Icon as={IoIosShareAlt} ml={{ base: 0, md: -3 }} />;
}
